import { PreToolUseContext, UserPromptSubmitContext, UserPromptExpansionContext, PostToolUseContext, FileChangedContext, CwdChangedContext, ElicitationContext, SessionStartContext, SessionEndContext, SubagentStartContext, ConfigChangeContext, TeammateIdleContext, PreCompactContext, PostCompactContext, PostToolBatchContext, StopContext, StopFailureContext, ElicitationResultContext, NotificationContext, InstructionsLoadedContext, TaskCreatedContext, TaskCompletedContext, WorktreeCreateContext, WorktreeRemoveContext, SetupContext, DirectoryAddedContext, MessageDisplayContext, PreModelSwitchContext, PostModelSwitchContext, GenericContext } from '../context'
import type { PreToolUseEvent, PostToolUseEvent, PostToolUseFailureEvent, UserPromptSubmitEvent, UserPromptExpansionEvent, FileChangedEvent, CwdChangedEvent, ElicitationEvent, SessionStartEvent, SessionEndEvent, SubagentStartEvent, ConfigChangeEvent, TeammateIdleEvent, PreCompactEvent, PostCompactEvent, PostToolBatchEvent, PermissionRequestEvent, PermissionDeniedEvent, StopEvent, SubagentStopEvent, StopFailureEvent, ElicitationResultEvent, NotificationEvent, InstructionsLoadedEvent, TaskCreatedEvent, TaskCompletedEvent, WorktreeCreateEvent, WorktreeRemoveEvent, SetupEvent, DirectoryAddedEvent, MessageDisplayEvent, PreModelSwitchEvent, PostModelSwitchEvent } from '../types'

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

  test('effort accessor inherited from BaseContext', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    expect(ctx.effort).toBeUndefined()

    const withEffort = new PreToolUseContext({ ...preToolEvent, effort: { level: 'high' } })
    expect(withEffort.effort).toEqual({ level: 'high' })
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
      tool_use_id: 'toolu_1',
      reason: 'matched a deny rule',
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
      tool_use_id: 'toolu_1',
      reason: 'matched a deny rule',
    }
    const ctx = new PreToolUseContext(permissionDeniedEvent as unknown as PreToolUseEvent)

    ctx.retry()
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PermissionDenied')
    expect(ctx._getOutput().hookSpecificOutput?.retry).toBe(true)
  })

  test('reason accessor for PermissionDenied', () => {
    const permissionDeniedEvent: PermissionDeniedEvent = {
      ...baseEvent,
      hook_event_name: 'PermissionDenied',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /tmp/foo' },
      tool_use_id: 'toolu_1',
      reason: 'matched a deny rule',
    }
    const ctx = new PreToolUseContext(permissionDeniedEvent as unknown as PreToolUseEvent)
    expect(ctx.reason).toBe('matched a deny rule')
  })

  test('reason accessor is undefined for PreToolUse', () => {
    const ctx = new PreToolUseContext(preToolEvent)
    expect(ctx.reason).toBeUndefined()
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

  test('isInterrupt is undefined for PostToolUse', () => {
    const ctx = new PostToolUseContext(postToolEvent)
    expect(ctx.isInterrupt).toBeUndefined()
  })

  test('isInterrupt accessor for PostToolUseFailure', () => {
    const failureEvent: PostToolUseFailureEvent = {
      ...baseEvent,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: 'sleep 100' },
      error: 'interrupted by user',
      is_interrupt: true,
    }
    const ctx = new PostToolUseContext(failureEvent)
    expect(ctx.isInterrupt).toBe(true)
    expect(ctx.error).toBe('interrupted by user')
  })

  test('isInterrupt is undefined for PostToolUseFailure when omitted', () => {
    const failureEvent: PostToolUseFailureEvent = {
      ...baseEvent,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: 'ls /nonexistent' },
      error: 'no such file or directory',
    }
    const ctx = new PostToolUseContext(failureEvent)
    expect(ctx.isInterrupt).toBeUndefined()
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

  test('source and sessionTitle accessors', () => {
    const ctx = new UserPromptSubmitContext({ ...promptEvent, source: 'loop_wakeup', session_title: 'Nightly check' })
    expect(ctx.source).toBe('loop_wakeup')
    expect(ctx.sessionTitle).toBe('Nightly check')
  })

  test('source and sessionTitle are undefined when omitted', () => {
    const ctx = new UserPromptSubmitContext(promptEvent)
    expect(ctx.source).toBeUndefined()
    expect(ctx.sessionTitle).toBeUndefined()
  })

  test('suppressOriginalPrompt sets suppressOriginalPrompt in hookSpecificOutput', () => {
    const ctx = new UserPromptSubmitContext(promptEvent)
    ctx.suppressOriginalPrompt()
    expect(ctx._getOutput().hookSpecificOutput?.suppressOriginalPrompt).toBe(true)
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

  test('suppressOriginalPrompt sets suppressOriginalPrompt in hookSpecificOutput', () => {
    const ctx = new UserPromptExpansionContext(event)
    ctx.suppressOriginalPrompt()
    expect(ctx._getOutput().hookSpecificOutput?.suppressOriginalPrompt).toBe(true)
  })

  test('commandSource is undefined when omitted', () => {
    const { command_source, ...rest } = event
    const ctx = new UserPromptExpansionContext(rest as UserPromptExpansionEvent)
    expect(ctx.commandSource).toBeUndefined()
  })

  test('expansionType accepts mcp_prompt', () => {
    const ctx = new UserPromptExpansionContext({ ...event, expansion_type: 'mcp_prompt' })
    expect(ctx.expansionType).toBe('mcp_prompt')
  })
})

describe('FileChangedContext', () => {
  const event: FileChangedEvent = {
    ...baseEvent,
    hook_event_name: 'FileChanged',
    file_path: '/project/.env',
    event: 'change',
  }

  test('filePath accessor', () => {
    const ctx = new FileChangedContext(event)
    expect(ctx.filePath).toBe('/project/.env')
  })

  test('changeType accessor', () => {
    const ctx = new FileChangedContext(event)
    expect(ctx.changeType).toBe('change')
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
    agent_id: 'agent-1',
    agent_type: 'Explore',
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new SubagentStartContext(event)
    expect(ctx.hookEventName).toBe('SubagentStart')
  })

  test('agentId and agentType accessors', () => {
    const ctx = new SubagentStartContext(event)
    expect(ctx.agentId).toBe('agent-1')
    expect(ctx.agentType).toBe('Explore')
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

  test('filePath is undefined when omitted (e.g. source: skills)', () => {
    const skillsEvent: ConfigChangeEvent = {
      ...baseEvent,
      hook_event_name: 'ConfigChange',
      source: 'skills',
    }
    const ctx = new ConfigChangeContext(skillsEvent)
    expect(ctx.filePath).toBeUndefined()
    expect(ctx.source).toBe('skills')
  })
})

describe('TeammateIdleContext', () => {
  const event: TeammateIdleEvent = {
    ...baseEvent,
    hook_event_name: 'TeammateIdle',
    teammate_name: 'alice',
    team_name: 'team-1',
  }

  test('teammateName accessor', () => {
    const ctx = new TeammateIdleContext(event)
    expect(ctx.teammateName).toBe('alice')
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
    trigger: 'auto',
    custom_instructions: null,
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new PreCompactContext(event)
    expect(ctx.hookEventName).toBe('PreCompact')
  })

  test('trigger and customInstructions accessors', () => {
    const ctx = new PreCompactContext(event)
    expect(ctx.trigger).toBe('auto')
    expect(ctx.customInstructions).toBeNull()
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
    trigger: 'auto',
    compact_summary: 'Summarized the last 40 turns.',
  }

  test('hookEventName accessor inherited from BaseContext', () => {
    const ctx = new PostCompactContext(event)
    expect(ctx.hookEventName).toBe('PostCompact')
  })

  test('trigger and compactSummary accessors', () => {
    const ctx = new PostCompactContext(event)
    expect(ctx.trigger).toBe('auto')
    expect(ctx.compactSummary).toBe('Summarized the last 40 turns.')
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
    agent_id: 'agent-1',
    agent_type: 'Explore',
    agent_transcript_path: '/tmp/subagents/agent-1.jsonl',
  }

  test('lastAssistantMessage accessor for Stop', () => {
    const ctx = new StopContext(stopEvent)
    expect(ctx.lastAssistantMessage).toBe('Done.')
  })

  test('lastAssistantMessage accessor for SubagentStop', () => {
    const ctx = new StopContext(subagentStopEvent)
    expect(ctx.lastAssistantMessage).toBe('Subagent done.')
  })

  test('agentId, agentType, and agentTranscriptPath accessors for SubagentStop', () => {
    const ctx = new StopContext(subagentStopEvent)
    expect(ctx.agentId).toBe('agent-1')
    expect(ctx.agentType).toBe('Explore')
    expect(ctx.agentTranscriptPath).toBe('/tmp/subagents/agent-1.jsonl')
  })

  test('agentId, agentType, and agentTranscriptPath are undefined for Stop', () => {
    const ctx = new StopContext(stopEvent)
    expect(ctx.agentId).toBeUndefined()
    expect(ctx.agentType).toBeUndefined()
    expect(ctx.agentTranscriptPath).toBeUndefined()
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new StopContext(stopEvent)
    ctx.block('keep going')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('keep going')
  })

  test('backgroundTasks and sessionCrons accessors for Stop', () => {
    const eventWithTasks: StopEvent = {
      ...stopEvent,
      background_tasks: [
        { id: 'bg1', type: 'shell', status: 'running', description: 'npm run build', command: 'npm run build' },
      ],
      session_crons: [
        { id: 'cron1', schedule: '0 9 * * 1-5', recurring: true, prompt: 'daily check' },
      ],
    }
    const ctx = new StopContext(eventWithTasks)
    expect(ctx.backgroundTasks).toEqual([
      { id: 'bg1', type: 'shell', status: 'running', description: 'npm run build', command: 'npm run build' },
    ])
    expect(ctx.sessionCrons).toEqual([
      { id: 'cron1', schedule: '0 9 * * 1-5', recurring: true, prompt: 'daily check' },
    ])
  })

  test('backgroundTasks and sessionCrons are undefined when omitted', () => {
    const ctx = new StopContext(stopEvent)
    expect(ctx.backgroundTasks).toBeUndefined()
    expect(ctx.sessionCrons).toBeUndefined()
  })

  test('backgroundTasks and sessionCrons are undefined for SubagentStop', () => {
    const ctx = new StopContext(subagentStopEvent)
    expect(ctx.backgroundTasks).toBeUndefined()
    expect(ctx.sessionCrons).toBeUndefined()
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
    file_path: '/home/user/project/CLAUDE.md',
    memory_type: 'Project',
    load_reason: 'session_start',
    globs: ['**/CLAUDE.md'],
  }

  test('filePath, memoryType, and loadReason accessors', () => {
    const ctx = new InstructionsLoadedContext(event)
    expect(ctx.filePath).toBe('/home/user/project/CLAUDE.md')
    expect(ctx.memoryType).toBe('Project')
    expect(ctx.loadReason).toBe('session_start')
  })

  test('globs accessor', () => {
    const ctx = new InstructionsLoadedContext(event)
    expect(ctx.globs).toEqual(['**/CLAUDE.md'])
  })
})

describe('TaskCreatedContext', () => {
  const event: TaskCreatedEvent = {
    ...baseEvent,
    hook_event_name: 'TaskCreated',
    task_id: 'task-1',
    task_subject: 'Fix the bug',
    task_description: 'Null pointer in the parser',
    teammate_name: 'alice',
  }

  test('taskId, taskSubject, taskDescription, and teammateName accessors', () => {
    const ctx = new TaskCreatedContext(event)
    expect(ctx.taskId).toBe('task-1')
    expect(ctx.taskSubject).toBe('Fix the bug')
    expect(ctx.taskDescription).toBe('Null pointer in the parser')
    expect(ctx.teammateName).toBe('alice')
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
    task_subject: 'Fix the bug',
    task_description: 'Null pointer in the parser',
    teammate_name: 'alice',
  }

  test('taskId, taskSubject, taskDescription, and teammateName accessors', () => {
    const ctx = new TaskCompletedContext(event)
    expect(ctx.taskId).toBe('task-1')
    expect(ctx.taskSubject).toBe('Fix the bug')
    expect(ctx.taskDescription).toBe('Null pointer in the parser')
    expect(ctx.teammateName).toBe('alice')
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

describe('SetupContext', () => {
  const event: SetupEvent = {
    ...baseEvent,
    hook_event_name: 'Setup',
    trigger: 'init',
  }

  test('trigger accessor', () => {
    const ctx = new SetupContext(event)
    expect(ctx.trigger).toBe('init')
  })

  test('addContext sets additionalContext', () => {
    const ctx = new SetupContext(event)
    ctx.addContext('extra setup info')
    expect(ctx._getOutput().hookSpecificOutput?.additionalContext).toBe('extra setup info')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('Setup')
  })
})

describe('DirectoryAddedContext', () => {
  const event: DirectoryAddedEvent = {
    ...baseEvent,
    hook_event_name: 'DirectoryAdded',
    directory: '/home/user/other-project',
    source: 'slash_command',
  }

  test('directory and source accessors', () => {
    const ctx = new DirectoryAddedContext(event)
    expect(ctx.directory).toBe('/home/user/other-project')
    expect(ctx.source).toBe('slash_command')
  })
})

describe('MessageDisplayContext', () => {
  const event: MessageDisplayEvent = {
    ...baseEvent,
    hook_event_name: 'MessageDisplay',
    turn_id: 'turn1',
    message_id: 'msg1',
    index: 2,
    final: false,
    delta: 'some text\n',
  }

  test('accessors', () => {
    const ctx = new MessageDisplayContext(event)
    expect(ctx.turnId).toBe('turn1')
    expect(ctx.messageId).toBe('msg1')
    expect(ctx.index).toBe(2)
    expect(ctx.final).toBe(false)
    expect(ctx.delta).toBe('some text\n')
  })

  test('setDisplayContent sets displayContent in hookSpecificOutput', () => {
    const ctx = new MessageDisplayContext(event)
    ctx.setDisplayContent('rewritten text')
    expect(ctx._getOutput().hookSpecificOutput?.displayContent).toBe('rewritten text')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('MessageDisplay')
  })
})

describe('PreModelSwitchContext', () => {
  const event: PreModelSwitchEvent = {
    ...baseEvent,
    hook_event_name: 'PreModelSwitch',
    from_model: 'claude-sonnet-4-5',
    to_model: 'claude-opus-4-5',
    requested_model: 'opus',
    source: 'command',
    context_tokens: 12000,
    prompt_cache_warm: true,
    cache_ttl: '5m',
    estimated_cache_write_usd: 0.42,
    pricing: 'catalog',
  }

  test('accessors', () => {
    const ctx = new PreModelSwitchContext(event)
    expect(ctx.fromModel).toBe('claude-sonnet-4-5')
    expect(ctx.toModel).toBe('claude-opus-4-5')
    expect(ctx.requestedModel).toBe('opus')
    expect(ctx.source).toBe('command')
    expect(ctx.contextTokens).toBe(12000)
    expect(ctx.promptCacheWarm).toBe(true)
    expect(ctx.cacheTtl).toBe('5m')
    expect(ctx.estimatedCacheWriteUsd).toBe(0.42)
    expect(ctx.pricing).toBe('catalog')
  })

  test('block sets _blocked and _blockReason', () => {
    const ctx = new PreModelSwitchContext(event)
    ctx.block('avoid mid-task model switch')
    expect(ctx._isBlocked()).toBe(true)
    expect(ctx._getBlockReason()).toBe('avoid mid-task model switch')
  })

  test('allow sets permissionDecision', () => {
    const ctx = new PreModelSwitchContext(event)
    ctx.allow()
    expect(ctx._getOutput().hookSpecificOutput?.permissionDecision).toBe('allow')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PreModelSwitch')
  })
})

describe('PostModelSwitchContext', () => {
  const event: PostModelSwitchEvent = {
    ...baseEvent,
    hook_event_name: 'PostModelSwitch',
    from_model: 'claude-sonnet-4-5',
    to_model: 'claude-opus-4-5',
    requested_model: null,
    source: 'auto',
    context_tokens: 8000,
    prompt_cache_warm: false,
    cache_ttl: '1h',
    estimated_cache_write_usd: 0.9,
    pricing: 'default',
  }

  test('accessors', () => {
    const ctx = new PostModelSwitchContext(event)
    expect(ctx.fromModel).toBe('claude-sonnet-4-5')
    expect(ctx.toModel).toBe('claude-opus-4-5')
    expect(ctx.requestedModel).toBeNull()
    expect(ctx.source).toBe('auto')
    expect(ctx.contextTokens).toBe(8000)
    expect(ctx.promptCacheWarm).toBe(false)
    expect(ctx.cacheTtl).toBe('1h')
    expect(ctx.estimatedCacheWriteUsd).toBe(0.9)
    expect(ctx.pricing).toBe('default')
  })

  test('addContext sets additionalContext', () => {
    const ctx = new PostModelSwitchContext(event)
    ctx.addContext('now running on opus')
    expect(ctx._getOutput().hookSpecificOutput?.additionalContext).toBe('now running on opus')
    expect(ctx._getOutput().hookSpecificOutput?.hookEventName).toBe('PostModelSwitch')
  })
})

describe('SessionStartContext', () => {
  const event: SessionStartEvent = {
    ...baseEvent,
    hook_event_name: 'SessionStart',
    source: 'startup',
    model: 'claude-sonnet-5',
  }

  test('source and model accessors', () => {
    const ctx = new SessionStartContext(event)
    expect(ctx.source).toBe('startup')
    expect(ctx.model).toBe('claude-sonnet-5')
  })

  test('resume-only fields are undefined on startup', () => {
    const ctx = new SessionStartContext(event)
    expect(ctx.sessionTitle).toBeUndefined()
    expect(ctx.secondsSinceLastResponse).toBeUndefined()
    expect(ctx.contextTokens).toBeUndefined()
    expect(ctx.promptCacheLikelyExpired).toBeUndefined()
    expect(ctx.estimatedCacheWriteUsd).toBeUndefined()
  })

  test('resume-only fields populated on resume', () => {
    const resumeEvent: SessionStartEvent = {
      ...baseEvent,
      hook_event_name: 'SessionStart',
      source: 'resume',
      session_title: 'Fix login bug',
      seconds_since_last_response: 42,
      context_tokens: 15000,
      prompt_cache_likely_expired: true,
      estimated_cache_write_usd: 0.25,
    }
    const ctx = new SessionStartContext(resumeEvent)
    expect(ctx.sessionTitle).toBe('Fix login bug')
    expect(ctx.secondsSinceLastResponse).toBe(42)
    expect(ctx.contextTokens).toBe(15000)
    expect(ctx.promptCacheLikelyExpired).toBe(true)
    expect(ctx.estimatedCacheWriteUsd).toBe(0.25)
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
