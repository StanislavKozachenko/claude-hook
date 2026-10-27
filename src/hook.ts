import * as fs from 'fs'
import type {
  AnyEvent,
  HookEventName,
  PreToolUseEvent,
  PostToolUseEvent,
  PostToolUseFailureEvent,
  PostToolBatchEvent,
  PermissionRequestEvent,
  PermissionDeniedEvent,
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
  TaskCreatedEvent,
  TaskCompletedEvent,
  WorktreeCreateEvent,
  WorktreeRemoveEvent,
  SetupEvent,
  DirectoryAddedEvent,
  MessageDisplayEvent,
  PreModelSwitchEvent,
  PostModelSwitchEvent,
  BashToolInput,
  EditToolInput,
  WriteToolInput,
  ReadToolInput,
  PowerShellToolInput,
  GlobToolInput,
  GrepToolInput,
  WebFetchToolInput,
  WebSearchToolInput,
  AgentToolInput,
} from './types.js'
import {
  BaseContext,
  PreToolUseContext,
  PermissionRequestContext,
  PostToolUseContext,
  PostToolBatchContext,
  UserPromptSubmitContext,
  UserPromptExpansionContext,
  StopContext,
  SessionStartContext,
  SessionEndContext,
  SubagentStartContext,
  FileChangedContext,
  CwdChangedContext,
  ConfigChangeContext,
  TeammateIdleContext,
  PreCompactContext,
  PostCompactContext,
  ElicitationContext,
  StopFailureContext,
  ElicitationResultContext,
  NotificationContext,
  InstructionsLoadedContext,
  TaskCreatedContext,
  TaskCompletedContext,
  WorktreeCreateContext,
  WorktreeRemoveContext,
  SetupContext,
  DirectoryAddedContext,
  MessageDisplayContext,
  PreModelSwitchContext,
  PostModelSwitchContext,
  GenericContext,
} from './context.js'
import { matchMatcher, getMatcherValue } from './router.js'

type Handler<T extends BaseContext> = (ctx: T) => void | Promise<void>

interface Registration {
  eventName: string
  matcher: string
  handler: Handler<BaseContext>
}

function createContext(event: AnyEvent): BaseContext {
  switch (event.hook_event_name) {
    case 'PreToolUse':
      return new PreToolUseContext(event as PreToolUseEvent)
    case 'PermissionRequest':
      return new PermissionRequestContext(event as PermissionRequestEvent)
    case 'PermissionDenied':
      return new PreToolUseContext(event as unknown as PreToolUseEvent)
    case 'PostToolUse':
    case 'PostToolUseFailure':
      return new PostToolUseContext(event as PostToolUseEvent | PostToolUseFailureEvent)
    case 'PostToolBatch':
      return new PostToolBatchContext(event as PostToolBatchEvent)
    case 'UserPromptSubmit':
      return new UserPromptSubmitContext(event as UserPromptSubmitEvent)
    case 'UserPromptExpansion':
      return new UserPromptExpansionContext(event as UserPromptExpansionEvent)
    case 'Stop':
    case 'SubagentStop':
      return new StopContext(event as StopEvent | SubagentStopEvent)
    case 'StopFailure':
      return new StopFailureContext(event as StopFailureEvent)
    case 'SubagentStart':
      return new SubagentStartContext(event as SubagentStartEvent)
    case 'SessionStart':
      return new SessionStartContext(event as SessionStartEvent)
    case 'SessionEnd':
      return new SessionEndContext(event as SessionEndEvent)
    case 'FileChanged':
      return new FileChangedContext(event as FileChangedEvent)
    case 'CwdChanged':
      return new CwdChangedContext(event as CwdChangedEvent)
    case 'ConfigChange':
      return new ConfigChangeContext(event as ConfigChangeEvent)
    case 'TeammateIdle':
      return new TeammateIdleContext(event as TeammateIdleEvent)
    case 'PreCompact':
      return new PreCompactContext(event as PreCompactEvent)
    case 'PostCompact':
      return new PostCompactContext(event as PostCompactEvent)
    case 'Elicitation':
      return new ElicitationContext(event as ElicitationEvent)
    case 'ElicitationResult':
      return new ElicitationResultContext(event as ElicitationResultEvent)
    case 'Notification':
      return new NotificationContext(event as NotificationEvent)
    case 'InstructionsLoaded':
      return new InstructionsLoadedContext(event as InstructionsLoadedEvent)
    case 'TaskCreated':
      return new TaskCreatedContext(event as TaskCreatedEvent)
    case 'TaskCompleted':
      return new TaskCompletedContext(event as TaskCompletedEvent)
    case 'WorktreeCreate':
      return new WorktreeCreateContext(event as WorktreeCreateEvent)
    case 'WorktreeRemove':
      return new WorktreeRemoveContext(event as WorktreeRemoveEvent)
    case 'Setup':
      return new SetupContext(event as SetupEvent)
    case 'DirectoryAdded':
      return new DirectoryAddedContext(event as DirectoryAddedEvent)
    case 'MessageDisplay':
      return new MessageDisplayContext(event as MessageDisplayEvent)
    case 'PreModelSwitch':
      return new PreModelSwitchContext(event as PreModelSwitchEvent)
    case 'PostModelSwitch':
      return new PostModelSwitchContext(event as PostModelSwitchEvent)
    default:
      return new GenericContext(event)
  }
}

export interface HookOptions {
  /**
   * What happens when a handler throws or stdin isn't valid JSON.
   * `'continue'` (default): exit 1 — a non-blocking error, the action goes ahead.
   * `'block'`: exit 2 — fail closed on events that can block (e.g. PreToolUse).
   */
  onFailure?: 'continue' | 'block'
}

export class HookHandler {
  private registrations: Registration[] = []
  private readonly onFailure: 'continue' | 'block'

  constructor(options: HookOptions = {}) {
    this.onFailure = options.onFailure ?? 'continue'
  }

  // Never prints accumulated output: with exit 1, valid JSON on stdout still applies
  // (an earlier handler's allow() would win), so failure must leave stdout empty
  private fail(message: string): never {
    process.stderr.write(`claude-hook: ${message}\n`)
    process.exit(this.onFailure === 'block' ? 2 : 1)
  }

  on(eventName: 'PreToolUse', matcher: 'Bash', handler: Handler<PreToolUseContext<BashToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Edit', handler: Handler<PreToolUseContext<EditToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Write', handler: Handler<PreToolUseContext<WriteToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Read', handler: Handler<PreToolUseContext<ReadToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'PowerShell', handler: Handler<PreToolUseContext<PowerShellToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Glob', handler: Handler<PreToolUseContext<GlobToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Grep', handler: Handler<PreToolUseContext<GrepToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'WebFetch', handler: Handler<PreToolUseContext<WebFetchToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'WebSearch', handler: Handler<PreToolUseContext<WebSearchToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Agent', handler: Handler<PreToolUseContext<AgentToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Bash', handler: Handler<PostToolUseContext<BashToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Edit', handler: Handler<PostToolUseContext<EditToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Write', handler: Handler<PostToolUseContext<WriteToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Read', handler: Handler<PostToolUseContext<ReadToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'PowerShell', handler: Handler<PostToolUseContext<PowerShellToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Glob', handler: Handler<PostToolUseContext<GlobToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Grep', handler: Handler<PostToolUseContext<GrepToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'WebFetch', handler: Handler<PostToolUseContext<WebFetchToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'WebSearch', handler: Handler<PostToolUseContext<WebSearchToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Agent', handler: Handler<PostToolUseContext<AgentToolInput>>): this
  on(eventName: 'PreToolUse' | 'PermissionDenied', matcher: string, handler: Handler<PreToolUseContext>): this
  on(eventName: 'PermissionRequest', matcher: string, handler: Handler<PermissionRequestContext>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: string, handler: Handler<PostToolUseContext>): this
  on(eventName: 'PostToolBatch', matcher: string, handler: Handler<PostToolBatchContext>): this
  on(eventName: 'UserPromptSubmit', matcher: string, handler: Handler<UserPromptSubmitContext>): this
  on(eventName: 'UserPromptExpansion', matcher: string, handler: Handler<UserPromptExpansionContext>): this
  on(eventName: 'Stop' | 'SubagentStop', matcher: string, handler: Handler<StopContext>): this
  on(eventName: 'SubagentStart', matcher: string, handler: Handler<SubagentStartContext>): this
  on(eventName: 'SessionStart', matcher: string, handler: Handler<SessionStartContext>): this
  on(eventName: 'SessionEnd', matcher: string, handler: Handler<SessionEndContext>): this
  on(eventName: 'FileChanged', matcher: string, handler: Handler<FileChangedContext>): this
  on(eventName: 'CwdChanged', matcher: string, handler: Handler<CwdChangedContext>): this
  on(eventName: 'ConfigChange', matcher: string, handler: Handler<ConfigChangeContext>): this
  on(eventName: 'TeammateIdle', matcher: string, handler: Handler<TeammateIdleContext>): this
  on(eventName: 'PreCompact', matcher: string, handler: Handler<PreCompactContext>): this
  on(eventName: 'PostCompact', matcher: string, handler: Handler<PostCompactContext>): this
  on(eventName: 'Elicitation', matcher: string, handler: Handler<ElicitationContext>): this
  on(eventName: 'ElicitationResult', matcher: string, handler: Handler<ElicitationResultContext>): this
  on(eventName: 'StopFailure', matcher: string, handler: Handler<StopFailureContext>): this
  on(eventName: 'Notification', matcher: string, handler: Handler<NotificationContext>): this
  on(eventName: 'InstructionsLoaded', matcher: string, handler: Handler<InstructionsLoadedContext>): this
  on(eventName: 'TaskCreated', matcher: string, handler: Handler<TaskCreatedContext>): this
  on(eventName: 'TaskCompleted', matcher: string, handler: Handler<TaskCompletedContext>): this
  on(eventName: 'WorktreeCreate', matcher: string, handler: Handler<WorktreeCreateContext>): this
  on(eventName: 'WorktreeRemove', matcher: string, handler: Handler<WorktreeRemoveContext>): this
  on(eventName: 'Setup', matcher: string, handler: Handler<SetupContext>): this
  on(eventName: 'DirectoryAdded', matcher: string, handler: Handler<DirectoryAddedContext>): this
  on(eventName: 'MessageDisplay', matcher: string, handler: Handler<MessageDisplayContext>): this
  on(eventName: 'PreModelSwitch', matcher: string, handler: Handler<PreModelSwitchContext>): this
  on(eventName: 'PostModelSwitch', matcher: string, handler: Handler<PostModelSwitchContext>): this
  on(eventName: HookEventName, matcher: string, handler: Handler<GenericContext>): this
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string, matcher: string, handler: (ctx: any) => void | Promise<void>): this {
    this.registrations.push({ eventName, matcher, handler })
    return this
  }

  async run(): Promise<void> {
    let raw: string
    try {
      raw = fs.readFileSync(0, 'utf8')
    } catch {
      process.exit(0)
    }

    let event: AnyEvent
    try {
      event = JSON.parse(raw) as AnyEvent
    } catch {
      this.fail('failed to parse stdin JSON')
    }

    const matcherValue = getMatcherValue(event as unknown as Record<string, unknown>)

    const matching = this.registrations.filter(
      (r) =>
        (r.eventName === event.hook_event_name || r.eventName === '*') &&
        matchMatcher(matcherValue, r.matcher, event.hook_event_name),
    )

    if (matching.length === 0) {
      process.exit(0)
    }

    const ctx = createContext(event)

    for (const reg of matching) {
      try {
        await reg.handler(ctx)
      } catch (err) {
        this.fail(`${event.hook_event_name} handler failed: ${err instanceof Error ? err.message : String(err)}`)
      }
      if (ctx._isBlocked()) break
    }

    if (ctx._isBlocked()) {
      process.stderr.write(ctx._getBlockReason() + '\n')
      process.exit(2)
    }

    const output = ctx._getOutput()
    const hasOutput = Object.keys(output).length > 0
    if (hasOutput) {
      process.stdout.write(JSON.stringify(output))
    }
    process.exit(0)
  }
}

export function createHook(options?: HookOptions): HookHandler {
  return new HookHandler(options)
}
