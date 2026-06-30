const mongoose = require('mongoose')

const comboSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: String,
    titleAm: String,
    subtitle: String,
    subtitleAm: String,
    image: String,
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Combo', comboSchema)
