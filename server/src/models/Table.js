const mongoose = require('mongoose')

const tableSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    labelAm: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Table', tableSchema)
