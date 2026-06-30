const mongoose = require('mongoose')

const customizationSchema = new mongoose.Schema(
  {
    label: String,
    labelAm: String,
    price: Number,
  },
  { _id: false },
)

const menuItemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    categorySlug: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameAm: String,
    description: String,
    descriptionAm: String,
    price: { type: Number, required: true },
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    image: String,
    popular: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    prepTime: { type: String, default: '12 min' },
    tags: [String],
    customizations: [customizationSchema],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('MenuItem', menuItemSchema)
