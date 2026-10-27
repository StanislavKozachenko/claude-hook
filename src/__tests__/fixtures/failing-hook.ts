import { createHook } from '../../index.js'

const onFailure = process.env['HOOK_ON_FAILURE'] as 'continue' | 'block' | undefined

createHook({ onFailure })
  .on('PreToolUse', 'Bash', (ctx) => {
    ctx.allow()
  })
  .on('PreToolUse', 'Bash', async () => {
    throw new Error('policy check crashed')
  })
  .run()
