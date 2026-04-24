const fs = require('fs')
const path = require('path')

const indexPath = path.join(__dirname, '../dist/index.html')
let html = fs.readFileSync(indexPath, 'utf8')
html = html.replace(/<script src="/g, '<script type="module" src="')
fs.writeFileSync(indexPath, html)
console.log('✓ index.html patched: added type="module"')
