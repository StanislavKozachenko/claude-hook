export type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PostToolBatch'
  | 'PermissionRequest'
  | 'PermissionDenied'
  | 'UserPromptSubmit'
  | 'UserPromptExpansion'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'StopFailure'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'TaskCreated'
  | 'TaskCompleted'
  | 'WorktreeCreate'
  | 'WorktreeRemove'
  | 'FileChanged'
  | 'CwdChanged'
  | 'ConfigChange'
  | 'TeammateIdle'
  | 'PreCompact'
  | 'PostCompact'
  | 'Elicitation'
  | 'ElicitationResult'
  | 'Notification'
  | 'InstructionsLoaded'

export interface BaseEvent {
  session_id: string
  transcript_path: string
  cwd: string
  permission_mode?: string
  hook_event_name: HookEventName
  agent_id?: string
  agent_type?: string
}

// Common tool inputs
export interface BashToolInput {
  command: string
  restart?: boolean
  description?: string
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
  duration_ms?: number
}

export interface PostToolUseFailureEvent extends BaseEvent {
  hook_event_name: 'PostToolUseFailure'
  tool_name: string
  tool_input: ToolInput
  tool_use_id: string
  error: string
  duration_ms?: number
}

export interface UserPromptSubmitEvent extends BaseEvent {
  hook_event_name: 'UserPromptSubmit'
  prompt: string
}

export interface UserPromptExpansionEvent extends BaseEvent {
  hook_event_name: 'UserPromptExpansion'
  expansion_type: string
  command_name: string
  command_args: string
  command_source: string
  prompt: string
}

export interface SessionStartEvent extends BaseEvent {
  hook_event_name: 'SessionStart'
  source?: string
  model?: string
}

export interface SessionEndEvent extends BaseEvent {
  hook_event_name: 'SessionEnd'
}

export interface StopEvent extends BaseEvent {
  hook_event_name: 'Stop'
  stop_hook_active: boolean
  last_assistant_message?: string
}

export interface StopFailureEvent extends BaseEvent {
  hook_event_name: 'StopFailure'
  error: string
}

export interface SubagentStopEvent extends BaseEvent {
  hook_event_name: 'SubagentStop'
  stop_hook_active: boolean
  last_assistant_message?: string
  agent_transcript_path?: string
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

export interface PermissionSuggestion {
  type: string
  mode?: string
  destination?: string
}

export interface PermissionRequestEvent extends BaseEvent {
  hook_event_name: 'PermissionRequest'
  tool_name: string
  tool_input: ToolInput
  tool_use_id?: string
  permission_suggestions?: PermissionSuggestion[]
}

export interface PermissionDeniedEvent extends BaseEvent {
  hook_event_name: 'PermissionDenied'
  tool_name: string
  tool_input: ToolInput
  tool_use_id?: string
}

export interface PostToolBatchEvent extends BaseEvent {
  hook_event_name: 'PostToolBatch'
}

export interface SubagentStartEvent extends BaseEvent {
  hook_event_name: 'SubagentStart'
}

export interface TaskCreatedEvent extends BaseEvent {
  hook_event_name: 'TaskCreated'
  task_id: string
  description: string
}

export interface TaskCompletedEvent extends BaseEvent {
  hook_event_name: 'TaskCompleted'
  task_id: string
  description: string
}

export interface WorktreeCreateEvent extends BaseEvent {
  hook_event_name: 'WorktreeCreate'
  worktree_path: string
}

export interface WorktreeRemoveEvent extends BaseEvent {
  hook_event_name: 'WorktreeRemove'
  worktree_path: string
}

export interface FileChangedEvent extends BaseEvent {
  hook_event_name: 'FileChanged'
  file_path: string
}

export interface CwdChangedEvent extends BaseEvent {
  hook_event_name: 'CwdChanged'
  old_cwd: string
  new_cwd: string
}

export interface ConfigChangeEvent extends BaseEvent {
  hook_event_name: 'ConfigChange'
}

export interface TeammateIdleEvent extends BaseEvent {
  hook_event_name: 'TeammateIdle'
  teammate_id: string
}

export interface PreCompactEvent extends BaseEvent {
  hook_event_name: 'PreCompact'
}

export interface PostCompactEvent extends BaseEvent {
  hook_event_name: 'PostCompact'
}

export interface ElicitationEvent extends BaseEvent {
  hook_event_name: 'Elicitation'
  prompt: string
}

export interface ElicitationResultEvent extends BaseEvent {
  hook_event_name: 'ElicitationResult'
  prompt: string
  result: string
}

export type AnyEvent =
  | PreToolUseEvent
  | PostToolUseEvent
  | PostToolUseFailureEvent
  | PostToolBatchEvent
  | PermissionRequestEvent
  | PermissionDeniedEvent
  | UserPromptSubmitEvent
  | UserPromptExpansionEvent
  | SessionStartEvent
  | SessionEndEvent
  | StopEvent
  | StopFailureEvent
  | SubagentStartEvent
  | SubagentStopEvent
  | TaskCreatedEvent
  | TaskCompletedEvent
  | WorktreeCreateEvent
  | WorktreeRemoveEvent
  | FileChangedEvent
  | CwdChangedEvent
  | ConfigChangeEvent
  | TeammateIdleEvent
  | PreCompactEvent
  | PostCompactEvent
  | ElicitationEvent
  | ElicitationResultEvent
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
