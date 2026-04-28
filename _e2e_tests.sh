#!/usr/bin/env bash
set -euo pipefail

PASS=0; FAIL=0
BASE='"session_id":"s1","transcript_path":"/t","cwd":"/","permission_mode":"default"'
TOOL_ID='"tool_use_id":"u1"'

run() {
  local json="$1"
  local script="$2"
  set +e
  _stdout=$(printf '%s' "$json" | node -e "$script" 2>/tmp/_e2e_err)
  _exit=$?
  set -e
  _stderr=$(cat /tmp/_e2e_err 2>/dev/null || true)
}

ok()  { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail(){ echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

check_exit()   { [ "$_exit"   = "$1" ] && ok "exit=$1"       || fail "exit: got $_exit, want $1"; }
check_stdout() { echo "$_stdout" | grep -qF "$1" && ok "stdout contains '$1'" || fail "stdout missing '$1' (got: $_stdout)"; }
check_stderr() { echo "$_stderr" | grep -qF "$1" && ok "stderr contains '$1'" || fail "stderr missing '$1' (got: $_stderr)"; }
check_no_stdout() { [ -z "$_stdout" ] && ok "stdout empty" || fail "stdout should be empty (got: $_stdout)"; }

HOOK="const { createHook } = require('./dist/index.js'); const h = createHook();"

echo ""
echo "=== 1. block() on PreToolUse ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"rm -rf /\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ if(ctx.input.command.includes('rm -rf')) ctx.block('no destructive cmds') }); h.run()"
check_exit 2
check_stderr "no destructive cmds"

echo ""
echo "=== 2. allow() on PreToolUse ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ ctx.allow() }); h.run()"
check_exit 0
check_stdout '"permissionDecision":"allow"'

echo ""
echo "=== 3. modify() on PreToolUse ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ ctx.modify({command:'ls --color=always'}) }); h.run()"
check_exit 0
check_stdout '"updatedInput"'
check_stdout 'ls --color=always'

echo ""
echo "=== 4. addContext() on PreToolUse ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ ctx.addContext('reminder: no sudo') }); h.run()"
check_exit 0
check_stdout '"additionalContext":"reminder: no sudo"'

echo ""
echo "=== 5. addContext() on PostToolUse ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PostToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"},\"tool_response\":{\"output\":\"file.txt\",\"exit_code\":0}}" \
  "$HOOK h.on('PostToolUse','Bash',(ctx)=>{ ctx.addContext('post: done') }); h.run()"
check_exit 0
check_stdout '"additionalContext":"post: done"'

echo ""
echo "=== 6. PostToolUse — error accessor ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PostToolUseFailure\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"bad\"},\"error\":\"cmd not found\"}" \
  "$HOOK h.on('PostToolUseFailure','Bash',(ctx)=>{ if(ctx.error) ctx.addContext('caught: '+ctx.error) }); h.run()"
check_exit 0
check_stdout "caught: cmd not found"

echo ""
echo "=== 7. suppress() ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ ctx.suppress() }); h.run()"
check_exit 0
check_stdout '"suppressOutput":true'

echo ""
echo "=== 8. block() on UserPromptSubmit ==="
run "{$BASE,\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"DROP TABLE users\"}" \
  "$HOOK h.on('UserPromptSubmit','*',(ctx)=>{ if(ctx.prompt.toLowerCase().includes('drop table')) ctx.block('no DDL') }); h.run()"
check_exit 2
check_stderr "no DDL"

echo ""
echo "=== 9. setTitle() on UserPromptSubmit ==="
run "{$BASE,\"hook_event_name\":\"UserPromptSubmit\",\"prompt\":\"hello\"}" \
  "$HOOK h.on('UserPromptSubmit','*',(ctx)=>{ ctx.setTitle('My Session') }); h.run()"
check_exit 0
check_stdout '"sessionTitle":"My Session"'

echo ""
echo "=== 10. Write tool — block .env writes ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\".env\",\"content\":\"SECRET=123\"}}" \
  "$HOOK h.on('PreToolUse','Write',(ctx)=>{ if(ctx.input.file_path.endsWith('.env')) ctx.block('no .env writes') }); h.run()"
check_exit 2
check_stderr "no .env writes"

echo ""
echo "=== 11. Edit tool — block .env edits ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\".env\",\"old_string\":\"a\",\"new_string\":\"b\"}}" \
  "$HOOK h.on('PreToolUse','Edit',(ctx)=>{ if(ctx.input.file_path.endsWith('.env')) ctx.block('no .env edits') }); h.run()"
check_exit 2
check_stderr "no .env edits"

echo ""
echo "=== 12. Pipe matcher Bash|Write — Bash matches ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('PreToolUse','Bash|Write',(ctx)=>{ ctx.block('matched') }); h.run()"
check_exit 2
check_stderr "matched"

echo ""
echo "=== 13. Pipe matcher Bash|Write — Write matches ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"x.txt\",\"content\":\"hi\"}}" \
  "$HOOK h.on('PreToolUse','Bash|Write',(ctx)=>{ ctx.block('matched') }); h.run()"
check_exit 2
check_stderr "matched"

echo ""
echo "=== 14. Pipe matcher Bash|Write — Edit does NOT match ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"x.txt\",\"old_string\":\"a\",\"new_string\":\"b\"}}" \
  "$HOOK h.on('PreToolUse','Bash|Write',(ctx)=>{ ctx.block('matched') }); h.run()"
check_exit 0
check_no_stdout

echo ""
echo "=== 15. Regex matcher — matches Bash ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('PreToolUse','^(Bash|Edit)$',(ctx)=>{ ctx.block('regex matched') }); h.run()"
check_exit 2
check_stderr "regex matched"

echo ""
echo "=== 16. Regex matcher — does NOT match Write ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"x.txt\",\"content\":\"hi\"}}" \
  "$HOOK h.on('PreToolUse','^(Bash|Edit)$',(ctx)=>{ ctx.block('regex matched') }); h.run()"
check_exit 0
check_no_stdout

echo ""
echo "=== 17. Wildcard eventName '*' ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}" \
  "$HOOK h.on('*','*',(ctx)=>{ ctx.block('caught by wildcard') }); h.run()"
check_exit 2
check_stderr "caught by wildcard"

echo ""
echo "=== 18. Multiple handlers — first blocks, second skipped ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"bad\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ ctx.block('first') }); h.on('PreToolUse','Bash',(ctx)=>{ ctx.addContext('second should not run') }); h.run()"
check_exit 2
check_stderr "first"

echo ""
echo "=== 19. No matching handler — exit 0, no output ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Read\",\"tool_input\":{\"file_path\":\"/etc/hosts\"}}" \
  "$HOOK h.on('PreToolUse','Bash',(ctx)=>{ ctx.block('bash only') }); h.run()"
check_exit 0
check_no_stdout

echo ""
echo "=== 20. FileChanged — block on .env change ==="
run "{$BASE,\"hook_event_name\":\"FileChanged\",\"file_path\":\"/project/.env\"}" \
  "$HOOK h.on('FileChanged','.env',(ctx)=>{ ctx.block('.env changed!') }); h.run()"
check_exit 2
check_stderr ".env changed!"

echo ""
echo "=== 21. Elicitation — block ==="
run "{$BASE,\"hook_event_name\":\"Elicitation\",\"prompt\":\"Enter your API key\"}" \
  "$HOOK h.on('Elicitation','*',(ctx)=>{ ctx.block('no elicitation') }); h.run()"
check_exit 2
check_stderr "no elicitation"

echo ""
echo "=== 22. Read tool typed input ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PreToolUse\",\"tool_name\":\"Read\",\"tool_input\":{\"file_path\":\"/etc/passwd\"}}" \
  "$HOOK h.on('PreToolUse','Read',(ctx)=>{ if(ctx.input.file_path.includes('passwd')) ctx.block('sensitive file') }); h.run()"
check_exit 2
check_stderr "sensitive file"

echo ""
echo "=== 23. PostToolUse — durationMs accessor ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PostToolUse\",\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"},\"tool_response\":{\"output\":\"x\"},\"duration_ms\":42}" \
  "$HOOK h.on('PostToolUse','Bash',(ctx)=>{ ctx.addContext('took:'+ctx.durationMs) }); h.run()"
check_exit 0
check_stdout "took:42"

echo ""
echo "=== 24. Stop — lastAssistantMessage accessor ==="
run "{$BASE,\"hook_event_name\":\"Stop\",\"stop_hook_active\":false,\"last_assistant_message\":\"Done!\"}" \
  "$HOOK h.on('Stop','*',(ctx)=>{ if(ctx.lastAssistantMessage) ctx.block('saw: '+ctx.lastAssistantMessage) }); h.run()"
check_exit 2
check_stderr "saw: Done!"

echo ""
echo "=== 25. SessionStart — source and model accessors ==="
run "{\"session_id\":\"s1\",\"transcript_path\":\"/t\",\"cwd\":\"/\",\"hook_event_name\":\"SessionStart\",\"source\":\"startup\",\"model\":\"claude-sonnet-4-6\"}" \
  "$HOOK h.on('SessionStart','*',(ctx)=>{ ctx.suppress() }); h.run()"
check_exit 0
check_stdout '"suppressOutput":true'

echo ""
echo "=== 26. PermissionRequest — permissionSuggestions accessor ==="
run "{$BASE,$TOOL_ID,\"hook_event_name\":\"PermissionRequest\",\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"x.ts\",\"old_string\":\"a\",\"new_string\":\"b\"},\"permission_suggestions\":[{\"type\":\"setMode\",\"mode\":\"acceptEdits\"}]}" \
  "$HOOK h.on('PermissionRequest','Edit',(ctx)=>{ const s=ctx.permissionSuggestions; if(s&&s.length>0) ctx.addContext('suggestion:'+s[0].mode) }); h.run()"
check_exit 0
check_stdout "suggestion:acceptEdits"

echo ""
echo "=== 27. SessionStart — no permission_mode (BaseEvent optional) ==="
run "{\"session_id\":\"s1\",\"transcript_path\":\"/t\",\"cwd\":\"/\",\"hook_event_name\":\"SessionStart\"}" \
  "$HOOK h.on('SessionStart','*',(ctx)=>{ ctx.suppress() }); h.run()"
check_exit 0
check_stdout '"suppressOutput":true'

echo ""
echo "==============================="
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "All tests passed!" || echo "Some tests FAILED."
echo "==============================="
exit $FAIL
