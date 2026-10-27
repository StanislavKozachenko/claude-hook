import { spawnSync } from 'child_process'
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

  test("a '*' event registration receives every event", () => {
    const { stdout } = runHook('routing-hook.ts', event({ hook_event_name: 'Notification', notification_type: 'idle_prompt', message: 'm' }))
    expect(JSON.parse(stdout)).toEqual({ terminalSequence: '\x07' })
  })
})
