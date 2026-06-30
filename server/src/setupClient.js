const path = require('path')
const express = require('express')

function getClientDistPath() {
  return path.join(__dirname, '../../client/dist')
}

function shouldServeClient() {
  if (process.env.SERVE_CLIENT === 'true') return true
  if (process.env.SERVE_CLIENT === 'false') return false
  return process.env.NODE_ENV === 'production'
}

function setupClient(app) {
  if (!shouldServeClient()) return false

  const fs = require('fs')
  const distPath = getClientDistPath()

  if (!fs.existsSync(distPath)) {
    console.warn(`Client build not found at ${distPath}. Run: npm run build --prefix client`)
    return false
  }

  app.use(express.static(distPath, { index: false }))

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })

  console.log(`Serving client from ${distPath}`)
  return true
}

function normalizeOrigin(value) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function getAllowedOrigins() {
  const defaults = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
  const configured = (process.env.CLIENT_URL || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean)

  const platformUrl = normalizeOrigin(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL)

  return [...new Set([...configured, ...(platformUrl ? [platformUrl] : []), ...defaults])]
}

function isAllowedOrigin(origin) {
  if (!origin) return true

  const allowed = getAllowedOrigins()
  if (allowed.includes(origin)) return true

  if (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && /\.vercel\.app$/i.test(origin)) {
    return true
  }

  return false
}

function getPublicUrl() {
  return (
    normalizeOrigin(process.env.PUBLIC_URL) ||
    normalizeOrigin(process.env.RENDER_EXTERNAL_URL) ||
    normalizeOrigin(process.env.CLIENT_URL?.split(',')[0]) ||
    ''
  )
}

module.exports = {
  setupClient,
  getAllowedOrigins,
  getPublicUrl,
  isAllowedOrigin,
  shouldServeClient,
}
