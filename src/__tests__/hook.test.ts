import { spawnSync } from 'child_process'
import { createHook } from '../hook'
import type { HookOptions } from '../hook'
import * as path from 'path'

const runJs = path.join(__dirname, '..', '..', 'bin', 'run.js')
const fixture = (name: string) => path.join(__dirname, 'fixtures', name)

function runHook(file: string, stdin: string, env: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [runJs, 'run', fixture(file)], {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

const bashEvent = JSON.stringify({
  session_id: 's',
  transcript_path: 't',
  cwd: '.',
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'ls' },
  tool_use_id: 'tu1',
})

describe('run() failure handling', () => {
  test('a throwing handler exits 1 with a one-line message and no stdout by default', () => {
    const { code, stdout, stderr } = runHook('failing-hook.ts', bashEvent)
    expect(code).toBe(1)
    // an earlier handler's allow() must not leak: with exit 1, valid JSON on stdout would still apply
    expect(stdout).toBe('')
    expect(stderr).toBe('claude-hook: PreToolUse handler failed: policy check crashed\n')
  })

  test("onFailure: 'block' exits 2 so blockable events fail closed", () => {
    const { code, stdout, stderr } = runHook('failing-hook.ts', bashEvent, { HOOK_ON_FAILURE: 'block' })
    expect(code).toBe(2)
    expect(stdout).toBe('')
    expect(stderr).toContain('policy check crashed')
  })

  test("invalid stdin JSON follows onFailure", () => {
    expect(runHook('failing-hook.ts', 'not json').code).toBe(1)
    const blocked = runHook('failing-hook.ts', 'not json', { HOOK_ON_FAILURE: 'block' })
    expect(blocked.code).toBe(2)
    expect(blocked.stderr).toBe('claude-hook: failed to parse stdin JSON\n')
  })
})

const event = (fields: Record<string, unknown>) =>
  JSON.stringify({ session_id: 's', transcript_path: 't', cwd: '.', tool_use_id: 'tu1', ...fields })
const toolEvent = (tool_name: string, tool_input: Record<string, unknown>) =>
  event({ hook_event_name: 'PreToolUse', tool_name, tool_input })

describe('run() routing, blocking and output', () => {
  test('handlers matching the same event merge into one JSON object on stdout', () => {
    const { code, stdout, stderr } = runHook('routing-hook.ts', toolEvent('Edit', { file_path: 'a.ts', old_string: 'a', new_string: 'b' }))
    expect(code).toBe(0)
    expect(stderr).toBe('')
    expect(JSON.parse(stdout)).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: 'edit-or-write:Edit',
        permissionDecision: 'allow',
        permissionDecisionReason: 'edits are fine',
      },
    })
  })

  test('a pipe-list matcher routes each listed tool', () => {
    const { stdout } = runHook('routing-hook.ts', toolEvent('Write', { file_path: 'a.ts', content: '' }))
    expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toBe('edit-or-write:Write')
  })

  test('block exits 2 with the reason on stderr, skips later handlers, prints no JSON', () => {
    const { code, stdout, stderr } = runHook('routing-hook.ts', toolEvent('Bash', { command: 'rm -rf /' }))
    expect(code).toBe(2)
    expect(stderr).toBe('no rm\n')
    expect(stdout).toBe('')
  })

  test('block keeps the JSON output handlers set (Claude Code reads it on exit 2)', () => {
    const { code, stdout, stderr } = runHook('routing-hook.ts', event({ hook_event_name: 'UserPromptSubmit', prompt: 'my secret' }))
    expect(code).toBe(2)
    expect(stderr).toBe('prompt rejected\n')
    expect(JSON.parse(stdout)).toEqual({
      continue: false,
      stopReason: 'stopped by policy',
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', suppressOriginalPrompt: true },
    })
  })

  test('handlers after a non-blocking handler still run', () => {
    const { code, stdout } = runHook('routing-hook.ts', toolEvent('Bash', { command: 'ls' }))
    expect(code).toBe(0)
    expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toBe('second bash handler ran')
  })

  test('a matching handler that sets nothing prints nothing', () => {
    const { code, stdout } = runHook('routing-hook.ts', toolEvent('Read', { file_path: 'a.ts' }))
    expect(code).toBe(0)
    expect(stdout).toBe('')
  })

  test('no matching handler exits 0 with empty stdout', () => {
    const { code, stdout, stderr } = runHook('routing-hook.ts', toolEvent('Glob', { pattern: '*' }))
    expect(code).toBe(0)
    expect(stdout).toBe('')
    expect(stderr).toBe('')
  })

  test('non-tool events route on their own matcher field', () => {
    expect(JSON.parse(runHook('routing-hook.ts', event({ hook_event_name: 'SessionStart', source: 'resume' })).stdout))
      .toEqual({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'resumed' } })
    expect(runHook('routing-hook.ts', event({ hook_event_name: 'SessionStart', source: 'startup' })).stdout).toBe('')
  })

  test('addContext from several matching handlers is joined, not overwritten', () => {
    const { stdout } = runHook('routing-hook.ts', event({ hook_event_name: 'SessionStart', source: 'compact' }))
    expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toBe('fresh context\nafter compaction')
  })

  test('PermissionDenied handlers get a typed PermissionDeniedContext that can only retry', () => {
    const denied = (command: string) =>
      event({ hook_event_name: 'PermissionDenied', tool_name: 'Bash', tool_input: { command }, reason: '[Irreversible Local Destruction]' })
    const retried = runHook('routing-hook.ts', denied('rm -rf ./dist'))
    expect(retried.code).toBe(0)
    expect(JSON.parse(retried.stdout)).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionDenied', retry: true } })
    expect(runHook('routing-hook.ts', denied('rm -rf /')).stdout).toBe('')
  })

  test('PreCompact instructions go to stdout as plain text, not JSON', () => {
    const { code, stdout } = runHook('routing-hook.ts', event({ hook_event_name: 'PreCompact', trigger: 'manual', custom_instructions: null }))
    expect(code).toBe(0)
    expect(stdout).toBe('Keep the list of open TODOs\nTrigger: manual')
  })

  test("events without matcher support ignore the matcher, except on '*' registrations", () => {
    const { code, stdout, stderr } = runHook('routing-hook.ts', event({ hook_event_name: 'Stop', stop_hook_active: false }))
    expect(code).toBe(0)
    expect(stderr).toBe('')
    expect(JSON.parse(stdout)).toEqual({ hookSpecificOutput: { hookEventName: 'Stop', additionalContext: 'stop handler ran' } })
  })

  test("a '*' event registration receives every event", () => {
    const { stdout } = runHook('routing-hook.ts', event({ hook_event_name: 'Notification', notification_type: 'idle_prompt', message: 'm' }))
    expect(JSON.parse(stdout)).toEqual({ terminalSequence: '\x07' })
  })
})

describe('run() output over the pipe buffer', () => {
  // Pipe writes are async on POSIX — exiting before they flush cut output at 64 KB on Linux
  const size = 1_000_000

  test('large JSON output reaches stdout in full', () => {
    const { code, stdout } = runHook('large-output-hook.ts', toolEvent('Read', { file_path: 'a.ts' }), { HOOK_OUTPUT_SIZE: String(size) })
    expect(code).toBe(0)
    expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toHaveLength(size)
  })

  test('a large block reason reaches stderr in full', () => {
    const { code, stderr } = runHook('large-output-hook.ts', toolEvent('Bash', { command: 'ls' }), { HOOK_OUTPUT_SIZE: String(size) })
    expect(code).toBe(2)
    expect(stderr).toHaveLength(size + 1)
  })
})

describe('dispatch()', () => {
  const event = {
    session_id: 's',
    transcript_path: 't',
    cwd: '.',
    hook_event_name: 'PreToolUse' as const,
    tool_name: 'Bash',
    tool_input: { command: 'rm -rf /' },
    tool_use_id: 'tu1',
  }

  test('returns exit code, stdout and stderr without touching the process', async () => {
    const hook = createHook().on('PreToolUse', 'Bash', (ctx) => {
      ctx.addContext('checked')
      if (ctx.input.command.startsWith('rm')) ctx.block('no rm')
    })
    expect(await hook.dispatch(event)).toEqual({
      exitCode: 2,
      stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'checked' } }),
      stderr: 'no rm\n',
    })
  })

  test('accepts raw JSON text and returns an empty result when nothing matches', async () => {
    const hook = createHook().on('PreToolUse', 'Edit', (ctx) => ctx.allow())
    expect(await hook.dispatch(JSON.stringify(event))).toEqual({ exitCode: 0, stdout: '', stderr: '' })
  })

  test('allow() prints JSON with exit 0', async () => {
    const hook = createHook().on('PreToolUse', '*', (ctx) => ctx.allow('ok'))
    const result = await hook.dispatch(event)
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision).toBe('allow')
  })

  test('handler errors and invalid JSON follow onFailure', async () => {
    const throwing = (options?: HookOptions) => createHook(options).on('PreToolUse', '*', () => { throw new Error('boom') })
    expect(await throwing().dispatch(event)).toEqual({ exitCode: 1, stdout: '', stderr: 'claude-hook: PreToolUse handler failed: boom\n' })
    expect((await throwing({ onFailure: 'block' }).dispatch(event)).exitCode).toBe(2)
    expect(await createHook().dispatch('not json')).toEqual({ exitCode: 1, stdout: '', stderr: 'claude-hook: failed to parse stdin JSON\n' })
    expect(await createHook().dispatch('null')).toEqual({ exitCode: 1, stdout: '', stderr: 'claude-hook: stdin JSON is not a hook event (no hook_event_name)\n' })
  })

  test('plain-text events return their text on stdout', async () => {
    const hook = createHook().on('WorktreeCreate', '*', (ctx) => ctx.provideWorktreePath('/wt/x'))
    const result = await hook.dispatch({ session_id: 's', transcript_path: 't', cwd: '.', hook_event_name: 'WorktreeCreate', name: 'x' })
    expect(result).toEqual({ exitCode: 0, stdout: '/wt/x', stderr: '' })
  })
})
