#!/usr/bin/env node
'use strict';
/**
 * PreToolUse (Write | Edit): không cho ghi token/khóa thật vào file của dự án (nguy cơ bị commit).
 * Token GitHub của dự án chỉ nằm trong .bie-token (gitignore) do cài đặt/cập nhật tự ghi.
 */
let raw = ''; process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  let ev = {}; try { ev = JSON.parse(raw); } catch { process.exit(0); }
  const ti = ev.tool_input || {};
  const text = [ti.content, ti.new_string].filter((x) => typeof x === 'string').join('\n');
  if (!text) process.exit(0);
  const file = String(ti.file_path || '');
  if (/(^|[\\/])\.bie-token$/.test(file)) process.exit(0);
  const PATTERNS = [[/github_pat_[A-Za-z0-9_]{25,}/, 'GitHub fine-grained token'], [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'], [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'], [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'], [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key']];
  const hit = PATTERNS.find(([re]) => re.test(text));
  if (hit) { process.stderr.write(`[BIE hook] Đã chặn ghi file ${file || ''}: nội dung chứa ${hit[1]} thật. Dùng biến môi trường/placeholder (<TOKEN>) thay vì ghi token vào file.\n`); process.exit(2); }
  process.exit(0);
});
