#!/usr/bin/env node
'use strict'
const { spawnSync } = require('child_process')
const path = require('path')

const subcommand = process.argv[2]
const file = process.argv[3]

if (subcommand !== 'run' || !file) {
  process.stderr.write('Usage: claude-hook run <file>\n')
  process.exit(1)
}

let tsxCli
try {
  const tsxPkg = require.resolve('tsx/package.json')
  // tsx bin entry: "tsx": "dist/cli.mjs"
  tsxCli = path.join(path.dirname(tsxPkg), 'dist', 'cli.mjs')
} catch {
  process.stderr.write('tsx is not found. Try reinstalling claude-hook.\n')
  process.exit(1)
}

const result = spawnSync(process.execPath, [tsxCli, path.resolve(file)], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
