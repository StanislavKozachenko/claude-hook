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
