# Contributing

## Reporting bugs

Open an issue with a minimal reproduction: the hook handler code, the Claude Code event JSON, and the unexpected behavior.

## Submitting changes

1. Fork the repo and create a branch from `main`: `feat/your-feature` or `fix/your-bug`
2. Make your changes, add tests
3. Run `npm test` and `npm run build` — both must pass
4. Open a pull request; CI runs automatically
5. A maintainer will review and merge

## Branch naming

- `feat/` — new feature
- `fix/` — bug fix
- `chore/` — maintenance
- `docs/` — documentation only

## Commit style

Short imperative message: `feat: add WorktreeCreate context` or `fix: handle empty stdin`.  
No `Closes #N` in commit messages — only in the PR body.

## Release

Releases are published by the maintainer via the manual **Release** workflow on GitHub Actions (Actions → Release → Run workflow → pick patch / minor / major).  
To publish, the repo needs an `NPM_TOKEN` secret set under Settings → Secrets → Actions.
