import { matchMatcher, getMatcherValue, ignoresMatcher, canonicalModelName } from '../router'

describe('ignoresMatcher', () => {
  test('true for events Claude Code runs regardless of matcher', () => {
    for (const name of ['UserPromptSubmit', 'PostToolBatch', 'Stop', 'TeammateIdle', 'TaskCreated', 'TaskCompleted', 'WorktreeCreate', 'WorktreeRemove', 'MessageDisplay', 'CwdChanged']) {
      expect(ignoresMatcher({ hook_event_name: name })).toBe(true)
    }
  })

  test('false for events with a matcher field', () => {
    for (const name of ['PreToolUse', 'SessionStart', 'SubagentStop', 'Elicitation', 'FileChanged', 'Notification']) {
      expect(ignoresMatcher({ hook_event_name: name })).toBe(false)
    }
  })

  test('true for a model switch whose target has no canonical name', () => {
    expect(ignoresMatcher({ hook_event_name: 'PreModelSwitch', to_model: 'my-gateway-model' })).toBe(true)
    expect(ignoresMatcher({ hook_event_name: 'PostModelSwitch', to_model: 'opus' })).toBe(true)
    expect(ignoresMatcher({ hook_event_name: 'PreModelSwitch', to_model: 'claude-opus-5[1m]' })).toBe(false)
  })
})

describe('canonicalModelName', () => {
  test('keeps a canonical name as is', () => {
    expect(canonicalModelName('claude-opus-5')).toBe('claude-opus-5')
    expect(canonicalModelName('claude-opus-4-6')).toBe('claude-opus-4-6')
  })

  test('drops the [1m] suffix and a date or -latest suffix', () => {
    expect(canonicalModelName('claude-opus-5[1m]')).toBe('claude-opus-5')
    expect(canonicalModelName('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5')
    expect(canonicalModelName('claude-sonnet-4-5-20250929[1m]')).toBe('claude-sonnet-4-5')
    expect(canonicalModelName('claude-3-5-haiku-latest')).toBe('claude-3-5-haiku')
  })

  test('resolves Bedrock IDs, inference profiles and ARNs', () => {
    expect(canonicalModelName('anthropic.claude-opus-4-1-20250805-v1:0')).toBe('claude-opus-4-1')
    expect(canonicalModelName('us.anthropic.claude-sonnet-4-5-20250929-v1:0')).toBe('claude-sonnet-4-5')
    expect(canonicalModelName('global.anthropic.claude-opus-5-v1')).toBe('claude-opus-5')
    expect(canonicalModelName('arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-opus-5-v1:0')).toBe('claude-opus-5')
  })

  test('resolves Vertex IDs', () => {
    expect(canonicalModelName('claude-opus-4-1@20250805')).toBe('claude-opus-4-1')
    expect(canonicalModelName('claude-opus-5@default')).toBe('claude-opus-5')
  })

  test('undefined for IDs that do not resolve to a claude-* name', () => {
    expect(canonicalModelName('my-gateway-model')).toBeUndefined()
    expect(canonicalModelName('opus')).toBeUndefined()
    expect(canonicalModelName('')).toBeUndefined()
  })
})

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

  test('comma-separated OR list (general events)', () => {
    expect(matchMatcher('Edit', 'Edit, Write')).toBe(true)
    expect(matchMatcher('Write', 'Edit, Write')).toBe(true)
    expect(matchMatcher('Bash', 'Edit, Write')).toBe(false)
    expect(matchMatcher('Edit', 'Edit,Write')).toBe(true)
  })

  test('hyphenated exact match (general events)', () => {
    expect(matchMatcher('code-reviewer', 'code-reviewer')).toBe(true)
    expect(matchMatcher('security-reviewer', 'code-reviewer')).toBe(false)
    // exact match, not substring: a naive unanchored regex would wrongly match this
    expect(matchMatcher('not-code-reviewer-elite', 'code-reviewer')).toBe(false)
  })

  test('space and mixed pipe/comma separators (general events)', () => {
    expect(matchMatcher('claude-opus-5', 'claude-opus-4-6|claude-opus-5')).toBe(true)
    expect(matchMatcher('general-purpose', 'general-purpose, Explore')).toBe(true)
    expect(matchMatcher('Explore', 'general-purpose, Explore')).toBe(true)
  })

  test('FileChanged/StopFailure use the narrower exact-match set: hyphen/space/comma push to regex', () => {
    // narrow class rejects '-', so 'a-b' as a matcher falls to regex evaluation for these events
    expect(matchMatcher('a-b', 'a-b', 'FileChanged')).toBe(true) // regex 'a-b' still matches the literal string
    expect(matchMatcher('xa-by', 'a-b', 'FileChanged')).toBe(true) // unanchored regex match, unlike exact-match
    expect(matchMatcher('.envrc', '.envrc|.env', 'FileChanged')).toBe(true)
    expect(matchMatcher('.env', '.envrc|.env', 'StopFailure')).toBe(true)
  })

  test('eventName omitted defaults to the general (wide) character class', () => {
    expect(matchMatcher('code-reviewer', 'code-reviewer')).toBe(true)
    expect(matchMatcher('Edit', 'Edit, Write')).toBe(true)
  })

  test('non-narrow events use the wide class even with a matching event name check', () => {
    expect(matchMatcher('code-reviewer', 'code-reviewer', 'SubagentStart')).toBe(true)
    expect(matchMatcher('not-code-reviewer-elite', 'code-reviewer', 'SubagentStart')).toBe(false)
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

  test('returns trigger for PostCompact', () => {
    expect(getMatcherValue({ hook_event_name: 'PostCompact', trigger: 'manual' })).toBe('manual')
    expect(getMatcherValue({ hook_event_name: 'PostCompact', trigger: 'auto' })).toBe('auto')
    expect(getMatcherValue({ hook_event_name: 'PostCompact' })).toBe('')
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

  test('returns mcp_server_name for Elicitation and ElicitationResult', () => {
    expect(getMatcherValue({ hook_event_name: 'Elicitation', mcp_server_name: 'my-server' })).toBe('my-server')
    expect(getMatcherValue({ hook_event_name: 'ElicitationResult', mcp_server_name: 'jira' })).toBe('jira')
    expect(getMatcherValue({ hook_event_name: 'Elicitation' })).toBe('')
  })

  test('returns empty string for MessageDisplay (no natural discriminant)', () => {
    expect(getMatcherValue({ hook_event_name: 'MessageDisplay', turn_id: 't1', message_id: 'm1' })).toBe('')
  })

  test('returns to_model for PreModelSwitch', () => {
    expect(getMatcherValue({ hook_event_name: 'PreModelSwitch', to_model: 'claude-opus-5', source: 'command' })).toBe('claude-opus-5')
    expect(getMatcherValue({ hook_event_name: 'PreModelSwitch', to_model: 'claude-sonnet-5', source: 'picker' })).toBe('claude-sonnet-5')
    expect(getMatcherValue({ hook_event_name: 'PreModelSwitch' })).toBe('')
  })

  test('returns to_model for PostModelSwitch', () => {
    expect(getMatcherValue({ hook_event_name: 'PostModelSwitch', to_model: 'claude-opus-5', source: 'auto' })).toBe('claude-opus-5')
    expect(getMatcherValue({ hook_event_name: 'PostModelSwitch', to_model: 'claude-sonnet-5', source: 'resume' })).toBe('claude-sonnet-5')
    expect(getMatcherValue({ hook_event_name: 'PostModelSwitch' })).toBe('')
  })

  test('returns the canonical model name for model switches', () => {
    expect(getMatcherValue({ hook_event_name: 'PreModelSwitch', to_model: 'claude-opus-5[1m]' })).toBe('claude-opus-5')
    expect(getMatcherValue({ hook_event_name: 'PostModelSwitch', to_model: 'us.anthropic.claude-opus-5-v1:0' })).toBe('claude-opus-5')
    // unresolvable IDs fall back to the raw value (ignoresMatcher() then runs every handler)
    expect(getMatcherValue({ hook_event_name: 'PreModelSwitch', to_model: 'my-gateway-model' })).toBe('my-gateway-model')
  })
})
