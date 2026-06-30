const mongoose = require('mongoose')

let isConnected = false

async function connectDB() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.log('MONGO_URI not set — using in-memory seed file fallback.')
    return false
  }

  try {
    await mongoose.connect(uri)
    isConnected = true
    console.log('MongoDB connected.')
    return true
  } catch (error) {
    console.error('MongoDB connection failed — using seed file fallback.')
    console.error(error.message)
    return false
  }
}

function dbReady() {
  return isConnected && mongoose.connection.readyState === 1
}

module.exports = { connectDB, dbReady }
