const crypto = require('crypto')

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000

function getSecret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'green-house-dev-secret'
}

function issueToken() {
  const expires = Date.now() + TOKEN_TTL_MS
  const body = Buffer.from(JSON.stringify({ exp: expires })).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false

  const [body, sig] = token.split('.')
  if (!body || !sig) return false

  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  if (sig !== expected) return false

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!verifyToken(token)) {
    return res.status(401).json({ message: 'Admin login required.' })
  }

  return next()
}

function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || 'greenhouse'
  return typeof password === 'string' && password === expected
}

module.exports = {
  issueToken,
  verifyToken,
  requireAdmin,
  checkPassword,
}
