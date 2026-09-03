import * as fs from 'fs'
import type {
  AnyEvent,
  PreToolUseEvent,
  PostToolUseEvent,
  PostToolUseFailureEvent,
  PostToolBatchEvent,
  PostToolBatchToolCall,
  UserPromptSubmitEvent,
  UserPromptExpansionEvent,
  SessionStartEvent,
  SessionEndEvent,
  StopEvent,
  StopFailureEvent,
  SubagentStartEvent,
  SubagentStopEvent,
  FileChangedEvent,
  CwdChangedEvent,
  ConfigChangeEvent,
  TeammateIdleEvent,
  PreCompactEvent,
  PostCompactEvent,
  ElicitationEvent,
  ElicitationResultEvent,
  NotificationEvent,
  InstructionsLoadedEvent,
  SetupEvent,
  DirectoryAddedEvent,
  MessageDisplayEvent,
  PreModelSwitchEvent,
  PostModelSwitchEvent,
  TaskCreatedEvent,
  TaskCompletedEvent,
  WorktreeCreateEvent,
  WorktreeRemoveEvent,
  HookOutput,
  HookEventName,
  ToolInput,
  PermissionSuggestion,
} from './types.js'

export class BaseContext {
  readonly event: AnyEvent
  protected _output: HookOutput = {}
  protected _blocked = false
  protected _blockReason = ''

  constructor(event: AnyEvent) {
    this.event = event
  }

  get sessionId(): string { return this.event.session_id }
  get cwd(): string { return this.event.cwd }
  get hookEventName(): HookEventName { return this.event.hook_event_name }
  get promptId(): string | undefined { return this.event.prompt_id }
  get effort(): { level: string } | undefined { return this.event.effort }

  suppress(): void {
    this._output.suppressOutput = true
  }

  _isBlocked(): boolean { return this._blocked }
  _getBlockReason(): string { return this._blockReason }
  _getOutput(): HookOutput { return this._output }
}

export class PreToolUseContext<T extends ToolInput = ToolInput> extends BaseContext {
  declare readonly event: PreToolUseEvent

  constructor(event: PreToolUseEvent) { super(event) }

  get toolName(): string { return this.event.tool_name }
  get input(): T { return this.event.tool_input as T }
  get permissionSuggestions(): PermissionSuggestion[] | undefined {
    return (this.event as unknown as { permission_suggestions?: PermissionSuggestion[] }).permission_suggestions
  }

  get reason(): string | undefined {
    return (this.event as unknown as { reason?: string }).reason
  }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }

  allow(): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: this.event.hook_event_name,
      permissionDecision: 'allow',
    }
  }

  modify(newInput: Record<string, unknown>): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: this.event.hook_event_name,
      updatedInput: newInput,
    }
  }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: this.event.hook_event_name,
      additionalContext: text,
    }
  }

  retry(): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: this.event.hook_event_name,
      retry: true,
    }
  }
}

export class PostToolUseContext<T extends ToolInput = ToolInput> extends BaseContext {
  declare readonly event: PostToolUseEvent | PostToolUseFailureEvent

  constructor(event: PostToolUseEvent | PostToolUseFailureEvent) { super(event) }

  get toolName(): string { return this.event.tool_name }
  get input(): T { return this.event.tool_input as T }
  get output(): unknown { return 'tool_response' in this.event ? this.event.tool_response : undefined }
  get error(): string | undefined { return 'error' in this.event ? this.event.error : undefined }
  get durationMs(): number | undefined { return this.event.duration_ms }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: this.event.hook_event_name,
      additionalContext: text,
    }
  }
}

export class UserPromptSubmitContext extends BaseContext {
  declare readonly event: UserPromptSubmitEvent

  constructor(event: UserPromptSubmitEvent) { super(event) }

  get prompt(): string { return this.event.prompt }
  get source(): 'user' | 'sdk' | 'system' | 'loop_wakeup' | 'schedule_wakeup' | 'poll_event' | undefined { return this.event.source }
  get sessionTitle(): string | undefined { return this.event.session_title }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'UserPromptSubmit',
      additionalContext: text,
    }
  }

  setTitle(title: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'UserPromptSubmit',
      sessionTitle: title,
    }
  }

  suppressOriginalPrompt(): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'UserPromptSubmit',
      suppressOriginalPrompt: true,
    }
  }
}

export class UserPromptExpansionContext extends BaseContext {
  declare readonly event: UserPromptExpansionEvent

  constructor(event: UserPromptExpansionEvent) { super(event) }

  get expansionType(): 'slash_command' | 'mcp_prompt' { return this.event.expansion_type }
  get commandName(): string { return this.event.command_name }
  get commandArgs(): string { return this.event.command_args }
  get commandSource(): string | undefined { return this.event.command_source }
  get prompt(): string { return this.event.prompt }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'UserPromptExpansion',
      additionalContext: text,
    }
  }

  setTitle(title: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'UserPromptExpansion',
      sessionTitle: title,
    }
  }

  suppressOriginalPrompt(): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'UserPromptExpansion',
      suppressOriginalPrompt: true,
    }
  }
}

export class StopContext extends BaseContext {
  declare readonly event: StopEvent | SubagentStopEvent

  constructor(event: StopEvent | SubagentStopEvent) { super(event) }

  get lastAssistantMessage(): string | undefined { return this.event.last_assistant_message }
  get agentId(): string | undefined { return (this.event as unknown as { agent_id?: string }).agent_id }
  get agentType(): string | undefined { return (this.event as unknown as { agent_type?: string }).agent_type }
  get agentTranscriptPath(): string | undefined {
    return (this.event as unknown as { agent_transcript_path?: string }).agent_transcript_path
  }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class SessionStartContext extends BaseContext {
  declare readonly event: SessionStartEvent

  constructor(event: SessionStartEvent) { super(event) }

  get source(): 'startup' | 'resume' | 'clear' | 'compact' | 'fork' { return this.event.source }
  get model(): string | undefined { return this.event.model }
  get sessionTitle(): string | undefined { return this.event.session_title }
  get secondsSinceLastResponse(): number | undefined { return this.event.seconds_since_last_response }
  get contextTokens(): number | undefined { return this.event.context_tokens }
  get promptCacheLikelyExpired(): boolean | undefined { return this.event.prompt_cache_likely_expired }
  get estimatedCacheWriteUsd(): number | undefined { return this.event.estimated_cache_write_usd }

  setEnv(key: string, value: string): void {
    const envFile = process.env['CLAUDE_ENV_FILE']
    if (envFile) {
      fs.appendFileSync(envFile, `export ${key}=${value}\n`)
    }
  }
}

export class FileChangedContext extends BaseContext {
  declare readonly event: FileChangedEvent

  constructor(event: FileChangedEvent) { super(event) }

  get filePath(): string { return this.event.file_path }
  get changeType(): 'change' | 'add' | 'unlink' { return this.event.event }

  setEnv(key: string, value: string): void {
    const envFile = process.env['CLAUDE_ENV_FILE']
    if (envFile) {
      fs.appendFileSync(envFile, `export ${key}=${value}\n`)
    }
  }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class CwdChangedContext extends BaseContext {
  declare readonly event: CwdChangedEvent

  constructor(event: CwdChangedEvent) { super(event) }

  get oldCwd(): string { return this.event.old_cwd }
  get newCwd(): string { return this.event.new_cwd }

  setEnv(key: string, value: string): void {
    const envFile = process.env['CLAUDE_ENV_FILE']
    if (envFile) {
      fs.appendFileSync(envFile, `export ${key}=${value}\n`)
    }
  }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class ElicitationContext extends BaseContext {
  declare readonly event: ElicitationEvent

  constructor(event: ElicitationEvent) { super(event) }

  get mcpServerName(): string { return this.event.mcp_server_name }
  get message(): string { return this.event.message }
  get mode(): 'form' | 'url' | undefined { return this.event.mode }
  get url(): string | undefined { return this.event.url }
  get elicitationId(): string | undefined { return this.event.elicitation_id }
  get requestedSchema(): Record<string, unknown> | undefined { return this.event.requested_schema }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class StopFailureContext extends BaseContext {
  declare readonly event: StopFailureEvent

  constructor(event: StopFailureEvent) { super(event) }

  get error(): string { return this.event.error }
}

export class ElicitationResultContext extends BaseContext {
  declare readonly event: ElicitationResultEvent

  constructor(event: ElicitationResultEvent) { super(event) }

  get mcpServerName(): string { return this.event.mcp_server_name }
  get elicitationId(): string | undefined { return this.event.elicitation_id }
  get mode(): 'form' | 'url' | undefined { return this.event.mode }
  get action(): 'accept' | 'decline' | 'cancel' { return this.event.action }
  get content(): Record<string, unknown> | undefined { return this.event.content }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class NotificationContext extends BaseContext {
  declare readonly event: NotificationEvent

  constructor(event: NotificationEvent) { super(event) }

  get notificationType(): string { return this.event.notification_type }
  get message(): string { return this.event.message }
}

export class InstructionsLoadedContext extends BaseContext {
  declare readonly event: InstructionsLoadedEvent

  constructor(event: InstructionsLoadedEvent) { super(event) }

  get filePath(): string { return this.event.file_path }
  get memoryType(): 'User' | 'Project' | 'Local' | 'Managed' { return this.event.memory_type }
  get loadReason(): 'session_start' | 'nested_traversal' | 'path_glob_match' | 'include' | 'compact' { return this.event.load_reason }
  get globs(): string[] | undefined { return this.event.globs }
  get triggerFilePath(): string | undefined { return this.event.trigger_file_path }
  get parentFilePath(): string | undefined { return this.event.parent_file_path }
}

export class SetupContext extends BaseContext {
  declare readonly event: SetupEvent

  constructor(event: SetupEvent) { super(event) }

  get trigger(): 'init' | 'maintenance' { return this.event.trigger }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'Setup',
      additionalContext: text,
    }
  }
}

export class DirectoryAddedContext extends BaseContext {
  declare readonly event: DirectoryAddedEvent

  constructor(event: DirectoryAddedEvent) { super(event) }

  get directory(): string { return this.event.directory }
  get source(): 'slash_command' | 'register_repo_root' { return this.event.source }
}

export class MessageDisplayContext extends BaseContext {
  declare readonly event: MessageDisplayEvent

  constructor(event: MessageDisplayEvent) { super(event) }

  get turnId(): string { return this.event.turn_id }
  get messageId(): string { return this.event.message_id }
  get index(): number { return this.event.index }
  get final(): boolean { return this.event.final }
  get delta(): string { return this.event.delta }

  setDisplayContent(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'MessageDisplay',
      displayContent: text,
    }
  }
}

export class PreModelSwitchContext extends BaseContext {
  declare readonly event: PreModelSwitchEvent

  constructor(event: PreModelSwitchEvent) { super(event) }

  get fromModel(): string { return this.event.from_model }
  get toModel(): string { return this.event.to_model }
  get requestedModel(): string | null { return this.event.requested_model }
  get source(): 'command' | 'picker' | 'sdk' { return this.event.source }
  get contextTokens(): number { return this.event.context_tokens }
  get promptCacheWarm(): boolean { return this.event.prompt_cache_warm }
  get cacheTtl(): '5m' | '1h' { return this.event.cache_ttl }
  get estimatedCacheWriteUsd(): number { return this.event.estimated_cache_write_usd }
  get pricing(): 'configured' | 'catalog' | 'default' { return this.event.pricing }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }

  allow(): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'PreModelSwitch',
      permissionDecision: 'allow',
    }
  }
}

export class PostModelSwitchContext extends BaseContext {
  declare readonly event: PostModelSwitchEvent

  constructor(event: PostModelSwitchEvent) { super(event) }

  get fromModel(): string { return this.event.from_model }
  get toModel(): string { return this.event.to_model }
  get requestedModel(): string | null { return this.event.requested_model }
  get source(): 'command' | 'picker' | 'sdk' | 'auto' | 'resume' { return this.event.source }
  get contextTokens(): number { return this.event.context_tokens }
  get promptCacheWarm(): boolean { return this.event.prompt_cache_warm }
  get cacheTtl(): '5m' | '1h' { return this.event.cache_ttl }
  get estimatedCacheWriteUsd(): number { return this.event.estimated_cache_write_usd }
  get pricing(): 'configured' | 'catalog' | 'default' { return this.event.pricing }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'PostModelSwitch',
      additionalContext: text,
    }
  }
}

export class TaskCreatedContext extends BaseContext {
  declare readonly event: TaskCreatedEvent

  constructor(event: TaskCreatedEvent) { super(event) }

  get taskId(): string { return this.event.task_id }
  get taskSubject(): string { return this.event.task_subject }
  get taskDescription(): string | undefined { return this.event.task_description }
  get teammateName(): string | undefined { return this.event.teammate_name }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class TaskCompletedContext extends BaseContext {
  declare readonly event: TaskCompletedEvent

  constructor(event: TaskCompletedEvent) { super(event) }

  get taskId(): string { return this.event.task_id }
  get taskSubject(): string { return this.event.task_subject }
  get taskDescription(): string | undefined { return this.event.task_description }
  get teammateName(): string | undefined { return this.event.teammate_name }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class WorktreeCreateContext extends BaseContext {
  declare readonly event: WorktreeCreateEvent

  constructor(event: WorktreeCreateEvent) { super(event) }

  get name(): string { return this.event.name }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class WorktreeRemoveContext extends BaseContext {
  declare readonly event: WorktreeRemoveEvent

  constructor(event: WorktreeRemoveEvent) { super(event) }

  get worktreePath(): string { return this.event.worktree_path }
}

export class SessionEndContext extends BaseContext {
  declare readonly event: SessionEndEvent

  constructor(event: SessionEndEvent) { super(event) }

  get reason(): string { return this.event.reason }
}

export class SubagentStartContext extends BaseContext {
  declare readonly event: SubagentStartEvent

  constructor(event: SubagentStartEvent) { super(event) }

  get agentId(): string { return this.event.agent_id }
  get agentType(): string { return this.event.agent_type }
}

export class ConfigChangeContext extends BaseContext {
  declare readonly event: ConfigChangeEvent

  constructor(event: ConfigChangeEvent) { super(event) }

  get source(): 'user_settings' | 'project_settings' | 'local_settings' | 'policy_settings' | 'skills' { return this.event.source }
  get filePath(): string | undefined { return this.event.file_path }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class TeammateIdleContext extends BaseContext {
  declare readonly event: TeammateIdleEvent

  constructor(event: TeammateIdleEvent) { super(event) }

  get teammateName(): string { return this.event.teammate_name }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class PreCompactContext extends BaseContext {
  declare readonly event: PreCompactEvent

  constructor(event: PreCompactEvent) { super(event) }

  get trigger(): 'manual' | 'auto' { return this.event.trigger }
  get customInstructions(): string | null { return this.event.custom_instructions }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class PostCompactContext extends BaseContext {
  declare readonly event: PostCompactEvent

  constructor(event: PostCompactEvent) { super(event) }

  get trigger(): 'manual' | 'auto' { return this.event.trigger }
  get compactSummary(): string { return this.event.compact_summary }
}

export class PostToolBatchContext extends BaseContext {
  declare readonly event: PostToolBatchEvent

  constructor(event: PostToolBatchEvent) { super(event) }

  get toolCalls(): PostToolBatchToolCall[] { return this.event.tool_calls }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class GenericContext extends BaseContext {
  constructor(event: AnyEvent) { super(event) }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}
