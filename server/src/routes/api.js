const express = require('express')
const Order = require('../models/Order')
const MenuItem = require('../models/MenuItem')
const Table = require('../models/Table')
const { dbReady } = require('../db')
const { items: seedItems } = require('../data')
const { getBootstrapPayload, getTables } = require('../services/menuService')

const router = express.Router()

function buildOrderId() {
  return `GH-${Date.now().toString().slice(-6)}`
}

function findSeedItem(itemSlug) {
  return seedItems.find((entry) => entry.id === itemSlug)
}

async function resolveMenuItem(itemSlug) {
  if (dbReady()) {
    const doc = await MenuItem.findOne({ slug: itemSlug, active: true }).lean()
    if (doc) {
      return {
        slug: doc.slug,
        name: doc.name,
        price: doc.price,
        customizations: doc.customizations ?? [],
      }
    }
  }

  const seed = findSeedItem(itemSlug)
  if (!seed) return null

  return {
    slug: seed.id,
    name: seed.name,
    price: seed.price,
    customizations: seed.customizations ?? [],
  }
}

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: dbReady() ? 'connected' : 'fallback',
  })
})

router.get('/bootstrap', async (req, res) => {
  try {
    const tableNumber = req.query.table ? Number(req.query.table) : null
    const payload = await getBootstrapPayload(Number.isFinite(tableNumber) ? tableNumber : null)
    res.json(payload)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load menu data.' })
  }
})

router.get('/tables', async (_req, res) => {
  try {
    const tables = await getTables()
    res.json({ tables })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load tables.' })
  }
})

router.get('/orders', async (req, res) => {
  if (!dbReady()) {
    return res.json({ orders: [], message: 'Connect MongoDB to persist and list orders.' })
  }

  try {
    const status = req.query.status
    const filter = status ? { status } : {}
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    res.json({ orders })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load orders.' })
  }
})

router.get('/orders/:orderId', async (req, res) => {
  if (!dbReady()) {
    return res.status(404).json({ message: 'Order storage requires MongoDB.' })
  }

  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).lean()
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    res.json(order)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load order.' })
  }
})

router.post('/orders', async (req, res) => {
  const { items: orderedItems = [], notes = '', tableNumber = null } = req.body ?? {}

  if (!Array.isArray(orderedItems) || orderedItems.length === 0) {
    return res.status(400).json({ message: 'Cart is empty.' })
  }

  try {
    const lines = []

    for (const line of orderedItems) {
      const menuItem = await resolveMenuItem(line.itemId)
      if (!menuItem) {
        return res.status(400).json({ message: `Unknown menu item: ${line.itemId}` })
      }

      const extras = menuItem.customizations
        .filter((option) => line.selectedCustomizations?.includes(option.label))
        .reduce((sum, option) => sum + option.price, 0)

      const unitPrice = menuItem.price + extras
      const quantity = line.quantity ?? 1

      lines.push({
        itemSlug: menuItem.slug,
        itemName: menuItem.name,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        selectedCustomizations: line.selectedCustomizations ?? [],
      })
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
    const tax = Math.round(subtotal * 0.15)
    const serviceCharge = Math.round(subtotal * 0.08)
    const total = subtotal + tax + serviceCharge
    const orderId = buildOrderId()

    let tableLabel = tableNumber != null ? `TABLE ${tableNumber} · DINE IN` : 'TAKE AWAY'
    if (dbReady() && tableNumber != null) {
      const tableDoc = await Table.findOne({ number: tableNumber }).lean()
      if (tableDoc) tableLabel = tableDoc.label
    }

    const response = {
      orderId,
      eta: '15-20 min',
      itemCount: lines.length,
      notes,
      subtotal,
      tax,
      serviceCharge,
      total,
      tableNumber,
      tableLabel,
    }

    if (dbReady()) {
      await Order.create({
        orderId,
        tableNumber,
        tableLabel,
        items: lines,
        notes,
        subtotal,
        tax,
        serviceCharge,
        total,
        status: 'received',
        eta: response.eta,
      })
      response.saved = true
    } else {
      response.saved = false
      response.message = 'Order created in demo mode. Connect MongoDB to save orders.'
    }

    res.status(201).json(response)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to place order.' })
  }
})

module.exports = router
