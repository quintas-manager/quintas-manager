const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const dir = path.join(__dirname, '../public/icons')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

async function generate() {
  const src = path.join(__dirname, '../public/logo-original.png')
  for (const size of sizes) {
    await sharp(src)
      .extract({ left: 50, top: 30, width: 1080, height: 700 })
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(dir, `icon-${size}x${size}.png`))
    console.log(`Generated icon-${size}x${size}.png`)
  }
  await sharp(src)
    .extract({ left: 50, top: 30, width: 1080, height: 700 })
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'))
  console.log('Generated apple-touch-icon.png')
  console.log('All icons generated ✓')
}
generate().catch(console.error)
