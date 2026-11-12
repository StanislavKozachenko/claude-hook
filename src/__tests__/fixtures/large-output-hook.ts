import { createHook } from '../../index.js'

const size = Number(process.env['HOOK_OUTPUT_SIZE'])

createHook()
  .on('PreToolUse', 'Read', (ctx) => {
    ctx.addContext('x'.repeat(size))
  })
  .on('PreToolUse', 'Bash', (ctx) => {
    ctx.block('y'.repeat(size))
  })
  .run()
