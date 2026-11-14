#!/usr/bin/env node
'use strict';
/**
 * PreToolUse (Bash | PowerShell): chạy `npm test` trước mỗi `git commit` có đổi mã; test đỏ thì chặn commit.
 * - Chỉ chạy khi vùng staged có file mã/cấu hình (.js .json .css .html .ps1 .tmdl ...) — commit thuần tài liệu/ảnh thì bỏ qua.
 * - Bỏ qua `git commit --amend --no-edit` và khi đặt biến môi trường BIE_SKIP_PRECOMMIT_TEST=1.
 * - Chặn = exit 2 + thông điệp stderr (Claude đọc được, sửa lỗi rồi commit lại).
 * - Kiểm thử hook: đặt BIE_PRECOMMIT_CMD để thay lệnh chạy test (mặc định `npm test`).
 */
const cp = require('child_process');
let raw = ''; process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  let ev = {}; try { ev = JSON.parse(raw); } catch { process.exit(0); }
  const cmd = String((ev.tool_input && (ev.tool_input.command || ev.tool_input.script)) || '');
  if (!/\bgit\b[^\n]*\bcommit\b/i.test(cmd)) process.exit(0);
  if (process.env.BIE_SKIP_PRECOMMIT_TEST === '1' || /\bgit\b[^\n]*\bcommit\b[^\n]*--amend[^\n]*--no-edit/i.test(cmd)) process.exit(0);
  const cwd = ev.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let staged = []; try { staged = cp.execSync('git diff --cached --name-only', { cwd, encoding: 'utf8', timeout: 10000 }).split(/\r?\n/).filter(Boolean); } catch {}
  // `git commit -a` / `-am` tự gom file đã sửa → tính cả file đã theo dõi nhưng chưa stage
  if (/\bcommit\b[^\n]*\s-[a-z]*a/i.test(cmd) || /\bcommit\b[^\n]*--all\b/i.test(cmd)) { try { staged = staged.concat(cp.execSync('git diff --name-only', { cwd, encoding: 'utf8', timeout: 10000 }).split(/\r?\n/).filter(Boolean)); } catch {} }
  if (!staged.some((f) => /\.(js|cjs|mjs|json|css|html|ps1|tmdl|m|dax)$/i.test(f) && !/^(output|node_modules)\//.test(f))) process.exit(0);
  const r = cp.spawnSync(process.env.BIE_PRECOMMIT_CMD || 'npm test', { cwd, shell: true, encoding: 'utf8', timeout: 140000 });
  if (r.status === 0) process.exit(0);
  const out = (String(r.stdout || '') + '\n' + String(r.stderr || '')).split(/\r?\n/);
  const fails = out.filter((l) => /^\s*(not ok|✖|# fail|ℹ fail|Error|AssertionError)/.test(l)).slice(0, 12);
  const tail = out.filter(Boolean).slice(-14);
  process.stderr.write('[BIE hook] Đã chặn commit: `npm test` chưa xanh' + (r.error ? ' (' + r.error.message + ')' : ' (exit ' + r.status + ')') + '. Sửa lỗi rồi commit lại.\n'
    + (fails.length ? fails.join('\n') + '\n--- cuối log ---\n' : '') + tail.join('\n') + '\n');
  process.exit(2);
});
