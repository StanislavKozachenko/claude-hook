// Compile-time checks of the public typings, enforced by `npm run lint` (tsc -p tsconfig.test.json).
// Handlers are only registered, never run — the jest test just keeps this a valid suite.
import { createHook } from '../index'

const hook = createHook()

// A matcher naming one tool types ctx.input on every tool event
hook.on('PreToolUse', 'Bash', (ctx) => { const command: string = ctx.input.command; void command })
hook.on('PostToolUse', 'Edit', (ctx) => { const path: string = ctx.input.file_path; void path })
hook.on('PostToolUseFailure', 'Read', (ctx) => { const pages: string | undefined = ctx.input.pages; void pages })
hook.on('PermissionRequest', 'WebFetch', (ctx) => { const url: string = ctx.input.url; void url })
hook.on('PermissionDenied', 'Monitor', (ctx) => { const ms: number = ctx.input.timeout_ms; void ms })
hook.on('PreToolUse', 'AskUserQuestion', (ctx) => { ctx.input.questions.map((q) => q.options[0].label) })

// @ts-expect-error — Bash input has no file_path
hook.on('PreToolUse', 'Bash', (ctx) => { ctx.input.file_path })
// @ts-expect-error — Read input has no command
hook.on('PermissionRequest', 'Read', (ctx) => { ctx.input.command })

// Multi-tool or regex matchers fall back to the untyped ToolInput
hook.on('PreToolUse', 'Edit|Write', (ctx) => { const name: string = ctx.toolName; void name })
hook.on('PreToolUse', 'mcp__.*', (ctx) => { ctx.allow() })

// Each context only exposes what its event honors
// @ts-expect-error — PermissionDenied happens after the denial: nothing to block
hook.on('PermissionDenied', '*', (ctx) => { ctx.block('x') })
// @ts-expect-error — PermissionDenied can't allow either
hook.on('PermissionDenied', '*', (ctx) => { ctx.allow() })
// @ts-expect-error — FileChanged is non-blocking
hook.on('FileChanged', '*', (ctx) => { ctx.block('x') })
// @ts-expect-error — CwdChanged is non-blocking
hook.on('CwdChanged', '*', (ctx) => { ctx.block('x') })
// @ts-expect-error — removed: Setup discards JSON output
hook.on('Setup', '*', (ctx) => { ctx.addContext('x') })
// @ts-expect-error — removed: suppressOutput has no effect
hook.on('Stop', '*', (ctx) => { ctx.suppress() })
// @ts-expect-error — retry() belongs to PermissionDeniedContext now
hook.on('PreToolUse', '*', (ctx) => { ctx.retry() })
hook.on('WorktreeRemove', '*', (ctx) => { ctx.block('keep it') })
hook.on('PreCompact', '*', (ctx) => { ctx.addInstructions('keep TODOs') })

// '*' gets the shared BaseContext
hook.on('*', '*', (ctx) => { ctx.setSystemMessage('hi') })

test('typings compile (checked by tsc, not at runtime)', () => {
  expect(hook).toBeDefined()
})
