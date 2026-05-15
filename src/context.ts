import * as fs from 'fs'
import type {
  AnyEvent,
  PreToolUseEvent,
  PostToolUseEvent,
  PostToolUseFailureEvent,
  UserPromptSubmitEvent,
  UserPromptExpansionEvent,
  SessionStartEvent,
  StopEvent,
  SubagentStopEvent,
  FileChangedEvent,
  CwdChangedEvent,
  ElicitationEvent,
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

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }

  allow(): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    }
  }

  modify(newInput: Record<string, unknown>): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'PreToolUse',
      updatedInput: newInput,
    }
  }

  addContext(text: string): void {
    this._output.hookSpecificOutput = {
      ...this._output.hookSpecificOutput,
      hookEventName: 'PreToolUse',
      additionalContext: text,
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
}

export class UserPromptExpansionContext extends BaseContext {
  declare readonly event: UserPromptExpansionEvent

  constructor(event: UserPromptExpansionEvent) { super(event) }

  get expansion(): string { return this.event.expansion }

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
}

export class StopContext extends BaseContext {
  declare readonly event: StopEvent | SubagentStopEvent

  constructor(event: StopEvent | SubagentStopEvent) { super(event) }

  get lastAssistantMessage(): string | undefined { return this.event.last_assistant_message }

  block(reason: string): void {
    this._blocked = true
    this._blockReason = reason
  }
}

export class SessionStartContext extends BaseContext {
  declare readonly event: SessionStartEvent

  constructor(event: SessionStartEvent) { super(event) }

  get source(): string | undefined { return this.event.source }
  get model(): string | undefined { return this.event.model }

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

  get prompt(): string { return this.event.prompt }

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
