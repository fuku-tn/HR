# Hook của BIE (Claude Code)

Các hook này chạy tự động khi dùng Claude Code trong thư mục dự án. Chúng khai báo trong [../settings.json](../settings.json) và dùng `$CLAUDE_PROJECT_DIR` nên chạy được ở mọi máy.

| Script | Khi nào | Việc làm |
|---|---|---|
| `guard-bash.js` | Trước mỗi lệnh Bash / PowerShell | Chặn kill hàng loạt `node`, xóa cả thư mục `output/`, `git push --force`, `--no-verify`, `git clean -f`, `git add -A` / `git add .`; khi commit thì chặn nếu vùng staged có file nhạy cảm (token, `.env`, `.pbix`, `output/`, `node_modules/`). |
| `test-before-commit.js` | Trước mỗi `git commit` | Chạy `npm test`; test đỏ thì chặn commit. Bỏ qua commit chỉ có tài liệu/ảnh. |
| `guard-secrets.js` | Trước mỗi lần Write / Edit | Chặn ghi token/khóa thật vào file dự án. |
| `check-syntax.js` | Sau mỗi lần Write / Edit | Kiểm tra cú pháp `.js` / `.json` vừa sửa, báo lỗi ngay. |

Chặn = thoát với mã 2 và in lý do ra stderr; Claude đọc lý do đó rồi đổi cách làm.

## Tùy chỉnh
- Bỏ qua kiểm thử trước commit một lần: đặt biến môi trường `BIE_SKIP_PRECOMMIT_TEST=1`.
- Quyền riêng của từng máy (danh sách `allow`) để trong `.claude/settings.local.json` — file này **không** được commit.
- Muốn tắt một hook: xóa mục tương ứng trong `hooks` của `settings.json`.
