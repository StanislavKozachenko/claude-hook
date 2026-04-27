import { PreToolUseContext, UserPromptSubmitContext, PostToolUseContext, FileChangedContext, CwdChangedContext, ElicitationContext } from '../context'
import type { PreToolUseEvent, PostToolUseEvent, UserPromptSubmitEvent, FileChangedEvent, CwdChangedEvent, ElicitationEvent } from '../types'

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
    expect(ctx.input.command).toBe('rm -rf /tmp/foo')
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

describe('FileChangedContext', () => {
  const event: FileChangedEvent = {
    ...baseEvent,
    hook_event_name: 'FileChanged',
    file_path: '/project/.env',
  }

  test('filePath accessor', () => {
    const ctx = new FileChangedContext(event)
    expect(ctx.filePath).toBe('/project/.env')
  })

  test('block sets _blocked', () => {
    const ctx = new FileChangedContext(event)
    ctx.block('env changed')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('env changed')
  })
})

describe('CwdChangedContext', () => {
  const event: CwdChangedEvent = {
    ...baseEvent,
    hook_event_name: 'CwdChanged',
    old_cwd: '/old',
    new_cwd: '/new',
  }

  test('oldCwd and newCwd accessors', () => {
    const ctx = new CwdChangedContext(event)
    expect(ctx.oldCwd).toBe('/old')
    expect(ctx.newCwd).toBe('/new')
  })

  test('block sets _blocked', () => {
    const ctx = new CwdChangedContext(event)
    ctx.block('not allowed')
    expect(ctx._isBlocked()).toBe(true)
  })
})

describe('ElicitationContext', () => {
  const event: ElicitationEvent = {
    ...baseEvent,
    hook_event_name: 'Elicitation',
    prompt: 'What is the answer?',
  }

  test('prompt accessor', () => {
    const ctx = new ElicitationContext(event)
    expect(ctx.prompt).toBe('What is the answer?')
  })

  test('block sets _blocked', () => {
    const ctx = new ElicitationContext(event)
    ctx.block('no elicitation in automated sessions')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('no elicitation in automated sessions')
  })
})
