# claude-hook

![claude-hook](https://raw.githubusercontent.com/StanislavKozachenko/claude-hook/main/assets/social-preview.png)

[![npm version](https://img.shields.io/npm/v/claude-hook)](https://www.npmjs.com/package/claude-hook)
[![npm downloads](https://img.shields.io/npm/dm/claude-hook)](https://www.npmjs.com/package/claude-hook)
[![CI](https://img.shields.io/github/actions/workflow/status/StanislavKozachenko/claude-hook/ci.yml?branch=main&label=CI)](https://github.com/StanislavKozachenko/claude-hook/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/StanislavKozachenko/claude-hook/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/claude-hook)](https://nodejs.org)

TypeScript middleware framework for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) command hooks.

Instead of writing raw shell scripts that parse JSON with `jq` and manage exit codes manually, you write typed TypeScript handlers.

```ts
import { createHook } from 'claude-hook'

const hook = createHook()

hook.on('PreToolUse', 'Bash', (ctx) => {
  if (ctx.input.command.includes('rm -rf'))
    ctx.block('destructive commands are not allowed')
})

hook.on('UserPromptSubmit', '*', (ctx) => {
  if (ctx.prompt.toLowerCase().includes('drop table'))
    ctx.block('SQL DDL not allowed in this project')
})

hook.run()
```

## Installation

```bash
# npm
npm install claude-hook

# pnpm
pnpm add claude-hook

# yarn
yarn add claude-hook

# bun
bun add claude-hook
```

Requires Node.js 18+ or Bun 1.0+.

## How it works

Claude Code invokes your script as a subprocess and pipes a JSON event to stdin. Your script reads it, decides what to do, writes JSON to stdout (optional), and exits with code `0` (continue) or `2` (block).

`claude-hook` handles all of that plumbing. You just register handlers.

## Quick start

1. Create `.claude/hooks/index.ts`:

```ts
import { createHook } from 'claude-hook'

const hook = createHook()

hook.on('PreToolUse', 'Bash', (ctx) => {
  if (ctx.input.command.startsWith('curl'))
    ctx.block('outbound requests require review')
})

hook.run()
```

2. Point Claude Code at your script in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "npx claude-hook run .claude/hooks/index.ts" }]
      }
    ]
  }
}
```

Or with pnpm / yarn / bun:

```json
{ "type": "command", "command": "pnpm dlx claude-hook run .claude/hooks/index.ts" }
{ "type": "command", "command": "yarn dlx claude-hook run .claude/hooks/index.ts" }
{ "type": "command", "command": "bunx claude-hook run .claude/hooks/index.ts" }
```

One script can handle multiple event types — register as many `hook.on()` calls as you need.

## API

### `createHook()`

Returns a `HookHandler` instance.

### `hook.on(eventName, matcher, handler)`

Registers a handler for an event.

- **`eventName`** — one of the supported event names (see table below)
- **`matcher`** — filters which tool/file/etc triggers this handler (mirrors Claude Code's own rules):
  - `'*'` — match all
  - `'Bash'` — exact match
  - `'Edit|Write'` — pipe-separated OR list
  - `'mcp__.*'` — JavaScript regex (when the string contains special characters)
- **`handler`** — `(ctx) => void | Promise<void>`

Returns `this` for chaining.

### `hook.run()`

Reads stdin, routes to matching handlers, writes output, exits. Call once at the end of your script.

## Context API

All contexts expose:

| Property / method | Description |
|---|---|
| `ctx.event` | Raw parsed event object |
| `ctx.sessionId` | Current session ID |
| `ctx.cwd` | Working directory |
| `ctx.hookEventName` | Event name |
| `ctx.promptId` | Current prompt ID, if present |
| `ctx.suppress()` | Set `suppressOutput: true` |

### `PreToolUseContext`

```ts
hook.on('PreToolUse', 'Bash', (ctx) => {
  ctx.toolName             // 'Bash'
  ctx.input                // { command: string, description?: string }
  ctx.block('reason')      // exit 2, block the tool call
  ctx.allow()              // explicitly allow (skip permission prompt)
  ctx.modify({ command: 'echo safe' })  // rewrite tool input
  ctx.addContext('info for Claude')
})

// On PermissionRequest events, suggestions from Claude Code are also available:
hook.on('PermissionRequest', '*', (ctx) => {
  ctx.permissionSuggestions  // e.g. [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }]
})

// PermissionDenied also reuses PreToolUseContext; the denial already happened
// (`.block()`/`.allow()`/`.modify()` have no effect), but `.retry()` tells
// Claude Code the model may retry the denied tool call.
hook.on('PermissionDenied', '*', (ctx) => {
  ctx.reason  // why the permission was denied
  ctx.retry()
})
```

### `PostToolUseContext`

```ts
hook.on('PostToolUse', 'Bash', (ctx) => {
  ctx.toolName    // 'Bash'
  ctx.input       // tool input
  ctx.output      // tool response
  ctx.error       // error string (PostToolUseFailure only)
  ctx.durationMs  // execution time in ms
  ctx.addContext('feedback for Claude')
})
```

### `UserPromptSubmitContext`

```ts
hook.on('UserPromptSubmit', '*', (ctx) => {
  ctx.prompt             // user message text
  ctx.block('reason')
  ctx.addContext('extra context injected before Claude sees the prompt')
  ctx.setTitle('Session title')
})
```

### `UserPromptExpansionContext`

```ts
hook.on('UserPromptExpansion', '*', (ctx) => {
  ctx.prompt             // original slash command input, e.g. '/compact'
  ctx.commandName        // command name, e.g. 'compact'
  ctx.commandArgs        // arguments string (empty if none)
  ctx.commandSource      // 'projectSettings' | 'globalSettings' | etc.
  ctx.expansionType      // e.g. 'slash_command'
  ctx.block('reason')
  ctx.addContext('extra context')
  ctx.setTitle('Session title')
})
```

### `StopContext`

```ts
hook.on('Stop', '*', (ctx) => {
  ctx.lastAssistantMessage  // last message Claude produced
  ctx.block('not done yet') // prevent Claude from stopping
})

hook.on('SubagentStop', '*', (ctx) => {
  ctx.agentId              // subagent identifier
  ctx.agentType            // e.g. 'Explore'
  ctx.agentTranscriptPath  // path to the subagent's transcript
})
```

### `SessionStartContext`

```ts
hook.on('SessionStart', '*', (ctx) => {
  ctx.source  // 'startup' | 'resume' | undefined
  ctx.model   // e.g. 'claude-sonnet-4-6'
  ctx.setEnv('NODE_ENV', 'production')  // persists to CLAUDE_ENV_FILE
})
```

### `FileChangedContext`

```ts
hook.on('FileChanged', '.env|.envrc', (ctx) => {
  ctx.filePath   // absolute path to changed file
  ctx.changeType // 'change' | 'add' | 'unlink'
  ctx.setEnv('UPDATED', '1')
  ctx.block('env file changed, session restart recommended')
})
```

> `FileChanged` fires after the file has already changed on disk, so `ctx.block()`
> can't undo it. Claude Code only shows the reason to the user; it doesn't stop
> anything.

### `CwdChangedContext`

```ts
hook.on('CwdChanged', '*', (ctx) => {
  ctx.oldCwd  // previous working directory
  ctx.newCwd  // new working directory
})
```

> `CwdChanged` fires after the directory has already changed, so `ctx.block()`
> can't undo it. Claude Code only shows the reason to the user; it doesn't stop
> anything.

### `ElicitationContext`

```ts
hook.on('Elicitation', '*', (ctx) => {
  ctx.mcpServerName  // which MCP server is asking
  ctx.message        // the question shown to the user
  ctx.mode           // 'form' | 'url' | undefined
  ctx.block('automated sessions do not support interactive prompts')
})
```

### `ElicitationResultContext`

```ts
hook.on('ElicitationResult', '*', (ctx) => {
  ctx.mcpServerName  // which MCP server asked
  ctx.action         // 'accept' | 'decline' | 'cancel'
  ctx.content        // the user's answer, if accepted
})
```

### `StopFailureContext`

```ts
hook.on('StopFailure', '*', (ctx) => {
  ctx.error  // error message describing what went wrong
})
```

### `NotificationContext`

```ts
hook.on('Notification', '*', (ctx) => {
  ctx.notificationType  // e.g. 'info' | 'warning' | 'error'
  ctx.message           // notification text
})
```

### `InstructionsLoadedContext`

```ts
hook.on('InstructionsLoaded', '*', (ctx) => {
  ctx.filePath    // absolute path to the loaded file
  ctx.memoryType  // 'User' | 'Project' | 'Local' | 'Managed'
  ctx.loadReason  // 'session_start' | 'nested_traversal' | 'path_glob_match' | 'include' | 'compact'
})

hook.on('InstructionsLoaded', 'session_start', (ctx) => {
  // matcher filters on ctx.loadReason
})
```

### `TaskCreatedContext` / `TaskCompletedContext`

```ts
hook.on('TaskCreated', '*', (ctx) => {
  ctx.taskId          // unique task identifier
  ctx.taskSubject     // short task title
  ctx.taskDescription // longer task description, if given
  ctx.teammateName    // assigned teammate, if any (requires Agent Teams)
  ctx.block('reason') // exit 2, rolls back the task creation
})
```

> `TaskCreated`/`TaskCompleted` require the experimental Agent Teams feature
> (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).

### `WorktreeCreateContext` / `WorktreeRemoveContext`

```ts
hook.on('WorktreeCreate', '*', (ctx) => {
  ctx.name  // requested worktree name (e.g. 'feature-x')
  ctx.block('worktree creation not allowed here')
})

hook.on('WorktreeRemove', '*', (ctx) => {
  ctx.worktreePath  // absolute path to the worktree
})
```

> Configuring a `WorktreeCreate` hook makes Claude Code delegate worktree
> creation to it entirely (even inside a git repo) — `.block()` still works
> to reject the request, but to *allow* it your hook must create the
> worktree itself and print its absolute path to stdout (nothing else on
> stdout). `claude-hook` doesn't automate that part; it only wires up the
> event and gives you `.block()`.
>
> `WorktreeRemove` failures are only logged in debug mode; there's no way to
> block or stop the removal, so `WorktreeRemoveContext` has no `.block()`.

### `SessionEndContext`

```ts
hook.on('SessionEnd', '*', (ctx) => {
  ctx.reason  // 'clear' | 'resume' | 'logout' | 'prompt_input_exit' | 'bypass_permissions_disabled' | 'other'
})

hook.on('SessionEnd', 'logout', (ctx) => {
  // matcher filters on ctx.reason
})
```

> Claude Code gives `SessionEnd` a much shorter exit-time budget than other hooks
> (historically ~1.5s, regardless of the hook's own `timeout`), so slow-starting
> commands (e.g. `npx`) can get killed before they run. Override it with the
> `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` environment variable if you need more time.

### `SubagentStartContext`

```ts
hook.on('SubagentStart', '*', (ctx) => {
  ctx.agentId    // subagent identifier
  ctx.agentType  // e.g. 'Explore'
})
```

### `ConfigChangeContext`

```ts
hook.on('ConfigChange', '*', (ctx) => {
  ctx.source    // 'user_settings' | 'project_settings' | 'local_settings' | 'policy_settings' | 'skills'
  ctx.filePath  // absolute path to the changed config file
})

hook.on('ConfigChange', 'user_settings', (ctx) => {
  // matcher filters on ctx.source
})
```

### `TeammateIdleContext`

```ts
hook.on('TeammateIdle', '*', (ctx) => {
  ctx.teammateName     // name of the teammate agent that went idle
  ctx.block('reason')  // exit 2, prevents the teammate from going idle
})
```

> Requires the experimental Agent Teams feature
> (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).

### `PreCompactContext` / `PostCompactContext`

```ts
hook.on('PreCompact', '*', (ctx) => {
  ctx.trigger            // 'manual' | 'auto'
  ctx.customInstructions // string | null
  ctx.block('not now')   // exit 2, blocks compaction
})

hook.on('PreCompact', 'manual', (ctx) => {
  // matcher filters on ctx.trigger
})

hook.on('PostCompact', '*', (ctx) => {
  ctx.trigger        // 'manual' | 'auto'
  ctx.compactSummary // the conversation summary produced by compaction
})
```

### `PostToolBatchContext`

```ts
hook.on('PostToolBatch', '*', (ctx) => {
  ctx.toolCalls  // [{ tool_name, tool_input, tool_response, tool_use_id }, ...]
  ctx.block('reason')  // exit 2, stops the loop before the next model call
})
```

### `SetupContext`

```ts
hook.on('Setup', '*', (ctx) => {
  ctx.trigger       // 'init' | 'maintenance'
  ctx.addContext('extra setup info')  // feeds additionalContext back to Claude
})
```

### `DirectoryAddedContext`

```ts
hook.on('DirectoryAdded', '*', (ctx) => {
  ctx.directory  // absolute path of the directory that was added
  ctx.source     // 'slash_command' (/add-dir) | 'register_repo_root' (SDK control_request)
})
```

> Read-only notification — no output or blocking is supported for this event.

For all other events, the handler receives a `GenericContext` with `ctx.block(reason)` and base properties.

## Supported events

| Event | When it fires | Blockable | Context class |
|---|---|---|---|
| `PreToolUse` | Before any tool call | yes | `PreToolUseContext` |
| `PostToolUse` | After successful tool call | no | `PostToolUseContext` |
| `PostToolUseFailure` | After failed tool call | no | `PostToolUseContext` |
| `PostToolBatch` | After a batch of tool calls | yes | `PostToolBatchContext` |
| `PermissionRequest` | When permission dialog shows | yes | `PreToolUseContext` |
| `PermissionDenied` | After permission denied | no | `PreToolUseContext` |
| `UserPromptSubmit` | Before Claude sees your message | yes | `UserPromptSubmitContext` |
| `UserPromptExpansion` | When a slash command expands | yes | `UserPromptExpansionContext` |
| `SessionStart` | Session begins or resumes | no | `SessionStartContext` |
| `SessionEnd` | Session ends | no | `SessionEndContext` |
| `Stop` | Claude finishes a turn | yes | `StopContext` |
| `StopFailure` | Claude turn ended with error | no | `StopFailureContext` |
| `SubagentStart` | Subagent spawned | no | `SubagentStartContext` |
| `SubagentStop` | Subagent finished | yes | `StopContext` |
| `TaskCreated` | Task created | yes | `TaskCreatedContext` |
| `TaskCompleted` | Task completed | yes | `TaskCompletedContext` |
| `WorktreeCreate` | Git worktree created | yes | `WorktreeCreateContext` |
| `WorktreeRemove` | Git worktree removed | no | `WorktreeRemoveContext` |
| `FileChanged` | Watched file changed on disk | no | `FileChangedContext` |
| `CwdChanged` | Working directory changed | no | `CwdChangedContext` |
| `ConfigChange` | Claude Code config changed | yes | `ConfigChangeContext` |
| `TeammateIdle` | Teammate agent went idle | yes | `TeammateIdleContext` |
| `PreCompact` | Before context compaction | yes | `PreCompactContext` |
| `PostCompact` | After context compaction | no | `PostCompactContext` |
| `Elicitation` | Claude needs user input | yes | `ElicitationContext` |
| `ElicitationResult` | Elicitation answer received | yes | `ElicitationResultContext` |
| `InstructionsLoaded` | CLAUDE.md / rules loaded | no | `InstructionsLoadedContext` |
| `Notification` | System notification | no | `NotificationContext` |
| `Setup` | Session init/maintenance setup phase | no | `SetupContext` |
| `DirectoryAdded` | Directory added (`/add-dir` or SDK) | no | `DirectoryAddedContext` |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Continue normally |
| `2` | Block the action (stderr message shown in transcript) |

`ctx.block(reason)` sets exit code 2 automatically.

## TypeScript

All event payloads and context classes are fully typed. Import types directly:

```ts
import type { PreToolUseEvent, BashToolInput } from 'claude-hook'
```

## License

MIT
