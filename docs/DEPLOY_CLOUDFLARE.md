# Triển khai lên Cloudflare (đăng nhập bằng mật khẩu, lưu tiến độ)

Hướng dẫn dành cho phụ huynh, chủ của tài khoản Cloudflare. Sau khi làm xong, Moon học tại một địa chỉ dạng `https://asmo-english.<tên-của-bạn>.workers.dev`, đăng nhập bằng mật khẩu gia đình, tiến độ được lưu trên server và mở được từ máy khác. Không cần tài khoản ChatGPT.

Chi phí: gói miễn phí của Cloudflare Workers và D1 đủ cho một gia đình. Chỉ Gia sư AI (OpenAI) tính tiền, và đó là tùy chọn.

## Cách hoạt động

- Worker trong `worker/index.js` phục vụ trang web và API. `wrangler.toml` đặt `AUTH_MODE = "password"`:
  - Người chưa đăng nhập chỉ thấy ô nhập mật khẩu.
  - Có 2 mật khẩu, lưu trong secret của Cloudflare: `STUDENT_PASSWORD` (Moon học và lưu tiến độ) và `PARENT_PASSWORD` (chỉ xem).
  - Phiên đăng nhập kéo dài 30 ngày, lưu trong cookie `HttpOnly` và `Secure`. D1 chỉ giữ bản băm của cookie.
  - Một địa chỉ IP nhập sai 5 lần bị chặn 15 phút. Toàn hệ thống có 100 lần sai trong một giờ cũng bị chặn đăng nhập mới; người đã đăng nhập không bị ảnh hưởng.
- Đổi một mật khẩu sẽ đăng xuất mọi thiết bị đang dùng mật khẩu đó.
- Tiến độ lưu lên D1 sau mỗi lần trả lời. Mỗi bản lưu có số phiên bản (version), nên hai máy không ghi đè lên nhau mà được gộp lại.

## Việc cần chuẩn bị

Máy có Node.js 22 trở lên và repo này. Lệnh `npx wrangler` tự tải công cụ của Cloudflare, không thêm thư viện vào repo.

## Bước 1. Tạo tài khoản Cloudflare và đăng nhập trong Terminal

1. Đăng ký miễn phí tại https://dash.cloudflare.com/sign-up.
2. Trong Terminal, ở thư mục repo: `npx wrangler login`. Trình duyệt mở ra; bấm cho phép.

## Bước 2. Tạo cơ sở dữ liệu

```sh
npx wrangler d1 create asmo-english
```

Dán `database_id` được in ra vào `wrangler.toml`. Đây là mã định danh, không phải mật khẩu, nên commit được. Sau đó tạo các bảng:

```sh
npx wrangler d1 migrations apply asmo-english --remote
```

## Bước 3. Deploy

```sh
npm test && npm run build && npx wrangler deploy
```

Wrangler in ra địa chỉ web. Trước khi đặt mật khẩu, trang báo "Đăng nhập chưa được cấu hình" và chưa ai vào được.

## Bước 4. Đặt mật khẩu

Mỗi lệnh sẽ hỏi giá trị. Bạn tự gõ vào Terminal, không gửi qua chat hay email. Hai mật khẩu phải khác nhau; nên dài ít nhất 12 ký tự, không chứa tên hay ngày sinh của con.

```sh
npx wrangler secret put STUDENT_PASSWORD
npx wrangler secret put PARENT_PASSWORD
```

Chạy lại lệnh để đổi mật khẩu khi quên hoặc nghi bị lộ.

Nếu muốn dùng Gia sư AI (tùy chọn, tính phí theo OpenAI): `npx wrangler secret put OPENAI_API_KEY`.

## Bước 5. Kiểm tra

Mở địa chỉ web trong cửa sổ ẩn danh rồi kiểm tra:

- [ ] Chưa đăng nhập thì chỉ thấy ô mật khẩu.
- [ ] Mật khẩu của Moon vào được app; menu hồ sơ ghi "Học sinh" và "✓ Đã lưu vào tài khoản".
- [ ] Làm 1–2 câu, mở trên một máy khác bằng mật khẩu của Moon, thấy cùng tiến độ.
- [ ] Mật khẩu phụ huynh thấy dải "Phụ huynh đang xem tiến độ (chỉ xem)" và không bắt đầu được bài.
- [ ] Mật khẩu sai bị từ chối.
- [ ] Bấm "Đăng xuất" thì quay lại màn hình đăng nhập.

## Bước 6. Chuyển tiến độ cũ của Moon sang

Tiến độ trên website cũ (ChatGPT Sites) nằm trong trình duyệt và gắn với địa chỉ cũ, nên địa chỉ mới không tự đọc được. Cách chuyển:

1. Trên website cũ, mở **Góc phụ huynh** và bấm **Xuất bản sao**. Một tệp JSON sẽ được tải về.
2. Trên website mới, đăng nhập bằng **mật khẩu của Moon**, mở **Góc phụ huynh**, bấm **Nhập bản sao** và chọn tệp vừa tải.
3. Tiến độ được lưu lên tài khoản. Xóa tệp JSON sau khi chuyển xong.

Giữ website cũ cho đến khi website mới chạy ổn vài ngày.

## Cập nhật sau này

Mỗi khi `main` có thay đổi:

```sh
git pull && npm test && npm run build && npx wrangler deploy
```

Nếu có thêm tệp trong `migrations/`, chạy lại lệnh `migrations apply` ở bước 2 trước khi deploy.

## Giới hạn

- Khi hai máy cùng học một lúc, câu trả lời và các phiên đã xong được gộp đủ. Tuy vậy, XP lấy giá trị lớn hơn thay vì cộng dồn, và bài đang làm dở chỉ giữ bản của máy lưu sau cùng.
- Phụ huynh chỉ xem. Muốn đổi ngày thi hay phần thưởng thì làm trên tài khoản của Moon.
- Chưa có tên miền riêng. Có thể gắn sau trong Cloudflare (Workers → Settings → Domains & Routes).
- Đăng nhập Google vẫn có trong code: đặt `AUTH_MODE = "google"` và các secret `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ACCOUNTS` (dạng `student:<email>,parent:<email>`), kèm OAuth client Web có redirect URI `<địa chỉ web>/auth/callback`. Luồng Google thật chưa được kiểm tra.
- Giới hạn lượt gọi AI vẫn tính trong bộ nhớ của từng Worker, chưa phải giới hạn chi phí cố định.
