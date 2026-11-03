# Triển khai lên Cloudflare (đăng nhập Google, lưu tiến độ)

Hướng dẫn dành cho phụ huynh, chủ của tài khoản Cloudflare và Google Cloud. Sau khi làm xong, Moon học tại một địa chỉ dạng `https://asmo-english.<tên-của-bạn>.workers.dev`, đăng nhập bằng Google, tiến độ được lưu trên server và mở được từ máy khác. Không cần tài khoản ChatGPT.

Chi phí: gói miễn phí của Cloudflare Workers và D1 đủ cho một gia đình. Google OAuth miễn phí. Chỉ Gia sư AI (OpenAI) tính tiền, và đó là tùy chọn.

## Cách hoạt động

- Worker trong `worker/index.js` phục vụ trang web và API. Khi có cơ sở dữ liệu D1 (binding `DB`), Worker bật chế độ đăng nhập Google:
  - Người chưa đăng nhập chỉ thấy màn hình đăng nhập.
  - Chỉ những email có trong secret `ACCOUNTS` mới vào được.
  - Phiên đăng nhập kéo dài 30 ngày, lưu trong cookie `HttpOnly` và `Secure`. D1 chỉ giữ bản băm của cookie.
- Tài khoản học sinh lưu tiến độ lên D1 sau mỗi lần trả lời. Mỗi bản lưu có số phiên bản (version), nên hai máy không ghi đè lên nhau mà được gộp lại.
- Tài khoản phụ huynh chỉ xem được tiến độ, không làm bài và không sửa được.
- Gỡ một email khỏi `ACCOUNTS` sẽ chặn ngay mọi phiên đăng nhập của email đó.

## Việc cần chuẩn bị

- Email Google của Moon và email Google của phụ huynh.
- Máy có Node.js 22 trở lên và repo này. Lệnh `npx wrangler` tự tải công cụ của Cloudflare, không thêm thư viện vào repo.

## Bước 1. Tạo tài khoản Cloudflare và đăng nhập trong Terminal

1. Đăng ký miễn phí tại https://dash.cloudflare.com/sign-up.
2. Trong Terminal, ở thư mục repo:

   ```sh
   npx wrangler login
   ```

   Trình duyệt sẽ mở ra; bấm cho phép.

## Bước 2. Tạo cơ sở dữ liệu

```sh
npx wrangler d1 create asmo-english
```

Lệnh sẽ in ra `database_id`. Dán giá trị đó vào `wrangler.toml`, thay cho `REPLACE_WITH_D1_DATABASE_ID`. Đây là mã định danh, không phải mật khẩu, nên commit được.

Tạo các bảng:

```sh
npx wrangler d1 migrations apply asmo-english --remote
```

## Bước 3. Deploy lần đầu để có địa chỉ web

```sh
npm test && npm run build && npx wrangler deploy
```

Wrangler in ra địa chỉ, ví dụ `https://asmo-english.ten-cua-ban.workers.dev`. Nếu Cloudflare hỏi tên miền phụ `workers.dev`, hãy chọn một tên không chứa họ tên của con.

Lúc này mở địa chỉ đó sẽ thấy màn hình đăng nhập, nhưng bấm "Đăng nhập bằng Google" sẽ báo "Đăng nhập chưa được cấu hình". Đây là trạng thái đúng: chưa ai vào được.

## Bước 4. Tạo OAuth client trên Google Cloud

1. Mở https://console.cloud.google.com/, tạo project mới, ví dụ "ASMO English".
2. Vào **Google Auth Platform**:
   - **Branding:** tên ứng dụng "ASMO English" và email hỗ trợ của bạn.
   - **Audience:** chọn **External** và giữ trạng thái **Testing**. Thêm email của Moon và của bạn vào **Test users**. Như vậy Google cũng chặn thêm một lớp nữa.
3. Vào **Clients**, tạo client mới:
   - Application type: **Web application**.
   - Authorized redirect URIs: `https://asmo-english.<tên-của-bạn>.workers.dev/auth/callback`. Địa chỉ phải khớp chính xác địa chỉ ở bước 3.
4. Google hiển thị **Client ID** và **Client secret**. Để cửa sổ đó mở cho bước 5. Không gửi Client secret qua chat hay email.

## Bước 5. Đặt secret cho Worker

Mỗi lệnh dưới đây sẽ hỏi giá trị. Bạn tự dán giá trị vào Terminal; giá trị không được lưu trong repo.

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put ACCOUNTS
```

Giá trị cho `ACCOUNTS` có dạng (thay bằng email thật):

```text
student:email-cua-moon@gmail.com,parent:email-phu-huynh@gmail.com
```

Có thể thêm nhiều phụ huynh, cách nhau bằng dấu phẩy. Hiện app chỉ hỗ trợ một học sinh.

Nếu muốn dùng Gia sư AI (tùy chọn, tính phí theo OpenAI):

```sh
npx wrangler secret put OPENAI_API_KEY
```

## Bước 6. Kiểm tra

Mở địa chỉ web trong cửa sổ ẩn danh rồi kiểm tra:

- [ ] Chưa đăng nhập thì chỉ thấy màn hình "Đăng nhập bằng Google".
- [ ] Đăng nhập bằng email của Moon thì vào được app. Menu hồ sơ ghi "Học sinh" và "✓ Đã lưu vào tài khoản".
- [ ] Làm 1–2 câu, mở địa chỉ trên một máy khác và đăng nhập email của Moon, thấy cùng tiến độ.
- [ ] Đăng nhập bằng email phụ huynh thì thấy dải "Phụ huynh đang xem tiến độ (chỉ xem)" và không bắt đầu được bài.
- [ ] Đăng nhập bằng một email khác thì bị chặn: Google báo ứng dụng chưa được phép (email không có trong Test users), hoặc app báo "Tài khoản này chưa được phép".
- [ ] Bấm "Đăng xuất" thì quay lại màn hình đăng nhập.

## Bước 7. Chuyển tiến độ cũ của Moon sang

Tiến độ trên website cũ (ChatGPT Sites) nằm trong trình duyệt và gắn với địa chỉ cũ, nên địa chỉ mới không tự đọc được. Cách chuyển:

1. Trên website cũ, mở **Góc phụ huynh** và bấm **Xuất bản sao**. Một tệp JSON sẽ được tải về.
2. Trên website mới, đăng nhập bằng **email của Moon**, mở **Góc phụ huynh**, bấm **Nhập bản sao** và chọn tệp vừa tải.
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
- Chưa có tên miền riêng. Có thể gắn sau trong Cloudflare (Workers → Settings → Domains & Routes) và thêm redirect URI mới vào Google.
- Giới hạn lượt gọi AI vẫn tính trong bộ nhớ của từng Worker, chưa phải giới hạn chi phí cố định.
