# Phối hợp Codex và Claude Code

Repo là nơi lưu phiên bản chung. Mỗi công cụ làm một nhánh và một thư mục riêng để tránh ghi đè công việc của nhau.

## Bắt đầu

Clone repo từ URL GitHub được bàn giao, mở thư mục đó bằng Codex hoặc Claude Code, rồi đọc `AGENTS.md` và `docs/PROJECT_STATUS.md`.

```sh
npm test
npm run build
npm run validate
npm run dev
```

Node.js 22 trở lên; không cần cài dependency cho ứng dụng hiện tại. Tạo `.env.local` từ `.env.example` nếu cần chạy AI; không đưa giá trị secret vào Git. Không cần API key để luyện câu có sẵn và chạy kiểm thử.

## Mỗi đầu việc

1. Cập nhật nhánh mặc định từ GitHub trước khi tạo nhánh.
2. Tạo nhánh `codex/<chu-de>` hoặc `claude/<chu-de>` từ phiên bản mới nhất.
3. Ghi phạm vi và tiêu chí xong việc trong issue hoặc mô tả PR.
4. Nếu chạy đồng thời, dùng hai bản clone hoặc Git worktree. Không mở hai agent cùng sửa một checkout.
5. Hoàn thành thay đổi, chạy các kiểm tra phù hợp, cập nhật trạng thái thật trong `docs/PROJECT_STATUS.md`.
6. Mở PR, công cụ còn lại hoặc người dùng review trước khi merge.

Không cần tạo tài khoản GitHub cho Claude Code: công cụ dùng quyền Git của người đang vận hành nó. Chỉ cấp quyền repo cho người thực sự cần truy cập.

## Thay đổi giao diện

Kiểm tra máy tính, điện thoại, điều hướng bàn phím, trạng thái rỗng/loading/lỗi. Không dùng thành tích giả làm dữ liệu học sinh. Nêu rõ khi chưa kiểm thử được trên trình duyệt.

## Thay đổi chấm điểm và dữ liệu

Giữ riêng điểm lần đầu, câu có hỗ trợ và ôn lại. Có kế hoạch đọc dữ liệu cũ trước khi đổi cấu trúc localStorage hoặc chuyển lên database. Không tự tải tiến độ của con lên server.

## Triển khai

Push GitHub không tự cập nhật website. CI chỉ kiểm tra mã. Website hiện nằm trên Sites; API key là runtime secret, không đi theo repo. Thay đổi hosting hoặc mở quyền truy cập cần tuân theo yêu cầu của người dùng và được kiểm tra riêng.

## Tài liệu đề

Hai PDF gia đình cung cấp không được đưa lên repo public này. Nếu cần đối chiếu hoặc nhập lại, chủ dự án đặt bản PDF vào `reference/` theo hướng dẫn tại đó; PDF được Git bỏ qua. Chưa xác nhận nguồn đề chính thức. Script nhập 40 câu cần Python và `pypdf`; các lệnh chạy web/CI không phụ thuộc Python.
