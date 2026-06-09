const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const dir = path.join(__dirname, '../public/icons')

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#16a34a"/>
  <text x="256" y="320" font-family="system-ui, sans-serif" font-size="220"
    font-weight="bold" text-anchor="middle" fill="white">QM</text>
</svg>
`

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, `icon-${size}x${size}.png`))
    console.log(`Generated ${size}x${size}`)
  }
}

generate()
