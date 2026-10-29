// node build.mjs            → index.html, utilisation.html, architecture.html (site multi-pages)
// node build.mjs --single   → dist/gitdrop-docs.html (un seul fichier autonome)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const PAGES = [['presentation', 'index.html', 'Présentation'], ['utilisation', 'utilisation.html', 'Utilisation'], ['architecture', 'architecture.html', 'Architecture']]
const [head, nav, footer, sprite] = ['head', 'nav', 'footer'].map((n) => read(`src/${n}.html`)).concat(read('src/sprite.svg'))
const main = (file) => read(`src/${file}`)

if (!process.argv.includes('--single')) {
  for (const [id, file, title] of PAGES) {
    writeFileSync(new URL(file, import.meta.url), `<!doctype html>\n<html lang="fr">\n${head.replace('{{title}}', `${title} — Gitdrop`)}\n<body data-current="${id}">\n${sprite}\n${nav}\n<main>\n${main(file)}\n</main>\n${footer}\n<script src="assets/vendor/bootstrap.bundle.min.js"></script>\n<script src="assets/js/site.js"></script>\n</body>\n</html>\n`)
  }
  console.log('✔ 3 pages générées')
} else {
  const logo = `data:image/svg+xml;base64,${Buffer.from(read('assets/logo.svg')).toString('base64')}`
  const route = (s) => PAGES.reduce((acc, [id, file]) => acc.replaceAll(`href="${file}"`, `href="#${id}"`), s)
  const sections = PAGES.map(([id, file]) => `<section data-page="${id}" hidden>${main(file)}</section>`).join('\n')
  const html = `<!doctype html>\n<html lang="fr">\n${head
    .replace('{{title}}', 'Gitdrop — Documentation')
    .replace(/<link rel="stylesheet" href="assets\/vendor\/bootstrap.min.css"><link rel="stylesheet" href="assets\/css\/gitdrop-docs.css">/, () => `<style>${read('assets/vendor/bootstrap.min.css')}\n${read('assets/css/gitdrop-docs.css')}</style>`)
    .replace('href="assets/logo.svg"', `href="${logo}"`)}\n<body>\n${sprite}\n${route(nav)}\n<main>\n${route(sections)}\n</main>\n${footer}\n<script>${read('assets/vendor/bootstrap.bundle.min.js')}</script>\n<script>${read('assets/js/site.js')}</script>\n</body>\n</html>\n`.replaceAll('assets/logo.svg', logo)
  mkdirSync(new URL('dist', import.meta.url), { recursive: true })
  writeFileSync(new URL('dist/gitdrop-docs.html', import.meta.url), html)
  console.log(`✔ dist/gitdrop-docs.html (${Math.round(html.length / 1024)} Ko)`)
}
