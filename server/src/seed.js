const Brand = require('./models/Brand')
const Category = require('./models/Category')
const Combo = require('./models/Combo')
const MenuItem = require('./models/MenuItem')
const Promo = require('./models/Promo')
const Table = require('./models/Table')
const { brand, categories, combos, items, promos } = require('./data')
const { dbReady } = require('./db')

async function seedDatabase() {
  if (!dbReady()) return false

  const categoryCount = await Category.countDocuments()
  if (categoryCount > 0) {
    console.log('Database already seeded — skipping.')
    return true
  }

  console.log('Seeding Green House database...')

  await Brand.create({
    name: brand.name,
    tagline: brand.tagline,
    heroMessage: brand.heroMessage,
  })

  await Category.insertMany(
    categories.map((category, index) => ({
      slug: category.id,
      name: category.name,
      emoji: category.emoji,
      image: category.image,
      sortOrder: index,
    })),
  )

  await MenuItem.insertMany(
    items.map((menuItem) => ({
      slug: menuItem.id,
      categorySlug: menuItem.categoryId,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      rating: menuItem.rating,
      reviewCount: menuItem.reviewCount ?? 0,
      image: menuItem.image,
      popular: Boolean(menuItem.popular),
      featured: Boolean(menuItem.featured),
      prepTime: menuItem.prepTime,
      tags: menuItem.tags ?? [],
      customizations: menuItem.customizations ?? [],
    })),
  )

  await Promo.insertMany(
    promos.map((promo, index) => ({
      slug: promo.id,
      kicker: promo.kicker,
      title: promo.title,
      subtitle: promo.subtitle,
      badge: promo.badge,
      sortOrder: index,
    })),
  )

  await Combo.insertMany(
    combos.map((combo, index) => ({
      slug: combo.id,
      title: combo.title,
      subtitle: combo.subtitle,
      image: combo.image,
      sortOrder: index,
    })),
  )

  const tables = Array.from({ length: 20 }, (_, index) => {
    const number = index + 1
    return {
      number,
      slug: `table-${number}`,
      label: `TABLE ${number} · DINE IN`,
      labelAm: `ጠረጴዛ ${number} · በቦታ መብላት`,
    }
  })
  await Table.insertMany(tables)

  console.log('Database seeded successfully.')
  return true
}

module.exports = { seedDatabase }
