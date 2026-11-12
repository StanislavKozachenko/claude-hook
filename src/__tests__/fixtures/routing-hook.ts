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
  .on('SessionStart', 'compact|clear', (ctx) => {
    ctx.addContext('fresh context')
  })
  .on('SessionStart', 'compact', (ctx) => {
    ctx.addContext('after compaction')
  })
  .on('SessionStart', 'resume', (ctx) => {
    ctx.addContext('resumed')
  })
  .on('PermissionDenied', 'Bash', (ctx) => {
    if (ctx.input.command.startsWith('rm -rf ./dist')) ctx.retry()
  })
  .on('PreCompact', 'manual', (ctx) => {
    ctx.addInstructions('Keep the list of open TODOs')
  })
  .on('PreCompact', '*', (ctx) => {
    ctx.addInstructions(`Trigger: ${ctx.trigger}`)
  })
  .on('*', '*', (ctx) => {
    if (ctx.hookEventName === 'Notification' || ctx.hookEventName === 'PreCompact') ctx.setTerminalSequence('\x07')
  })
  .run()
