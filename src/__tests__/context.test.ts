import { PreToolUseContext, UserPromptSubmitContext, UserPromptExpansionContext, PostToolUseContext, FileChangedContext, CwdChangedContext, ElicitationContext, SessionEndContext, SubagentStartContext, ConfigChangeContext, TeammateIdleContext, PreCompactContext, PostCompactContext, PostToolBatchContext, StopContext, StopFailureContext, ElicitationResultContext, NotificationContext, InstructionsLoadedContext, TaskCreatedContext, TaskCompletedContext, WorktreeCreateContext, WorktreeRemoveContext, GenericContext } from '../context'
import type { PreToolUseEvent, PostToolUseEvent, UserPromptSubmitEvent, UserPromptExpansionEvent, FileChangedEvent, CwdChangedEvent, ElicitationEvent, SessionEndEvent, SubagentStartEvent, ConfigChangeEvent, TeammateIdleEvent, PreCompactEvent, PostCompactEvent, PostToolBatchEvent, PermissionRequestEvent, PermissionDeniedEvent, StopEvent, SubagentStopEvent, StopFailureEvent, ElicitationResultEvent, NotificationEvent, InstructionsLoadedEvent, TaskCreatedEvent, TaskCompletedEvent, WorktreeCreateEvent, WorktreeRemoveEvent } from '../types'

const baseEvent = {
  session_id: 'sess1',
  transcript_path: '/tmp/t.jsonl',
  cwd: '/home/user',
  permission_mode: 'default',
  tool_use_id: 'tu1',
  prompt_id: 'prompt1',
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
  prompt: 'DROP TABLE users',
}

describe('PreToolUseContext', () => {
  test('block sets _blocked and _blockReason', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    ctx.block('too dangerous')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('too dangerous')
  })

  test('promptId accessor inherited from BaseContext', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    expect(ctx.promptId).toBe('prompt1')
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

  test('retry sets retry flag in hookSpecificOutput', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    ctx.retry()
    expect(ctx._getOutput().hookSpecificOutput?.retry).toBe(true)
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

  test('allow/modify/addContext report the actual event name for PermissionRequest', () => {
    const permissionRequestEvent: PermissionRequestEvent = {
      ...baseEvent,
      hook_event_name: 'PermissionRequest',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/foo' },
    }
    const ctx = new PreToolUseContext(permissionRequestEvent as unknown as PreToolUseEvent)

    ctx.allow()
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PermissionRequest')

    ctx.modify({ command: 'echo safe' })
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PermissionRequest')

    ctx.addContext('extra info')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PermissionRequest')
  })

  test('allow/modify/addContext report the actual event name for PermissionDenied', () => {
    const permissionDeniedEvent: PermissionDeniedEvent = {
      ...baseEvent,
      hook_event_name: 'PermissionDenied',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/foo' },
    }
    const ctx = new PreToolUseContext(permissionDeniedEvent as unknown as PreToolUseEvent)

    ctx.addContext('denied context')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PermissionDenied')
  })

  test('retry reports the actual event name for PermissionDenied', () => {
    const permissionDeniedEvent: PermissionDeniedEvent = {
      ...baseEvent,
      hook_event_name: 'PermissionDenied',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/foo' },
    }
    const ctx = new PreToolUseContext(permissionDeniedEvent as unknown as PreToolUseEvent)

    ctx.retry()
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PermissionDenied')
    expect(ctx._getOutput().hookSpecificOutput?.retry).toBe(true)
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

describe('UserPromptExpansionContext', () => {
  const event: UserPromptExpansionEvent = {
    ...baseEvent,
    hook_event_name: 'UserPromptExpansion',
    expansion_type: 'slash_command',
    command_name: 'test-expansion',
    command_args: '',
    command_source: 'projectSettings',
    prompt: '/test-expansion',
  }

  test('accessors return correct fields', () => {
    const ctx = new UserPromptExpansionContext(event)
    expect(ctx.expansionType).toBe('slash_command')
    expect(ctx.commandName).toBe('test-expansion')
    expect(ctx.commandArgs).toBe('')
    expect(ctx.commandSource).toBe('projectSettings')
    expect(ctx.prompt).toBe('/test-expansion')
  })

  test('block sets _blocked', () => {
    const ctx = new UserPromptExpansionContext(event)
    ctx.block('no slash commands')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('no slash commands')
  })

  test('addContext sets additionalContext with correct hookEventName', () => {
    const ctx = new UserPromptExpansionContext(event)
    ctx.addContext('extra info')
    expect(ctx._getOutput().hookSpecificOutput?.additionalContext).toBe('extra info')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('UserPromptExpansion')
  })

  test('setTitle sets sessionTitle', () => {
    const ctx = new UserPromptExpansionContext(event)
    ctx.setTitle('Slash Session')
    expect(ctx._getOutput().hookSpecificOutput?.sessionTitle).toBe('Slash Session')
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
    mcp_server_name: 'my-mcp-server',
    message: 'What is the answer?',
    mode: 'form',
    requested_schema: { type: 'object' },
  }

  test('mcpServerName and message accessors', () => {
    const ctx = new ElicitationContext(event)
    expect(ctx.mcpServerName).toBe('my-mcp-server')
    expect(ctx.message).toBe('What is the answer?')
  })

  test('mode and requestedSchema accessors', () => {
    const ctx = new ElicitationContext(event)
    expect(ctx.mode).toBe('form')
    expect(ctx.requestedSchema).toEqual({ type: 'object' })
  })

  test('block sets _blocked', () => {
    const ctx = new ElicitationContext(event)
    ctx.block('no elicitation in automated sessions')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('no elicitation in automated sessions')
  })
})

describe('SessionEndContext', () => {
  const event: SessionEndEvent = {
    ...baseEvent,
    hook_event_name: 'SessionEnd',
    reason: 'logout',
  }

  test('sessionId accessor inherited from BaseContext', () => {
    const ctx = new SessionEndContext(event)
    expect(ctx.sessionId).toBe('sess1')
  })

  test('reason accessor', () => {
    const ctx = new SessionEndContext(event)
    expect(ctx.reason).toBe('logout')
  })
})

describe('SubagentStartContext', () => {
  const event: SubagentStartEvent = {
    ...baseEvent,
    hook_event_name: 'SubagentStart',
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new SubagentStartContext(event)
    expect(ctx.hookEventName).toBe('SubagentStart')
  })
})

describe('ConfigChangeContext', () => {
  const event: ConfigChangeEvent = {
    ...baseEvent,
    hook_event_name: 'ConfigChange',
    source: 'user_settings',
    file_path: '/home/user/.claude/settings.json',
  }

  test('cwd accessor inherited from BaseContext', () => {
    const ctx = new ConfigChangeContext(event)
    expect(ctx.cwd).toBe('/home/user')
  })

  test('source accessor', () => {
    const ctx = new ConfigChangeContext(event)
    expect(ctx.source).toBe('user_settings')
  })

  test('filePath accessor', () => {
    const ctx = new ConfigChangeContext(event)
    expect(ctx.filePath).toBe('/home/user/.claude/settings.json')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new ConfigChangeContext(event)
    ctx.block('config changes not allowed')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('config changes not allowed')
  })
})

describe('TeammateIdleContext', () => {
  const event: TeammateIdleEvent = {
    ...baseEvent,
    hook_event_name: 'TeammateIdle',
    teammate_id: 'teammate-1',
  }

  test('teammateId accessor', () => {
    const ctx = new TeammateIdleContext(event)
    expect(ctx.teammateId).toBe('teammate-1')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new TeammateIdleContext(event)
    ctx.block('keep teammate active')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('keep teammate active')
  })
})

describe('PreCompactContext', () => {
  const event: PreCompactEvent = {
    ...baseEvent,
    hook_event_name: 'PreCompact',
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new PreCompactContext(event)
    expect(ctx.hookEventName).toBe('PreCompact')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new PreCompactContext(event)
    ctx.block('not now')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('not now')
  })
})

describe('PostCompactContext', () => {
  const event: PostCompactEvent = {
    ...baseEvent,
    hook_event_name: 'PostCompact',
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new PostCompactContext(event)
    expect(ctx.hookEventName).toBe('PostCompact')
  })
})

describe('PostToolBatchContext', () => {
  const event: PostToolBatchEvent = {
    ...baseEvent,
    hook_event_name: 'PostToolBatch',
    tool_calls: [
      { tool_name: 'Bash', tool_input: { command: 'echo hi' }, tool_response: 'hi', tool_use_id: 'toolu_1' },
      { tool_name: 'Read', tool_input: { file_path: '/tmp/a' }, tool_response: 'contents', tool_use_id: 'toolu_2' },
    ],
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new PostToolBatchContext(event)
    expect(ctx.hookEventName).toBe('PostToolBatch')
  })

  test('toolCalls accessor', () => {
    const ctx = new PostToolBatchContext(event)
    expect(ctx.toolCalls).toHaveLength(2)
    expect(ctx.toolCalls[0].tool_name).toBe('Bash')
    expect(ctx.toolCalls[1].tool_use_id).toBe('toolu_2')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new PostToolBatchContext(event)
    ctx.block('stop the loop')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('stop the loop')
  })
})

describe('StopContext', () => {
  const stopEvent: StopEvent = {
    ...baseEvent,
    hook_event_name: 'Stop',
    stop_hook_active: false,
    last_assistant_message: 'Done.',
  }

  const subagentStopEvent: SubagentStopEvent = {
    ...baseEvent,
    hook_event_name: 'SubagentStop',
    stop_hook_active: false,
    last_assistant_message: 'Subagent done.',
  }

  test('lastAssistantMessage accessor for Stop', () => {
    const ctx = new StopContext(stopEvent)
    expect(ctx.lastAssistantMessage).toBe('Done.')
  })

  test('lastAssistantMessage accessor for SubagentStop', () => {
    const ctx = new StopContext(subagentStopEvent)
    expect(ctx.lastAssistantMessage).toBe('Subagent done.')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new StopContext(stopEvent)
    ctx.block('keep going')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('keep going')
  })
})

describe('StopFailureContext', () => {
  const event: StopFailureEvent = {
    ...baseEvent,
    hook_event_name: 'StopFailure',
    error: 'stop hook crashed',
  }

  test('error accessor', () => {
    const ctx = new StopFailureContext(event)
    expect(ctx.error).toBe('stop hook crashed')
  })
})

describe('ElicitationResultContext', () => {
  const event: ElicitationResultEvent = {
    ...baseEvent,
    hook_event_name: 'ElicitationResult',
    mcp_server_name: 'figma',
    elicitation_id: 'elicit-1',
    mode: 'form',
    action: 'accept',
    content: { answer: '42' },
  }

  test('mcpServerName and action accessors', () => {
    const ctx = new ElicitationResultContext(event)
    expect(ctx.mcpServerName).toBe('figma')
    expect(ctx.action).toBe('accept')
  })

  test('elicitationId, mode, and content accessors', () => {
    const ctx = new ElicitationResultContext(event)
    expect(ctx.elicitationId).toBe('elicit-1')
    expect(ctx.mode).toBe('form')
    expect(ctx.content).toEqual({ answer: '42' })
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new ElicitationResultContext(event)
    ctx.block('decline the result')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('decline the result')
  })
})

describe('NotificationContext', () => {
  const event: NotificationEvent = {
    ...baseEvent,
    hook_event_name: 'Notification',
    notification_type: 'permission_prompt',
    message: 'Waiting for permission',
  }

  test('notificationType and message accessors', () => {
    const ctx = new NotificationContext(event)
    expect(ctx.notificationType).toBe('permission_prompt')
    expect(ctx.message).toBe('Waiting for permission')
  })
})

describe('InstructionsLoadedContext', () => {
  const event: InstructionsLoadedEvent = {
    ...baseEvent,
    hook_event_name: 'InstructionsLoaded',
    reason: 'startup',
    files: ['CLAUDE.md', '.claude/rules.md'],
  }

  test('reason and files accessors', () => {
    const ctx = new InstructionsLoadedContext(event)
    expect(ctx.reason).toBe('startup')
    expect(ctx.files).toEqual(['CLAUDE.md', '.claude/rules.md'])
  })
})

describe('TaskCreatedContext', () => {
  const event: TaskCreatedEvent = {
    ...baseEvent,
    hook_event_name: 'TaskCreated',
    task_id: 'task-1',
    description: 'Fix the bug',
  }

  test('taskId and description accessors', () => {
    const ctx = new TaskCreatedContext(event)
    expect(ctx.taskId).toBe('task-1')
    expect(ctx.description).toBe('Fix the bug')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new TaskCreatedContext(event)
    ctx.block('rollback task creation')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('rollback task creation')
  })
})

describe('TaskCompletedContext', () => {
  const event: TaskCompletedEvent = {
    ...baseEvent,
    hook_event_name: 'TaskCompleted',
    task_id: 'task-1',
    description: 'Fix the bug',
  }

  test('taskId and description accessors', () => {
    const ctx = new TaskCompletedContext(event)
    expect(ctx.taskId).toBe('task-1')
    expect(ctx.description).toBe('Fix the bug')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new TaskCompletedContext(event)
    ctx.block('not actually complete')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('not actually complete')
  })
})

describe('WorktreeCreateContext', () => {
  const event: WorktreeCreateEvent = {
    ...baseEvent,
    hook_event_name: 'WorktreeCreate',
    name: 'feature-x',
  }

  test('name accessor', () => {
    const ctx = new WorktreeCreateContext(event)
    expect(ctx.name).toBe('feature-x')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new WorktreeCreateContext(event)
    ctx.block('worktree creation failed')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('worktree creation failed')
  })
})

describe('WorktreeRemoveContext', () => {
  const event: WorktreeRemoveEvent = {
    ...baseEvent,
    hook_event_name: 'WorktreeRemove',
    worktree_path: '/home/user/.worktrees/feature-x',
  }

  test('worktreePath accessor', () => {
    const ctx = new WorktreeRemoveContext(event)
    expect(ctx.worktreePath).toBe('/home/user/.worktrees/feature-x')
  })
})

describe('GenericContext', () => {
  const event: ConfigChangeEvent = {
    ...baseEvent,
    hook_event_name: 'ConfigChange',
    source: 'user_settings',
    file_path: '/home/user/.claude/settings.json',
  }

  test('block sets _blocked and _blockReason', () => {
    const ctx = new GenericContext(event)
    ctx.block('no config changes allowed')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('no config changes allowed')
  })

  test('base accessors inherited from BaseContext', () => {
    const ctx = new GenericContext(event)
    expect(ctx.hookEventName).toBe('ConfigChange')
    expect(ctx.sessionId).toBe('sess1')
  })
})
