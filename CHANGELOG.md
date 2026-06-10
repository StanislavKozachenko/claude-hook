# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-06-10

---


## [0.2.5] - 2026-06-01

### Changed

- Switched npm publishing to Trusted Publishers (OIDC) — removed long-lived `NPM_TOKEN`, added `--provenance` flag
- Added `CHANGELOG.md` following Keep a Changelog format with automated updates on release
- Upgraded Node.js to 24 in CI and release workflows (required for npm 11.x and Trusted Publishing support)

---


## [0.2.4] - 2026-04-28

### Added

- `UserPromptExpansionContext` — dedicated context for `UserPromptExpansion` events with `expansionType`, `commandName`, `commandArgs`, `commandSource`, and `prompt` accessors

### Fixed

- `UserPromptExpansionEvent` fields corrected to match real Claude Code events — was incorrectly typed as `{ expansion: string }`, actual fields are `expansion_type`, `command_name`, `command_args`, `command_source`, `prompt`
- LICENSE year updated to 2026

---

## [0.2.3] - 2026-04-28

### Fixed

- CI badge now triggers on `push` to `main`
- Node.js badge now sources version from the `engines` field in package.json

---

## [0.2.2] - 2026-04-28

### Added

- README badges: npm version, downloads, CI status, license, Node.js version

### Fixed

- CI workflow now triggers on version bump PRs
- Removed unused `e2e` npm script

---

## [0.2.1] - 2026-04-28

### Fixed

- `UserPromptSubmitEvent.prompt` field name corrected — Claude Code sends `prompt`, not `message`; `ctx.prompt` was always `undefined`
- Event type fields aligned with live Claude Code events; all context accessors verified with E2E tests

---

## [0.2.0] - 2026-04-27

### Fixed

- `PermissionRequest` and `PermissionDenied` events now route to `PreToolUseContext` — `ctx.toolName`, `ctx.input`, `ctx.allow()`, `ctx.block()` are now available for these events
- Package exports corrected to match actual tsup output filenames (`dist/index.js`, `dist/index.cjs`)
- `ToolInput` generics narrowed for typed `ctx.input` access per tool

---

## [0.1.1] - 2026-04-27

### Fixed

- YAML syntax error in release workflow version bump step
- Release workflow rewritten to push directly then open a version bump PR, avoiding branch protection conflicts

---

## [0.1.0] - 2026-04-27

### Added

- `createHook()` / `hook.on(eventName, matcher, handler)` / `hook.run()` — TypeScript middleware API for Claude Code hooks
- Context classes: `PreToolUseContext`, `PostToolUseContext`, `UserPromptSubmitContext`, `StopContext`, `SessionStartContext`, `FileChangedContext`, `CwdChangedContext`, `ElicitationContext`, `GenericContext`
- Full event type definitions for all 26+ Claude Code hook events
- `claude-hook run <script>` CLI — runs TypeScript hook scripts via `tsx` without a build step
- CI workflow and manual release pipeline with `patch` / `minor` / `major` input
