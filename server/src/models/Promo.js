const mongoose = require('mongoose')

const promoSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    kicker: String,
    kickerAm: String,
    title: String,
    titleAm: String,
    subtitle: String,
    subtitleAm: String,
    badge: String,
    badgeAm: String,
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Promo', promoSchema)
