const { brand, categories, combos, items, promos } = require('../data')
const Brand = require('../models/Brand')
const Category = require('../models/Category')
const Combo = require('../models/Combo')
const MenuItem = require('../models/MenuItem')
const Promo = require('../models/Promo')
const Table = require('../models/Table')
const { dbReady } = require('../db')

function mapCategory(doc) {
  return {
    id: doc.slug,
    name: doc.name,
    emoji: doc.emoji,
    image: doc.image,
  }
}

function mapMenuItem(doc) {
  return {
    id: doc.slug,
    categoryId: doc.categorySlug,
    name: doc.name,
    description: doc.description,
    price: doc.price,
    rating: doc.rating,
    reviewCount: doc.reviewCount,
    image: doc.image,
    popular: doc.popular,
    featured: doc.featured,
    prepTime: doc.prepTime,
    tags: doc.tags,
    customizations: doc.customizations.map((entry) => ({
      label: entry.label,
      price: entry.price,
    })),
  }
}

function mapPromo(doc) {
  return {
    id: doc.slug,
    kicker: doc.kicker,
    title: doc.title,
    subtitle: doc.subtitle,
    badge: doc.badge,
  }
}

function mapCombo(doc) {
  return {
    id: doc.slug,
    title: doc.title,
    subtitle: doc.subtitle,
    image: doc.image,
  }
}

function fallbackBootstrap(tableNumber) {
  const tableLabel =
    tableNumber != null ? `TABLE ${tableNumber} · DINE IN` : brand.tableLabel

  return {
    brand: { ...brand, tableLabel },
    categories,
    items,
    combos,
    promos,
    source: 'file',
  }
}

async function getBootstrapPayload(tableNumber) {
  if (!dbReady()) {
    return fallbackBootstrap(tableNumber)
  }

  const [brandDoc, categoryDocs, itemDocs, comboDocs, promoDocs, tableDoc] = await Promise.all([
    Brand.findOne().lean(),
    Category.find({ active: true }).sort({ sortOrder: 1 }).lean(),
    MenuItem.find({ active: true }).lean(),
    Combo.find({ active: true }).sort({ sortOrder: 1 }).lean(),
    Promo.find({ active: true }).sort({ sortOrder: 1 }).lean(),
    tableNumber != null ? Table.findOne({ number: tableNumber, active: true }).lean() : null,
  ])

  const tableLabel = tableDoc?.label ?? (tableNumber != null ? `TABLE ${tableNumber} · DINE IN` : brand.tableLabel)

  return {
    brand: {
      name: brandDoc?.name ?? brand.name,
      tagline: brandDoc?.tagline ?? brand.tagline,
      heroMessage: brandDoc?.heroMessage ?? brand.heroMessage,
      tableLabel,
      tableNumber: tableDoc?.number ?? tableNumber ?? null,
    },
    categories: categoryDocs.map(mapCategory),
    items: itemDocs.map(mapMenuItem),
    combos: comboDocs.map(mapCombo),
    promos: promoDocs.map(mapPromo),
    source: 'database',
  }
}

async function getTables() {
  if (!dbReady()) {
    return Array.from({ length: 20 }, (_, index) => {
      const number = index + 1
      return {
        number,
        slug: `table-${number}`,
        label: `TABLE ${number} · DINE IN`,
      }
    })
  }

  const docs = await Table.find({ active: true }).sort({ number: 1 }).lean()
  return docs.map((doc) => ({
    number: doc.number,
    slug: doc.slug,
    label: doc.label,
  }))
}

module.exports = {
  getBootstrapPayload,
  getTables,
  mapMenuItem,
}
