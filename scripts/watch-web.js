#!/usr/bin/env node
/**
 * Web dev watcher: rebuilds on file changes and serves dist/
 * Usage: node scripts/watch-web.js
 */
const { execSync, spawn } = require('child_process')
const fs   = require('fs')
const path = require('path')

const ROOT    = path.join(__dirname, '..')
const WATCH   = ['app', 'components', 'store', 'services', 'constants', 'locales', 'utils', 'types', 'hooks']
const DEBOUNCE_MS = 1500

let serveProcess = null
let buildTimer   = null
let building     = false

function build() {
  if (building) return
  building = true
  console.log('\n🔨 Rebuilding web...')
  try {
    execSync('npm run build:web', { cwd: ROOT, stdio: 'inherit' })
    console.log('✅ Build done\n')
  } catch (e) {
    console.error('❌ Build failed\n')
  }
  building = false
}

function startServe() {
  if (serveProcess) serveProcess.kill()
  serveProcess = spawn('npx', ['serve', 'dist', '-p', '3000'], {
    cwd: ROOT, stdio: 'inherit', shell: true,
  })
}

function scheduleRebuild() {
  clearTimeout(buildTimer)
  buildTimer = setTimeout(() => build(), DEBOUNCE_MS)
}

// Initial build + serve
build()
startServe()

// Watch folders
WATCH.forEach(folder => {
  const dir = path.join(ROOT, folder)
  if (!fs.existsSync(dir)) return
  fs.watch(dir, { recursive: true }, (event, filename) => {
    if (!filename) return
    if (!/\.(tsx?|json)$/.test(filename)) return
    console.log(`📝 Changed: ${folder}/${filename}`)
    scheduleRebuild()
  })
})

console.log(`\n👀 Watching for changes in: ${WATCH.join(', ')}`)
console.log('🌐 Serving at http://localhost:3000\n')

process.on('SIGINT', () => {
  if (serveProcess) serveProcess.kill()
  process.exit()
})
