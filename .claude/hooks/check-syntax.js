#!/usr/bin/env node
'use strict';
/**
 * PostToolUse (Write | Edit): kiểm tra cú pháp ngay sau khi sửa file .js / .json của dự án.
 * (Shell từng làm hỏng `\n`, `\\` khi vá file → lỗi cú pháp chỉ lộ ra rất muộn.)
 * Lỗi = exit 2 + thông điệp stderr để Claude sửa ngay.
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
let raw = ''; process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  let ev = {}; try { ev = JSON.parse(raw); } catch { process.exit(0); }
  const file = String((ev.tool_input && ev.tool_input.file_path) || '');
  if (!file || !fs.existsSync(file)) process.exit(0);
  if (/[\\/](node_modules|output|\.claude[\\/]hooks)[\\/]/i.test(file)) process.exit(0);
  const ext = path.extname(file).toLowerCase();
  const fail = (msg) => { process.stderr.write(`[BIE hook] Lỗi cú pháp sau khi sửa ${path.basename(file)}: ${msg}\n`); process.exit(2); };
  if (ext === '.json') { try { JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch (e) { fail(e.message); } }
  else if (ext === '.js' || ext === '.cjs') {
    const r = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 15000 });
    if (r.status !== 0) fail(String(r.stderr || r.stdout).split('\n').slice(0, 6).join('\n'));
  }
  process.exit(0);
});
