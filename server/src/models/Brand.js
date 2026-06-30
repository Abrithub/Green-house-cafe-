const mongoose = require('mongoose')

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    heroMessage: { type: String, required: true },
    nameAm: String,
    taglineAm: String,
    heroMessageAm: String,
  },
  { timestamps: true },
)

module.exports = mongoose.model('Brand', brandSchema)
