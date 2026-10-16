// Builds favicon/app icons from public/icon.svg (white Lider "LI" mark on the brand red).
// Usage: node scripts/make-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const svg = await readFile('public/icon.svg')

/** Square PNG; `square` drops the rounded corners (iOS applies its own mask). */
async function icon(size, { square = false } = {}) {
  const src = square ? Buffer.from(svg.toString().replace(/ rx="\d+"/, '')) : svg
  return sharp(src, { density: Math.max(72, (72 * size) / 512 * 4) }).resize(size, size).png().toBuffer()
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

const pngs = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await icon(size) })))
await writeFile('public/favicon.ico', ico(pngs))
await writeFile('public/icon-192.png', await icon(192))
await writeFile('public/icon-512.png', await icon(512))
await writeFile('public/apple-touch-icon.png', await icon(180, { square: true }))
console.log('icons written')
