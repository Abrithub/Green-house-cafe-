const express = require('express')
const Category = require('../models/Category')
const MenuItem = require('../models/MenuItem')
const { dbReady } = require('../db')
const { checkPassword, issueToken, requireAdmin } = require('../middleware/adminAuth')
const { slugify } = require('../utils/slugify')

const router = express.Router()

function mapAdminMenuItem(doc) {
  return {
    slug: doc.slug,
    categorySlug: doc.categorySlug,
    name: doc.name,
    nameAm: doc.nameAm ?? '',
    description: doc.description ?? '',
    descriptionAm: doc.descriptionAm ?? '',
    price: doc.price,
    rating: doc.rating,
    reviewCount: doc.reviewCount,
    image: doc.image ?? '',
    popular: Boolean(doc.popular),
    featured: Boolean(doc.featured),
    prepTime: doc.prepTime ?? '12 min',
    tags: doc.tags ?? [],
    customizations: (doc.customizations ?? []).map((entry) => ({
      label: entry.label,
      labelAm: entry.labelAm ?? '',
      price: entry.price,
    })),
    active: doc.active !== false,
    updatedAt: doc.updatedAt,
  }
}

function mapAdminCategory(doc) {
  return {
    slug: doc.slug,
    name: doc.name,
    nameAm: doc.nameAm ?? '',
    emoji: doc.emoji ?? '',
    image: doc.image ?? '',
    sortOrder: doc.sortOrder ?? 0,
    active: doc.active !== false,
  }
}

function requireDatabase(_req, res, next) {
  if (!dbReady()) {
    return res.status(503).json({ message: 'Admin dashboard requires MongoDB. Connect MONGO_URI and restart.' })
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

router.get('/categories', async (_req, res) => {
  try {
    const docs = await Category.find().sort({ sortOrder: 1, name: 1 }).lean()
    res.json({ categories: docs.map(mapAdminCategory) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load categories.' })
  }
})

router.post('/categories', async (req, res) => {
  const { name, emoji = '', image = '', nameAm = '' } = req.body ?? {}

  if (!name?.trim()) {
    return res.status(400).json({ message: 'Category name is required.' })
  }

  const slug = slugify(req.body.slug || name)
  if (!slug) {
    return res.status(400).json({ message: 'Invalid category slug.' })
  }

  try {
    const existing = await Category.findOne({ slug }).lean()
    if (existing) {
      return res.status(409).json({ message: 'Category slug already exists.' })
    }

    const count = await Category.countDocuments()
    const doc = await Category.create({
      slug,
      name: name.trim(),
      nameAm: nameAm.trim(),
      emoji,
      image,
      sortOrder: count,
      active: true,
    })

    res.status(201).json({ category: mapAdminCategory(doc.toObject()) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to create category.' })
  }
})

router.patch('/categories/:slug', async (req, res) => {
  const updates = {}
  const allowed = ['name', 'nameAm', 'emoji', 'image', 'sortOrder', 'active']

  for (const key of allowed) {
    if (req.body?.[key] !== undefined) updates[key] = req.body[key]
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No updates provided.' })
  }

  try {
    const doc = await Category.findOneAndUpdate({ slug: req.params.slug }, updates, {
      new: true,
      runValidators: true,
    }).lean()

    if (!doc) return res.status(404).json({ message: 'Category not found.' })
    res.json({ category: mapAdminCategory(doc) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to update category.' })
  }
})

router.get('/menu', async (req, res) => {
  try {
    const filter = {}
    if (req.query.category) filter.categorySlug = req.query.category
    if (req.query.active === 'true') filter.active = true
    if (req.query.active === 'false') filter.active = false

    const docs = await MenuItem.find(filter).sort({ categorySlug: 1, name: 1 }).lean()
    res.json({ items: docs.map(mapAdminMenuItem) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to load menu items.' })
  }
})

router.post('/menu', async (req, res) => {
  const {
    name,
    categorySlug,
    description = '',
    descriptionAm = '',
    nameAm = '',
    price,
    image = '',
    prepTime = '12 min',
    tags = [],
    customizations = [],
    popular = false,
    featured = false,
    active = true,
  } = req.body ?? {}

  if (!name?.trim()) {
    return res.status(400).json({ message: 'Item name is required.' })
  }
  if (!categorySlug?.trim()) {
    return res.status(400).json({ message: 'Category is required.' })
  }
  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: 'Valid price is required.' })
  }

  const slug = slugify(req.body.slug || name)
  if (!slug) {
    return res.status(400).json({ message: 'Invalid item slug.' })
  }

  try {
    const category = await Category.findOne({ slug: categorySlug.trim() }).lean()
    if (!category) {
      return res.status(400).json({ message: 'Category not found.' })
    }

    const existing = await MenuItem.findOne({ slug }).lean()
    if (existing) {
      return res.status(409).json({ message: 'Item slug already exists.' })
    }

    const doc = await MenuItem.create({
      slug,
      categorySlug: categorySlug.trim(),
      name: name.trim(),
      nameAm: nameAm.trim(),
      description: description.trim(),
      descriptionAm: descriptionAm.trim(),
      price: Number(price),
      image,
      prepTime,
      tags: Array.isArray(tags) ? tags : [],
      customizations: Array.isArray(customizations) ? customizations : [],
      popular: Boolean(popular),
      featured: Boolean(featured),
      active: Boolean(active),
    })

    res.status(201).json({ item: mapAdminMenuItem(doc.toObject()) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to create menu item.' })
  }
})

router.patch('/menu/:slug', async (req, res) => {
  const updates = {}
  const allowed = [
    'name',
    'nameAm',
    'description',
    'descriptionAm',
    'categorySlug',
    'price',
    'image',
    'prepTime',
    'tags',
    'customizations',
    'popular',
    'featured',
    'active',
    'rating',
    'reviewCount',
  ]

  for (const key of allowed) {
    if (req.body?.[key] !== undefined) updates[key] = req.body[key]
  }

  if (updates.price !== undefined) {
    updates.price = Number(updates.price)
    if (!Number.isFinite(updates.price) || updates.price < 0) {
      return res.status(400).json({ message: 'Valid price is required.' })
    }
  }

  if (updates.categorySlug) {
    const category = await Category.findOne({ slug: updates.categorySlug }).lean()
    if (!category) {
      return res.status(400).json({ message: 'Category not found.' })
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No updates provided.' })
  }

  try {
    const doc = await MenuItem.findOneAndUpdate({ slug: req.params.slug }, updates, {
      new: true,
      runValidators: true,
    }).lean()

    if (!doc) return res.status(404).json({ message: 'Menu item not found.' })
    res.json({ item: mapAdminMenuItem(doc) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to update menu item.' })
  }
})

router.delete('/menu/:slug', async (req, res) => {
  try {
    const doc = await MenuItem.findOneAndUpdate(
      { slug: req.params.slug },
      { active: false },
      { new: true },
    ).lean()

    if (!doc) return res.status(404).json({ message: 'Menu item not found.' })
    res.json({ item: mapAdminMenuItem(doc), message: 'Item hidden from menu.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to remove menu item.' })
  }
})

module.exports = router
