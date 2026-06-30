require('dotenv').config()
const mongoose = require('mongoose')
const { connectDB } = require('../src/db')
const { seedDatabase } = require('../src/seed')

async function run() {
  const connected = await connectDB()
  if (!connected) {
    console.error('MongoDB connection required. Set MONGO_URI in server/.env')
    process.exit(1)
  }

  const force = process.argv.includes('--force')
  if (force) {
    await mongoose.connection.db.dropDatabase()
    console.log('Database cleared.')
  }

  await seedDatabase()
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
