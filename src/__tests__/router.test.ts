import { matchMatcher, getMatcherValue } from '../router'

describe('matchMatcher', () => {
  test('* matches everything', () => {
    expect(matchMatcher('Bash', '*')).toBe(true)
    expect(matchMatcher('Edit', '*')).toBe(true)
    expect(matchMatcher('', '*')).toBe(true)
  })

  test('empty matcher matches everything', () => {
    expect(matchMatcher('Bash', '')).toBe(true)
  })

  test('exact string match', () => {
    expect(matchMatcher('Bash', 'Bash')).toBe(true)
    expect(matchMatcher('Edit', 'Bash')).toBe(false)
  })

  test('pipe-separated OR list', () => {
    expect(matchMatcher('Edit', 'Edit|Write')).toBe(true)
    expect(matchMatcher('Write', 'Edit|Write')).toBe(true)
    expect(matchMatcher('Bash', 'Edit|Write')).toBe(false)
  })

  test('regex pattern', () => {
    expect(matchMatcher('mcp__memory__store', 'mcp__.*')).toBe(true)
    expect(matchMatcher('Bash', 'mcp__.*')).toBe(false)
    expect(matchMatcher('mcp__fs__read', 'mcp__fs__.*')).toBe(true)
  })

  test('invalid regex falls back to false', () => {
    expect(matchMatcher('Bash', '[')).toBe(false)
  })
})

describe('getMatcherValue', () => {
  test('returns tool_name for tool events', () => {
    expect(getMatcherValue({ hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBe('Bash')
    expect(getMatcherValue({ hook_event_name: 'PostToolUse', tool_name: 'Edit' })).toBe('Edit')
  })

  test('returns notification_type for Notification', () => {
    expect(getMatcherValue({ hook_event_name: 'Notification', notification_type: 'permission_prompt' })).toBe('permission_prompt')
  })

  test('returns basename for FileChanged', () => {
    expect(getMatcherValue({ hook_event_name: 'FileChanged', file_path: '/project/.env' })).toBe('.env')
    expect(getMatcherValue({ hook_event_name: 'FileChanged', file_path: '.envrc' })).toBe('.envrc')
  })

  test('returns basename for FileChanged on Windows-style paths', () => {
    expect(getMatcherValue({ hook_event_name: 'FileChanged', file_path: 'C:\\Users\\foo\\project\\.env' })).toBe('.env')
    expect(getMatcherValue({ hook_event_name: 'FileChanged', file_path: 'C:\\Users\\foo\\project\\src\\index.ts' })).toBe('index.ts')
  })

  test('returns empty string for events without a matcher value', () => {
    expect(getMatcherValue({ hook_event_name: 'SessionEnd' })).toBe('')
  })

  test('returns source for SessionStart', () => {
    expect(getMatcherValue({ hook_event_name: 'SessionStart', source: 'startup' })).toBe('startup')
    expect(getMatcherValue({ hook_event_name: 'SessionStart', source: 'resume' })).toBe('resume')
    expect(getMatcherValue({ hook_event_name: 'SessionStart' })).toBe('')
  })

  test('returns command_name for UserPromptExpansion', () => {
    expect(getMatcherValue({ hook_event_name: 'UserPromptExpansion', command_name: 'my-command' })).toBe('my-command')
    expect(getMatcherValue({ hook_event_name: 'UserPromptExpansion' })).toBe('')
  })

  test('returns load_reason for InstructionsLoaded', () => {
    expect(getMatcherValue({ hook_event_name: 'InstructionsLoaded', load_reason: 'session_start' })).toBe('session_start')
    expect(getMatcherValue({ hook_event_name: 'InstructionsLoaded' })).toBe('')
  })

  test('returns agent_type for SubagentStart and SubagentStop', () => {
    expect(getMatcherValue({ hook_event_name: 'SubagentStart', agent_type: 'Explore' })).toBe('Explore')
    expect(getMatcherValue({ hook_event_name: 'SubagentStop', agent_type: 'Plan' })).toBe('Plan')
    expect(getMatcherValue({ hook_event_name: 'SubagentStart' })).toBe('')
  })

  test('returns reason for SessionEnd', () => {
    expect(getMatcherValue({ hook_event_name: 'SessionEnd', reason: 'logout' })).toBe('logout')
    expect(getMatcherValue({ hook_event_name: 'SessionEnd', reason: 'clear' })).toBe('clear')
    expect(getMatcherValue({ hook_event_name: 'SessionEnd' })).toBe('')
  })

  test('returns source for ConfigChange', () => {
    expect(getMatcherValue({ hook_event_name: 'ConfigChange', source: 'user_settings' })).toBe('user_settings')
    expect(getMatcherValue({ hook_event_name: 'ConfigChange', source: 'policy_settings' })).toBe('policy_settings')
    expect(getMatcherValue({ hook_event_name: 'ConfigChange' })).toBe('')
  })

  test('returns trigger for PreCompact', () => {
    expect(getMatcherValue({ hook_event_name: 'PreCompact', trigger: 'manual' })).toBe('manual')
    expect(getMatcherValue({ hook_event_name: 'PreCompact', trigger: 'auto' })).toBe('auto')
    expect(getMatcherValue({ hook_event_name: 'PreCompact' })).toBe('')
  })

  test('returns trigger for Setup', () => {
    expect(getMatcherValue({ hook_event_name: 'Setup', trigger: 'init' })).toBe('init')
    expect(getMatcherValue({ hook_event_name: 'Setup', trigger: 'maintenance' })).toBe('maintenance')
    expect(getMatcherValue({ hook_event_name: 'Setup' })).toBe('')
  })

  test('returns source for DirectoryAdded', () => {
    expect(getMatcherValue({ hook_event_name: 'DirectoryAdded', source: 'slash_command' })).toBe('slash_command')
    expect(getMatcherValue({ hook_event_name: 'DirectoryAdded', source: 'register_repo_root' })).toBe('register_repo_root')
    expect(getMatcherValue({ hook_event_name: 'DirectoryAdded' })).toBe('')
  })

  test('returns empty string for MessageDisplay (no natural discriminant)', () => {
    expect(getMatcherValue({ hook_event_name: 'MessageDisplay', turn_id: 't1', message_id: 'm1' })).toBe('')
  })
})
