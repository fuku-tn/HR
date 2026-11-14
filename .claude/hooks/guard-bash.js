#!/usr/bin/env node
'use strict';
/**
 * PreToolUse (Bash | PowerShell): chặn các lệnh đã từng gây sự cố ở dự án BIE.
 *  1. Kill hàng loạt node (từng làm sập server của người dùng 2 lần) — chỉ được dừng theo PID/cổng cụ thể.
 *  2. Xóa nguyên thư mục output/ (kết quả chạy thật của người dùng) — chỉ được xóa từng run nháp mình tạo.
 *  3. git push --force, --no-verify, git clean -f, git add -A / . (sẽ kéo templates/Power BI Template/ 44 MB và file nhạy cảm vào commit).
 *  4. git commit khi vùng staged có file không được commit (token, .env, .pbix, output/, node_modules/).
 * Chặn = exit 2 + thông điệp stderr (Claude đọc được và đổi cách làm).
 */
const cp = require('child_process');
let raw = ''; process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  let ev = {}; try { ev = JSON.parse(raw); } catch { process.exit(0); }
  const cmd = String((ev.tool_input && (ev.tool_input.command || ev.tool_input.script)) || '');
  if (!cmd) process.exit(0);
  const block = (why) => { process.stderr.write('[BIE hook] Đã chặn: ' + why + '\n'); process.exit(2); };

  // 1) kill hàng loạt node
  if (/taskkill[^\n]*\/im\s+["']?node/i.test(cmd) || /(pkill|killall)\s+(-\w+\s+)*["']?node/i.test(cmd) || /Stop-Process[^\n]*-Name\s+["']?node/i.test(cmd)
    || /Get-Process[^\n|]*node[^\n|]*\|[^\n]*Stop-Process/i.test(cmd) || /Get-CimInstance[^\n]*Win32_Process[^\n]*\|[^\n]*(Stop-Process|Terminate|taskkill)/i.test(cmd) || /wmic[^\n]*node[^\n]*delete/i.test(cmd))
    return block('kill hàng loạt tiến trình node có thể làm sập server của người dùng. Hãy dừng đúng PID theo cổng (Get-NetTCPConnection -LocalPort <cổng> → Stop-Process -Id <PID>).');

  // 2) xóa nguyên thư mục output/
  if (/(\brm\b[^\n;|&]*|\brmdir\b[^\n;|&]*|Remove-Item[^\n;|&]*|rmSync\s*\()[\s"'`(]*[^\n;|&]*?(?:^|[\s"'\\/`(])output(?:[\\/]\*?)?["'`)]*(?=\s|$|;|\||&|,)/i.test(cmd)
    && !/output[\\/][\w.-]*\d{8,}/i.test(cmd) && !/output[\\/](gallery)/i.test(cmd))
    return block('lệnh xóa nguyên thư mục output/ (kết quả chạy thật của người dùng). Chỉ xóa từng run nháp do bạn tạo: output/<run-id>.');

  // 3) git nguy hiểm
  if (/\bgit\b[^\n]*\bpush\b[^\n]*(--force\b|\s-f\b)/i.test(cmd)) return block('git push --force. Chỉ làm khi người dùng yêu cầu rõ.');
  if (/\bgit\b[^\n]*--no-verify\b|\bgit\b[^\n]*--no-gpg-sign\b/i.test(cmd)) return block('bỏ qua hook/ký commit (--no-verify, --no-gpg-sign).');
  if (/\bgit\s+clean\b[^\n]*\s-[a-z]*f/i.test(cmd)) return block('git clean -f sẽ xóa file chưa theo dõi (templates, tài liệu, dữ liệu người dùng).');
  if (/\bgit\s+add\s+(-A\b|--all\b|\.(\s|$|"|'))/i.test(cmd)) return block('git add -A / git add . sẽ kéo cả templates/Power BI Template/ (.pbix 44 MB) và file nhạy cảm vào commit. Hãy add theo tên file cụ thể.');

  // 4) git commit: kiểm tra vùng staged
  if (/\bgit\b[^\n]*\bcommit\b/i.test(cmd)) {
    let staged = []; try { staged = cp.execSync('git diff --cached --name-only', { cwd: ev.cwd || process.cwd(), encoding: 'utf8', timeout: 10000 }).split(/\r?\n/).filter(Boolean); } catch {}
    const bad = staged.filter((f) => /(^|\/)\.bie-token$|(^|\/)\.env(\.|$)|token[^/]*\.txt$|\.pbix$|^output\/|(^|\/)node_modules\//i.test(f));
    if (bad.length) return block('vùng staged có file không được commit: ' + bad.slice(0, 5).join(', ') + '. Dùng git restore --staged <file> để gỡ.');
  }
  process.exit(0);
});
