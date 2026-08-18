// Mirrors Claude Code's own matcher rules:
// "*" or "" → match all
// only [a-zA-Z0-9_|] → exact string or pipe-separated OR list
// anything else → JavaScript regex
export function matchMatcher(value: string, matcher: string): boolean {
  if (!matcher || matcher === '*') return true
  if (/^[a-zA-Z0-9_|]+$/.test(matcher)) {
    return matcher.split('|').some((part) => part === value)
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
  if (name === 'InstructionsLoaded') return (event['reason'] as string) ?? ''
  // SubagentStart/SubagentStop: match on agent type
  if (name === 'SubagentStart' || name === 'SubagentStop') return (event['agent_type'] as string) ?? ''
  // SessionEnd: match on end reason
  if (name === 'SessionEnd') return (event['reason'] as string) ?? ''
  // FileChanged: match on filename (basename), handling both POSIX and Windows separators
  if (name === 'FileChanged') {
    const filePath = (event['file_path'] as string) ?? ''
    return filePath.split(/[/\\]/).pop() ?? filePath
  }
  return ''
}
