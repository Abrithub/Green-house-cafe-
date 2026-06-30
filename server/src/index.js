const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const { connectDB } = require('./db')
const adminRouter = require('./routes/admin')
const apiRouter = require('./routes/api')
const kitchenRouter = require('./routes/kitchen')
const { seedDatabase } = require('./seed')
const { getPublicUrl, isAllowedOrigin, setupClient } = require('./setupClient')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
  }),
)
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    name: 'Green House API',
    status: 'ok',
    message: 'This is the backend API. Open the customer menu on Vercel, not here.',
    frontend: process.env.CLIENT_URL || 'https://green-house-cafe.vercel.app',
    endpoints: {
      health: '/api/health',
      menu: '/api/bootstrap?table=7',
      admin: '/api/admin/login',
      kitchen: '/api/kitchen/orders',
    },
  })
})

app.use('/api/admin', adminRouter)
app.use('/api/kitchen', kitchenRouter)
app.use('/api', apiRouter)

setupClient(app)

async function start() {
  const connected = await connectDB()
  if (connected) {
    await seedDatabase()
  }

  app.listen(PORT, () => {
    console.log(`Green House server listening on port ${PORT}`)
    const publicUrl = getPublicUrl()
    if (publicUrl) {
      console.log(`Public URL: ${publicUrl}`)
    }
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
