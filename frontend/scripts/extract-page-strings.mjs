// Collects every static string passed to usePageTranslation([...]) into
// src/i18n/pageStrings.json, so the app can pre-translate all pages in the
// background (LanguageContext) instead of showing English first on each page.
// Runs automatically before `npm run build`; run it by hand with
// `node scripts/extract-page-strings.mjs` after adding new strings.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const outFile = join(srcDir, 'i18n', 'pageStrings.json')

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(jsx|js)$/.test(name) ? [full] : []
  })
}

// Text of the [...] array starting at `start` (the index of its opening bracket)
function arrayText(code, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < code.length; i++) {
    const ch = code[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
    } else if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '[') depth++
    else if (ch === ']' && --depth === 0) return code.slice(start, i + 1)
  }
  return ''
}

function stringLiterals(text) {
  const out = []
  const re = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"/g
  let m
  while ((m = re.exec(text))) {
    const raw = m[1] ?? m[2]
    out.push(raw.replace(/\\(['"\\])/g, '$1'))
  }
  return out
}

const strings = new Set()
for (const file of sourceFiles(srcDir)) {
  const code = readFileSync(file, 'utf8')
  const re = /usePageTranslation\(\s*(\[|[A-Za-z_$][\w$]*)/g
  let m
  while ((m = re.exec(code))) {
    let start
    if (m[1] === '[') {
      start = m.index + m[0].length - 1
    } else {
      // Array declared separately: const NAME = [...]
      const decl = new RegExp(`(?:const|let|var)\\s+${m[1].replace(/\$/g, '\\$')}\\s*=\\s*\\[`).exec(code)
      if (!decl) continue
      start = decl.index + decl[0].length - 1
    }
    stringLiterals(arrayText(code, start)).forEach(s => s.trim() && strings.add(s))
  }
}

const sorted = [...strings].sort()
writeFileSync(outFile, JSON.stringify(sorted, null, 0) + '\n')
console.log(`extract-page-strings: ${sorted.length} strings -> ${outFile}`)
