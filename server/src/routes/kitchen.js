const express = require('express')
const Order = require('../models/Order')
const { dbReady } = require('../db')
const { checkPassword, issueToken, requireAdmin } = require('../middleware/adminAuth')

const router = express.Router()

const ACTIVE_STATUSES = ['received', 'preparing', 'cooking', 'ready']
const ALL_STATUSES = ['received', 'preparing', 'cooking', 'ready', 'served', 'cancelled']

function mapKitchenOrder(doc) {
  return {
    orderId: doc.orderId,
    tableNumber: doc.tableNumber,
    tableLabel: doc.tableLabel,
    items: doc.items ?? [],
    notes: doc.notes ?? '',
    subtotal: doc.subtotal,
    tax: doc.tax,
    serviceCharge: doc.serviceCharge,
    total: doc.total,
    status: doc.status,
    eta: doc.eta,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function requireDatabase(_req, res, next) {
  if (!dbReady()) {
    return res.status(503).json({ message: 'Kitchen display requires MongoDB. Connect MONGO_URI and restart.' })
  }
  return next()
}

router.post('/login', (req, res) => {
  const { password } = req.body ?? {}

  if (!checkPassword(password)) {
    return res.status(401).json({ message: 'Wrong password.' })
  }

  return res.json({ token: issueToken() })
})

router.use(requireAdmin)
router.use(requireDatabase)

router.get('/orders', async (req, res) => {
  try {
    const view = req.query.view === 'all' ? 'all' : 'active'
    const filter = view === 'active' ? { status: { $in: ACTIVE_STATUSES } } : {}

    const orders = await Order.find(filter).sort({ createdAt: 1 }).limit(100).lean()
    res.json({ orders: orders.map(mapKitchenOrder) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load kitchen orders.' })
  }
})

router.patch('/orders/:orderId/status', async (req, res) => {
  const { status } = req.body ?? {}

  if (!ALL_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status.' })
  }

  try {
    const doc = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status },
      { new: true, runValidators: true },
    ).lean()

    if (!doc) return res.status(404).json({ message: 'Order not found.' })
    res.json({ order: mapKitchenOrder(doc) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to update order status.' })
  }
})

module.exports = router
