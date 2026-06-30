const fs = require('fs')
const path = require('path')
const QRCode = require('qrcode')

const publicRoot = path.join(__dirname, '../client/public')
const qrDir = path.join(publicRoot, 'qr')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    baseUrl: process.env.PUBLIC_URL || process.env.QR_URL || 'http://localhost:5173',
    tables: null,
    table: process.env.TABLE ? Number(process.env.TABLE) : null,
  }

  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      options.baseUrl = arg.slice('--url='.length)
    } else if (arg.startsWith('--table=')) {
      options.table = Number(arg.slice('--table='.length))
    } else if (arg.startsWith('--tables=')) {
      options.tables = arg
        .slice('--tables='.length)
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value))
    }
  }

  if (process.env.TABLES) {
    options.tables = process.env.TABLES.split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value))
  }

  return options
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '').replace(/\?.*$/, '')
}

async function writeQr(filePath, targetUrl) {
  await QRCode.toFile(filePath, targetUrl, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: {
      dark: '#1f5b24',
      light: '#ffffff',
    },
  })
  console.log(`QR generated: ${filePath} -> ${targetUrl}`)
}

async function main() {
  const { baseUrl, table, tables } = parseArgs()
  const siteUrl = normalizeBaseUrl(baseUrl)
  const tableNumbers =
    tables && tables.length > 0
      ? tables
      : table != null && Number.isFinite(table)
        ? [table]
        : Array.from({ length: 20 }, (_, index) => index + 1)

  fs.mkdirSync(qrDir, { recursive: true })

  for (const tableNumber of tableNumbers) {
    const targetUrl = `${siteUrl}/?table=${tableNumber}`
    await writeQr(path.join(qrDir, `table-${tableNumber}.png`), targetUrl)
  }

  const defaultTable = tableNumbers.includes(7) ? 7 : tableNumbers[0]
  const defaultTarget = `${siteUrl}/?table=${defaultTable}`
  await writeQr(path.join(publicRoot, 'qr-menu.png'), defaultTarget)

  console.log('')
  console.log(`Done. ${tableNumbers.length} table QR code(s) for ${siteUrl}`)
  console.log(`Print stand: ${siteUrl}/qr-stand?table=${defaultTable}`)
}

main().catch((error) => {
  console.error('Failed to generate QR codes:', error)
  process.exit(1)
})
