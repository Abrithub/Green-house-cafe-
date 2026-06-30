const mongoose = require('mongoose')

const orderLineSchema = new mongoose.Schema(
  {
    itemSlug: String,
    itemName: String,
    quantity: Number,
    unitPrice: Number,
    lineTotal: Number,
    selectedCustomizations: [String],
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    tableNumber: Number,
    tableLabel: String,
    items: [orderLineSchema],
    notes: { type: String, default: '' },
    subtotal: Number,
    tax: Number,
    serviceCharge: Number,
    total: Number,
    status: {
      type: String,
      enum: ['received', 'preparing', 'cooking', 'ready', 'served', 'cancelled'],
      default: 'received',
    },
    eta: { type: String, default: '15-20 min' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Order', orderSchema)
