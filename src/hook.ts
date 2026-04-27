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
  SessionStartEvent,
  StopEvent,
  SubagentStopEvent,
  FileChangedEvent,
  CwdChangedEvent,
  ElicitationEvent,
} from './types.js'
import {
  BaseContext,
  PreToolUseContext,
  PostToolUseContext,
  UserPromptSubmitContext,
  StopContext,
  SessionStartContext,
  FileChangedContext,
  CwdChangedContext,
  ElicitationContext,
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
    case 'UserPromptExpansion':
      return new UserPromptSubmitContext(event as UserPromptSubmitEvent)
    case 'Stop':
    case 'StopFailure':
    case 'SubagentStop':
      return new StopContext(event as StopEvent | SubagentStopEvent)
    case 'SessionStart':
      return new SessionStartContext(event as SessionStartEvent)
    case 'FileChanged':
      return new FileChangedContext(event as FileChangedEvent)
    case 'CwdChanged':
      return new CwdChangedContext(event as CwdChangedEvent)
    case 'Elicitation':
      return new ElicitationContext(event as ElicitationEvent)
    default:
      return new GenericContext(event)
  }
}

export class HookHandler {
  private registrations: Registration[] = []

  on(eventName: 'PreToolUse', matcher: string, handler: Handler<PreToolUseContext>): this
  on(eventName: 'PostToolUse' | 'PostToolUseFailure', matcher: string, handler: Handler<PostToolUseContext>): this
  on(eventName: 'UserPromptSubmit' | 'UserPromptExpansion', matcher: string, handler: Handler<UserPromptSubmitContext>): this
  on(eventName: 'Stop' | 'SubagentStop', matcher: string, handler: Handler<StopContext>): this
  on(eventName: 'SessionStart', matcher: string, handler: Handler<SessionStartContext>): this
  on(eventName: 'FileChanged', matcher: string, handler: Handler<FileChangedContext>): this
  on(eventName: 'CwdChanged', matcher: string, handler: Handler<CwdChangedContext>): this
  on(eventName: 'Elicitation', matcher: string, handler: Handler<ElicitationContext>): this
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
