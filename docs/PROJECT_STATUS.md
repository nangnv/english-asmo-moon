# Trạng thái bàn giao — 31/10/2026

## Mục tiêu

Giúp học sinh lớp 6 thích học tiếng Anh, biết lỗi sai, sửa được lỗi và thấy tiến bộ trước vòng Quốc gia ASMO ngày 22/11/2026. Phụ huynh cần theo dõi được quá trình và con phải dùng được trên máy riêng, không cần tài khoản ChatGPT.

## Đã triển khai

- Website: https://asmo-english-quest-nang.nangnv.chatgpt.site
- Hosted riêng tư bằng Sites; truy cập vẫn qua ChatGPT sign-in.
- Đánh giá đầu vào cân bằng 4 kỹ năng, luyện theo kỹ năng và bài hằng ngày.
- 40 câu từ PDF, lời giải tiếng Việt, thi thử theo PDF 40 câu / 60 phút.
- Sổ lỗi, lịch ôn, mẹo học, lộ trình đến ngày thi.
- Lưu localStorage, tiếp tục bài đang làm, xuất/nhập bản sao JSON.
- Tách điểm lần đầu, câu có gợi ý và ôn lại; XP, sao, huy hiệu, đổi quà cùng gia đình.
- Tích hợp OpenAI Responses API cho gợi ý, giải thích, chat và tạo bộ 4 câu.
- Giao diện kiểu học-qua-trò-chơi (nhánh `claude/home-redesign`, chưa merge/deploy): Home là lộ trình 4 chặng theo kế hoạch, mỗi nút là một chế độ luyện có thật (đánh giá đầu vào, 4 kỹ năng, ôn lỗi, thi thử); màn làm bài một câu mỗi màn với thanh phản hồi đúng/sai, phím 1–4/Enter; màn kết quả có XP, độ chính xác, streak. Header hiển thị streak/XP/sao. Font Nunito, nút nổi khối, màu Lavender & Cream cùng màu nhấn cho từng kỹ năng (`:root` trong `src/style.css`). Mascot `src/mascot/`, huy hiệu `medals/` + `src/medals/`. Mục tiêu tuần 5 ngày là mặc định trong `src/home.js`. Trạng thái AI chưa sẵn sàng khóa nút gửi/gợi ý/tạo câu.
- Bản sửa review `codex/home-redesign-fixes` (chưa merge/deploy): Enter chấm bài khi focus ở đáp án; phiên đầu vào kết thúc sớm không được tính hoàn thành; tên hồ sơ dài được rút gọn trong header. Có kiểm thử hồi quy cho luồng bàn phím và trạng thái hoàn thành.
- 12 kiểm thử nền tảng cùng kiểm thử hồi quy mới; luồng đánh giá đầu vào và bố cục điện thoại đã được kiểm tra ngày 29/10.

## Giới hạn đã biết

- Chưa có Google login trực tiếp hoặc tên đăng nhập/mật khẩu riêng của app.
- Chưa có Supabase project/schema/auth được cấu hình cho ứng dụng.
- Chưa đồng bộ tiến độ giữa thiết bị, chưa có phân quyền phụ huynh/học sinh.
- Khu phụ huynh hiện là giao diện dùng chung, không khóa mật khẩu.
- Lần gọi API thật ngày 29/10 trả `credit_balance_exhausted`. Key đã cấu hình nhưng chưa xác nhận AI hoạt động thành công sau khi bổ sung tín dụng. Không suy đoán số dư hiện tại.
- Câu AI chỉ kiểm tra định dạng, chưa được giáo viên thẩm định độc lập.
- Rate limit ở bộ nhớ từng Worker isolate, chưa phải hạn mức chi phí bền vững.
- Điểm bài luyện không phải năng lực chuẩn hóa hoặc dự đoán điểm/huy chương ASMO.

## Việc tiếp theo

### P1 — Đăng nhập độc lập

Người dùng muốn con đăng nhập Google trực tiếp mà không cần ChatGPT. Phương án đã thảo luận: Google OAuth + Supabase Auth. Đây là phương án đề xuất, chưa triển khai.

Tiêu chí hoàn thành:

- Link mở trên trình duyệt chưa đăng nhập ChatGPT vẫn đến màn hình đăng nhập của app.
- Google login, callback, đăng xuất và phiên hết hạn hoạt động.
- Chỉ tài khoản được gia đình cho phép mới gọi được AI hoặc đọc dữ liệu học sinh.
- API kiểm tra phiên phía máy chủ; không tin email hoặc user ID do browser tự khai báo.
- API key OpenAI không xuất hiện trong client bundle.
- Kiểm thử cả truy cập hợp lệ, chưa đăng nhập và tài khoản không được cấp quyền.

Lưu ý: Sites private gate chạy trước ứng dụng; thêm nút Google trong UI không tự bỏ được cổng này. Cần xác minh phương án hosting/access được hỗ trợ, hoặc chuyển hosting khi được người dùng đồng ý. Không mở public rồi để endpoint AI không có xác thực thay thế. Cấu hình Google cần OAuth client của chủ dự án và callback URL thật; không yêu cầu gửi Client Secret qua chat.

### P1 — Tiến độ theo tài khoản

Thiết kế dữ liệu một học sinh và quyền xem của phụ huynh. Kiểm soát truy cập ở server/database; nếu dùng Supabase, bật RLS đúng quyền sở hữu. Có luồng nhập dữ liệu local cũ với xác nhận của gia đình và xử lý xung đột giữa thiết bị.

### P2 — Chất lượng học và ngân hàng câu hỏi

Thêm câu có nguồn, rà soát đáp án mơ hồ; tách bài đánh giá tương đương và bài ôn. Chỉ nhận xét tiến bộ trong phạm vi dữ liệu đủ hỗ trợ. Không dùng điểm XP làm thang trình độ tiếng Anh.

## Nguồn nội dung

PDF nội bộ (không có trên GitHub) `reference/asmo-grade6-practice.pdf`: 40 câu và đáp án; đã nhập vào bank. Câu 36 đổi “before 15 June” thành “by 15 June” để khớp đáp án nguồn.

PDF nội bộ (không có trên GitHub) `reference/asmo-practice-52-questions.pdf`: đã đọc tham khảo, chưa nhập vào bank vì không có đáp án đi kèm.

Chưa xác nhận hai PDF là đề chính thức. Không mặc định cấu trúc 40 câu/60 phút là cấu trúc chính thức của ASMO.
