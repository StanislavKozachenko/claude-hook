import { PreToolUseContext, UserPromptSubmitContext, PostToolUseContext } from '../context'
import type { PreToolUseEvent, PostToolUseEvent, UserPromptSubmitEvent } from '../types'

const baseEvent = {
  session_id: 'sess1',
  transcript_path: '/tmp/t.jsonl',
  cwd: '/home/user',
  permission_mode: 'default',
  tool_use_id: 'tu1',
}

const preToolEvent: PreToolUseEvent = {
  ...baseEvent,
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'rm -rf /tmp/foo' },
}

const postToolEvent: PostToolUseEvent = {
  ...baseEvent,
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'ls' },
  tool_response: { output: 'file.txt', exit_code: 0 },
}

const promptEvent: UserPromptSubmitEvent = {
  ...baseEvent,
  hook_event_name: 'UserPromptSubmit',
  user_message: 'DROP TABLE users',
}

describe('PreToolUseContext', () => {
  test('block sets _blocked and _blockReason', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    ctx.block('too dangerous')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('too dangerous')
  })

  test('modify sets updatedInput in hookSpecificOutput', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    ctx.modify({ command: 'echo safe' })
    expect(ctx._getOutput().hookSpecificOutput?.updatedInput).toEqual({ command: 'echo safe' })
  })

  test('addContext sets additionalContext', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    ctx.addContext('extra info')
    expect(ctx._getOutput().hookSpecificOutput?.additionalContext).toBe('extra info')
  })

  test('allow sets permissionDecision', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    ctx.allow()
    expect(ctx._getOutput().hookSpecificOutput?.permissionDecision).toBe('allow')
  })

  test('toolName and input accessors', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    expect(ctx.toolName).toBe('Bash')
    expect((ctx.input as { command: string }).command).toBe('rm -rf /tmp/foo')
  })
})

describe('PostToolUseContext', () => {
  test('output accessor returns tool_response', () => {
    const ctx = new PostToolUseContext(postToolEvent)
    expect((ctx.output as { exit_code: number }).exit_code).toBe(0)
  })

  test('addContext sets additionalContext', () => {
    const ctx = new PostToolUseContext(postToolEvent)
    ctx.addContext('done')
    expect(ctx._getOutput().hookSpecificOutput?.additionalContext).toBe('done')
  })
})

describe('UserPromptSubmitContext', () => {
  test('block sets _blocked', () => {
    const ctx = new UserPromptSubmitContext(promptEvent)
    ctx.block('no DDL')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('no DDL')
  })

  test('prompt accessor', () => {
    const ctx = new UserPromptSubmitContext(promptEvent)
    expect(ctx.prompt).toBe('DROP TABLE users')
  })

  test('setTitle sets sessionTitle', () => {
    const ctx = new UserPromptSubmitContext(promptEvent)
    ctx.setTitle('My Session')
    expect(ctx._getOutput().hookSpecificOutput?.sessionTitle).toBe('My Session')
  })
})
