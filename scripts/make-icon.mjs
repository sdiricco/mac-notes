// Rigenera build/icon.png (1024x1024) dal sorgente build/icon.svg.
// electron-builder ricava .icns (mac), .ico (win) e i png (linux) da questo file.
import sharp from 'sharp'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build/icon.svg'))

await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile(join(root, 'build/icon.png'))
console.log('build/icon.png:', statSync(join(root, 'build/icon.png')).size, 'bytes')
