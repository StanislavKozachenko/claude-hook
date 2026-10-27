import { createHook } from '../../index.js'

createHook()
  .on('PreToolUse', 'Edit|Write', (ctx) => {
    ctx.addContext(`edit-or-write:${ctx.toolName}`)
  })
  .on('PreToolUse', 'Edit', (ctx) => {
    ctx.allow('edits are fine')
  })
  .on('PreToolUse', 'Bash', (ctx) => {
    if (ctx.input.command.startsWith('rm')) ctx.block('no rm')
  })
  .on('PreToolUse', 'Bash', (ctx) => {
    // must not run after a block
    ctx.addContext('second bash handler ran')
  })
  .on('PreToolUse', 'Read', () => {
    // matches but sets nothing
  })
  .on('SessionStart', 'resume', (ctx) => {
    ctx.addContext('resumed')
  })
  .on('*' as 'Notification', '*', (ctx) => {
    if (ctx.hookEventName === 'Notification') ctx.setTerminalSequence('\x07')
  })
  .run()
