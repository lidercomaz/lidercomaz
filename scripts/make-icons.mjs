// Builds favicon/app icons from the Lider logo ("LI" mark on white).
// Usage: node scripts/make-icons.mjs
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const LOGO = 'public/theme/images/logo.png'
const mark = await sharp(LOGO).extract({ left: 3, top: 4, width: 92, height: 92 }).png().toBuffer()

async function icon(size, padding = 0.16, radius = 0.2) {
  const inner = Math.round(size * (1 - padding * 2))
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * radius}" fill="#fff"/></svg>`,
  )
  const glyph = await sharp(mark).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  return sharp(bg).composite([{ input: glyph, gravity: 'center' }]).png().toBuffer()
}

/** ICO container with embedded PNG images (supported by all current browsers). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4)
    header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(png.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((i) => i.png)])
}

const sizes = [16, 32, 48]
const pngs = await Promise.all(sizes.map(async (size) => ({ size, png: await icon(size, 0.06, 0.12) })))
await writeFile('public/favicon.ico', ico(pngs))
await writeFile('public/icon-192.png', await icon(192))
await writeFile('public/icon-512.png', await icon(512))
await writeFile('public/apple-touch-icon.png', await icon(180, 0.14, 0))
console.log('icons written')
