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

  test('returns empty string for events without a matcher value', () => {
    expect(getMatcherValue({ hook_event_name: 'SessionEnd' })).toBe('')
  })
})
