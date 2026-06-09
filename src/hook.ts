import * as fs from 'fs'
import type {
  AnyEvent,
  HookEventName,
  PreToolUseEvent,
  PostToolUseEvent,
  PostToolUseFailureEvent,
  PermissionRequestEvent,
  PermissionDeniedEvent,
  UserPromptSubmitEvent,
  UserPromptExpansionEvent,
  SessionStartEvent,
  StopEvent,
  StopFailureEvent,
  SubagentStopEvent,
  FileChangedEvent,
  CwdChangedEvent,
  ElicitationEvent,
  ElicitationResultEvent,
  NotificationEvent,
  InstructionsLoadedEvent,
  TaskCreatedEvent,
  TaskCompletedEvent,
  WorktreeCreateEvent,
  WorktreeRemoveEvent,
  BashToolInput,
  EditToolInput,
  WriteToolInput,
  ReadToolInput,
} from './types.js'
import {
  BaseContext,
  PreToolUseContext,
  PostToolUseContext,
  UserPromptSubmitContext,
  UserPromptExpansionContext,
  StopContext,
  SessionStartContext,
  FileChangedContext,
  CwdChangedContext,
  ElicitationContext,
  StopFailureContext,
  ElicitationResultContext,
  NotificationContext,
  InstructionsLoadedContext,
  TaskCreatedContext,
  TaskCompletedContext,
  WorktreeCreateContext,
  WorktreeRemoveContext,
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
      return new PreToolUseContext(event as unknown as PreToolUseEvent)
    case 'PermissionDenied':
      return new PreToolUseContext(event as unknown as PreToolUseEvent)
    case 'PostToolUse':
    case 'PostToolUseFailure':
      return new PostToolUseContext(event as PostToolUseEvent | PostToolUseFailureEvent)
    case 'UserPromptSubmit':
      return new UserPromptSubmitContext(event as UserPromptSubmitEvent)
    case 'UserPromptExpansion':
      return new UserPromptExpansionContext(event as UserPromptExpansionEvent)
    case 'Stop':
    case 'SubagentStop':
      return new StopContext(event as StopEvent | SubagentStopEvent)
    case 'StopFailure':
      return new StopFailureContext(event as StopFailureEvent)
    case 'SessionStart':
      return new SessionStartContext(event as SessionStartEvent)
    case 'FileChanged':
      return new FileChangedContext(event as FileChangedEvent)
    case 'CwdChanged':
      return new CwdChangedContext(event as CwdChangedEvent)
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
    default:
      return new GenericContext(event)
  }
}

export class HookHandler {
  private registrations: Registration[] = []

  on(eventName: 'PreToolUse', matcher: 'Bash', handler: Handler<PreToolUseContext<BashToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Edit', handler: Handler<PreToolUseContext<EditToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Write', handler: Handler<PreToolUseContext<WriteToolInput>>): this
  on(eventName: 'PreToolUse', matcher: 'Read', handler: Handler<PreToolUseContext<ReadToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Bash', handler: Handler<PostToolUseContext<BashToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Edit', handler: Handler<PostToolUseContext<EditToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Write', handler: Handler<PostToolUseContext<WriteToolInput>>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: 'Read', handler: Handler<PostToolUseContext<ReadToolInput>>): this
  on(eventName: 'PreToolUse' | 'PermissionRequest' | 'PermissionDenied', matcher: string, handler: Handler<PreToolUseContext>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: string, handler: Handler<PostToolUseContext>): this
  on(eventName: 'UserPromptSubmit', matcher: string, handler: Handler<UserPromptSubmitContext>): this
  on(eventName: 'UserPromptExpansion', matcher: string, handler: Handler<UserPromptExpansionContext>): this
  on(eventName: 'Stop' | 'SubagentStop', matcher: string, handler: Handler<StopContext>): this
  on(eventName: 'SessionStart', matcher: string, handler: Handler<SessionStartContext>): this
  on(eventName: 'FileChanged', matcher: string, handler: Handler<FileChangedContext>): this
  on(eventName: 'CwdChanged', matcher: string, handler: Handler<CwdChangedContext>): this
  on(eventName: 'Elicitation', matcher: string, handler: Handler<ElicitationContext>): this
  on(eventName: 'ElicitationResult', matcher: string, handler: Handler<ElicitationResultContext>): this
  on(eventName: 'StopFailure', matcher: string, handler: Handler<StopFailureContext>): this
  on(eventName: 'Notification', matcher: string, handler: Handler<NotificationContext>): this
  on(eventName: 'InstructionsLoaded', matcher: string, handler: Handler<InstructionsLoadedContext>): this
  on(eventName: 'TaskCreated', matcher: string, handler: Handler<TaskCreatedContext>): this
  on(eventName: 'TaskCompleted', matcher: string, handler: Handler<TaskCompletedContext>): this
  on(eventName: 'WorktreeCreate', matcher: string, handler: Handler<WorktreeCreateContext>): this
  on(eventName: 'WorktreeRemove', matcher: string, handler: Handler<WorktreeRemoveContext>): this
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
      process.stderr.write('claude-hook: failed to parse stdin JSON\n')
      process.exit(1)
    }

    const matcherValue = getMatcherValue(event as unknown as Record<string, unknown>)

    const matching = this.registrations.filter(
      (r) =>
        (r.eventName === event.hook_event_name || r.eventName === '*') &&
        matchMatcher(matcherValue, r.matcher),
    )

    if (matching.length === 0) {
      process.exit(0)
    }

    const ctx = createContext(event)

    for (const reg of matching) {
      await reg.handler(ctx)
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

export function createHook(): HookHandler {
  return new HookHandler()
}
