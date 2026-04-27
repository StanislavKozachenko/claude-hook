export type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'UserPromptSubmit'
  | 'UserPromptExpansion'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'StopFailure'
  | 'SubagentStop'
  | 'Notification'
  | 'InstructionsLoaded'
  | 'PermissionRequest'
  | 'PermissionDenied'

export interface BaseEvent {
  session_id: string
  transcript_path: string
  cwd: string
  permission_mode: string
  hook_event_name: HookEventName
  agent_id?: string
  agent_type?: string
}

// Common tool inputs
export interface BashToolInput {
  command: string
  restart?: boolean
}

export interface EditToolInput {
  file_path: string
  old_string: string
  new_string: string
  replace_all?: boolean
}

export interface WriteToolInput {
  file_path: string
  content: string
}

export interface ReadToolInput {
  file_path: string
  offset?: number
  limit?: number
}

export type ToolInput = BashToolInput | EditToolInput | WriteToolInput | ReadToolInput | Record<string, unknown>

// Events
export interface PreToolUseEvent extends BaseEvent {
  hook_event_name: 'PreToolUse'
  tool_name: string
  tool_input: ToolInput
  tool_use_id: string
}

export interface PostToolUseEvent extends BaseEvent {
  hook_event_name: 'PostToolUse'
  tool_name: string
  tool_input: ToolInput
  tool_use_id: string
  tool_response: unknown
}

export interface PostToolUseFailureEvent extends BaseEvent {
  hook_event_name: 'PostToolUseFailure'
  tool_name: string
  tool_input: ToolInput
  tool_use_id: string
  error: string
}

export interface UserPromptSubmitEvent extends BaseEvent {
  hook_event_name: 'UserPromptSubmit'
  user_message: string
}

export interface UserPromptExpansionEvent extends BaseEvent {
  hook_event_name: 'UserPromptExpansion'
  expansion: string
}

export interface SessionStartEvent extends BaseEvent {
  hook_event_name: 'SessionStart'
}

export interface SessionEndEvent extends BaseEvent {
  hook_event_name: 'SessionEnd'
}

export interface StopEvent extends BaseEvent {
  hook_event_name: 'Stop'
  stop_hook_active: boolean
}

export interface StopFailureEvent extends BaseEvent {
  hook_event_name: 'StopFailure'
  error: string
}

export interface SubagentStopEvent extends BaseEvent {
  hook_event_name: 'SubagentStop'
  stop_hook_active: boolean
}

export interface NotificationEvent extends BaseEvent {
  hook_event_name: 'Notification'
  notification_type: string
  message: string
}

export interface InstructionsLoadedEvent extends BaseEvent {
  hook_event_name: 'InstructionsLoaded'
  reason: string
  files: string[]
}

export type AnyEvent =
  | PreToolUseEvent
  | PostToolUseEvent
  | PostToolUseFailureEvent
  | UserPromptSubmitEvent
  | UserPromptExpansionEvent
  | SessionStartEvent
  | SessionEndEvent
  | StopEvent
  | StopFailureEvent
  | SubagentStopEvent
  | NotificationEvent
  | InstructionsLoadedEvent

// Output
export type PermissionDecision = 'allow' | 'deny' | 'ask' | 'defer'

export interface HookSpecificOutput {
  hookEventName: HookEventName
  permissionDecision?: PermissionDecision
  permissionDecisionReason?: string
  updatedInput?: Record<string, unknown>
  additionalContext?: string
  sessionTitle?: string
  updatedMCPToolOutput?: string
}

export interface HookOutput {
  continue?: boolean
  stopReason?: string
  suppressOutput?: boolean
  systemMessage?: string
  decision?: 'block'
  reason?: string
  hookSpecificOutput?: HookSpecificOutput
}
