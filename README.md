# ASMO Quest — English lớp 6

Ứng dụng học tiếng Anh dành cho một học sinh, chuẩn bị vòng Quốc gia ngày 22/11/2026.

## Phối hợp Codex và Claude Code

Đọc [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [CONTRIBUTING.md](CONTRIBUTING.md) và [trạng thái dự án](docs/PROJECT_STATUS.md) trước khi sửa. Dùng nhánh và clone/worktree riêng khi làm đồng thời. GitHub Actions chạy kiểm thử/build, không tự deploy website.

## Chạy trên máy

Node.js 22+; không cần cài thư viện.

```sh
npm run dev
```

Mở http://127.0.0.1:4173. API key được đọc từ `.env.local` (đã bỏ qua bởi Git); mẫu tên biến trong `.env.example`. Không đưa key vào mã frontend.

## Chức năng

- Đánh giá 12 câu, 4 nhóm kỹ năng; luyện hằng ngày theo kết quả thực tế.
- 40 câu từ PDF gia đình cung cấp, giải thích tiếng Việt; nguồn ghi rõ từng câu.
- Thi thử 40 câu / 60 phút theo PDF luyện; thời gian vẫn chạy khi rời trang, tự nộp khi mở lại nếu đã hết giờ. Câu chưa trả lời tính sai.
- Sổ lỗi, lịch ôn, mẹo học; lộ trình bốn giai đoạn từ 29/10 đến 21/11.
- Gia sư, gợi ý và sinh 4 câu mới qua OpenAI Responses API. Câu AI ghi nguồn riêng, có kiểm tra cấu trúc, chưa có thẩm định độc lập bởi giáo viên.
- Tỉ lệ đúng lần đầu tách khỏi điểm luyện lại; gợi ý trước khi làm được đánh dấu hỗ trợ. XP không phải thang năng lực tiếng Anh.
- Điểm thưởng cho câu mới/sửa lỗi có giới hạn để tránh luyện lặp lấy điểm.
- Dữ liệu lưu localStorage cho một hồ sơ/trình duyệt. Xuất và nhập JSON; chưa đồng bộ tài khoản/đa thiết bị. Khu phụ huynh không khóa mật khẩu.
- Lịch sử chat chỉ ở bộ nhớ trang; không gửi tên học sinh hay toàn bộ lịch sử tiến độ cho API.

## Nguồn đề

`ASMO_English_Grade6_Practice_Test.pdf`: nhập 40 câu + đáp án. Câu 36 sửa thông báo “before 15 June” thành “by 15 June” để khớp đáp án đã cho. Không xác nhận PDF là đề chính thức. `Thi thử ASMO.pdf`: đã đọc để tham khảo, chưa nhập vì thiếu đáp án.

Ngày thi 22/11/2026 được xác nhận bởi gia đình và https://www.asmo.edu.vn/. Không mặc định cấu trúc 40 câu/60 phút là cấu trúc ASMO chính thức.

## API / triển khai

Server: `src/server.js`; UI: `src/index.html`, `src/style.css`, `src/app.js`; logic học: `src/core.js`; dữ liệu: `src/bank.json`.

`node scripts/bundle.mjs` tạo Worker độc lập `worker/index.js`. `npm run build` xuất `dist/server/index.js` và manifest. Sites giữ website riêng tư, xác thực người dùng; endpoint AI cần `oai-authenticated-user-id`. Local preview chỉ bind 127.0.0.1 và cho phép dùng key cục bộ.

Runtime secrets: `OPENAI_API_KEY`; tùy chọn `OPENAI_MODEL` (mặc định `gpt-4.1-mini`). Thiết lập qua Sites secrets, không commit `.env.local`. Rate limit 12 lượt/phút/user trong từng Worker isolate, không phải giới hạn chi phí toàn hệ thống. API `store:false`; website không lưu trò chuyện trên server.

Nếu API hết tín dụng, bài có sẵn vẫn dùng được; kiểm tra https://platform.openai.com/settings/organization/billing/. ChatGPT và API có quản lý thanh toán riêng.

## Kiểm tra

```sh
npm test
npm run build
npm run validate
```

Kiểm tra logic điểm lần đầu, chống lặp thưởng, gợi ý, ngày Việt Nam, nhập dữ liệu, xác thực endpoint, giới hạn nguồn, và phân biệt lỗi hết tín dụng.

## Tài liệu gốc

PDF gốc không nằm trong repo public. Xem `reference/README.md` nếu cần tái nhập câu hỏi. Ngân hàng 40 câu hiện có nằm trong `src/bank.json`; chạy web và CI không cần PDF hay Python.

## GitHub

Repo phối hợp: https://github.com/nangnv/english-asmo-moon

Bản source này không mang lịch sử triển khai chứa PDF nội bộ, API key hoặc tiến độ của học sinh. Cấu hình Sites thật nằm ngoài Git; build sử dụng `hosting.example.json` khi chưa có cấu hình cục bộ.
