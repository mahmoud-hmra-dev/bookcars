import fs from 'node:fs'
import path from 'node:path'

const languageDirs = [
  'frontend/src/lang',
  'admin/src/lang',
]

const enBlockPattern = /(^  en:\s*\{[\s\S]*?^  \},\r?\n)(?=  es:\s*\{)/m

for (const dir of languageDirs) {
  const files = fs.readdirSync(dir)
    .filter((file) => file.endsWith('.ts'))

  for (const file of files) {
    const filePath = path.join(dir, file)
    const content = fs.readFileSync(filePath, 'utf8')

    if (content.includes('\n  ar: {') || content.includes('\r\n  ar: {')) {
      continue
    }

    const match = content.match(enBlockPattern)

    if (!match) {
      throw new Error(`Could not find the English locale block in ${filePath}`)
    }

    const arBlock = match[1].replace(/^  en:/m, '  ar:')
    const nextContent = content.replace(enBlockPattern, () => `${match[1]}${arBlock}`)
    fs.writeFileSync(filePath, nextContent)
  }
}
