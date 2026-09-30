// Mirrors Claude Code's own matcher rules:
// "*" or "" → match all
// letters/digits/_/-/space/,/| → exact string, or list separated by "|"/","
// FileChanged/StopFailure use a narrower exact-match set (letters/digits/_/| only) —
// hyphen, space, and comma push them onto the regex path instead
// anything else → JavaScript regex, unanchored
const NARROW_MATCHER_EVENTS = new Set(['FileChanged', 'StopFailure'])

export function matchMatcher(value: string, matcher: string, eventName?: string): boolean {
  if (!matcher || matcher === '*') return true
  const narrow = eventName !== undefined && NARROW_MATCHER_EVENTS.has(eventName)
  const exactPattern = narrow ? /^[a-zA-Z0-9_|]+$/ : /^[a-zA-Z0-9_\- ,|]+$/
  if (exactPattern.test(matcher)) {
    const separator = narrow ? /\|/ : /[|,]/
    return matcher
      .split(separator)
      .map((part) => part.trim())
      .some((part) => part === value)
  }
  try {
    return new RegExp(matcher).test(value)
  } catch {
    return false
  }
}

// Returns the value to match against for a given event
export function getMatcherValue(event: Record<string, unknown>): string {
  const name = event['hook_event_name'] as string
  // Tool events: match on tool_name
  if (
    name === 'PreToolUse' ||
    name === 'PostToolUse' ||
    name === 'PostToolUseFailure' ||
    name === 'PermissionRequest' ||
    name === 'PermissionDenied'
  ) {
    return (event['tool_name'] as string) ?? ''
  }
  // Notification: match on notification_type
  if (name === 'Notification') return (event['notification_type'] as string) ?? ''
  // StopFailure: match on error type
  if (name === 'StopFailure') return (event['error'] as string) ?? ''
  // SessionStart: match on session source (if present)
  if (name === 'SessionStart') return (event['source'] as string) ?? ''
  // UserPromptExpansion: match on command name
  if (name === 'UserPromptExpansion') return (event['command_name'] as string) ?? ''
  // InstructionsLoaded: match on load reason
  if (name === 'InstructionsLoaded') return (event['load_reason'] as string) ?? ''
  // SubagentStart/SubagentStop: match on agent type
  if (name === 'SubagentStart' || name === 'SubagentStop') return (event['agent_type'] as string) ?? ''
  // SessionEnd: match on end reason
  if (name === 'SessionEnd') return (event['reason'] as string) ?? ''
  // ConfigChange: match on config source
  if (name === 'ConfigChange') return (event['source'] as string) ?? ''
  // PreCompact/PostCompact: match on compaction trigger
  if (name === 'PreCompact' || name === 'PostCompact') return (event['trigger'] as string) ?? ''
  // Setup: match on trigger (init/maintenance)
  if (name === 'Setup') return (event['trigger'] as string) ?? ''
  // DirectoryAdded: match on how the directory was added
  if (name === 'DirectoryAdded') return (event['source'] as string) ?? ''
  // PreModelSwitch/PostModelSwitch: match on switch source
  if (name === 'PreModelSwitch' || name === 'PostModelSwitch') return (event['source'] as string) ?? ''
  // FileChanged: match on filename (basename), handling both POSIX and Windows separators
  if (name === 'FileChanged') {
    const filePath = (event['file_path'] as string) ?? ''
    return filePath.split(/[/\\]/).pop() ?? filePath
  }
  return ''
}
