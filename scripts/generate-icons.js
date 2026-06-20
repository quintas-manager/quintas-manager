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
      .extract({ left: 140, top: 180, width: 920, height: 560 })
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(dir, `icon-${size}x${size}.png`))
    console.log(`Generated icon-${size}x${size}.png`)
  }
  await sharp(src)
    .extract({ left: 140, top: 180, width: 920, height: 560 })
    .resize(180, 180, { fit: 'cover', position: 'center' })
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'))
  console.log('Generated apple-touch-icon.png')
  console.log('All icons generated ✓')
}
generate().catch(console.error)
