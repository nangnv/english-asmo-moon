# Ngân hàng câu hỏi

Tài liệu cho người và Agent thêm câu vào `src/bank.json`. Các quy tắc ở đây được `tests/bank.test.mjs` kiểm tra tự động.

## Cấu trúc một câu

```json
{"id":"cv-001","category":"vocab","type":"synonym","prompt":"...","choices":["a","b","c","d"],"answer":1,
 "explanation":"Giải thích tiếng Việt","passage":"","source":"Claude soạn · đã kiểm tra chéo","level":2}
```

- `category`: `vocab`, `grammar`, `cloze`, `reading`.
- `type` (dạng bài) quyết định Moon được luyện gì ở chế độ "Luyện dạng con hay sai", và quyết định nội dung Dashboard cùng email gửi phụ huynh. Danh sách dạng bài và cách khắc phục nằm trong `TYPES` ở `src/core.js`.
  - `vocab`: synonym, antonym, collocation, word-form, phrasal-verb, idiom, word-choice, spelling.
  - `grammar`: verb-tense, subject-verb, conditional, relative-clause, passive, reported-speech, comparison, gerund-infinitive, preposition, modal, article-quantifier, connector, punctuation.
  - `cloze`: mỗi chỗ trống dùng dạng vocab/grammar mà nó thực sự kiểm tra.
  - `reading`: main-idea, detail, inference, vocab-in-context, purpose, sequence, reference.
- `level`: 1 = A2, 2 = B1 (trọng tâm ASMO lớp 6), 3 = B2 (bước đệm lên IELTS).
- Câu điền từ và đọc hiểu: mỗi đoạn văn có 6 câu, câu nào cũng mang đầy đủ đoạn văn. App phục vụ các câu cùng một đoạn liền nhau.

## Quy tắc chất lượng

- Chỉ có một đáp án đúng, không gây tranh cãi trong tiếng Anh Anh hoặc Anh Mỹ. Người kiểm tra phải tự giải câu hỏi trước khi xem đáp án.
- Lời giải bằng tiếng Việt đơn giản, nói vì sao đáp án đúng và vì sao đáp án nhiễu chính sai.
- Vị trí đáp án đúng chia đều cho 4 lựa chọn. Đáp án đúng không thường xuyên là lựa chọn dài nhất.
- Nội dung tự soạn, không chép đề ASMO, Cambridge hay IELTS đã công bố. Chủ đề phù hợp với trẻ em. Dữ kiện thực tế chỉ giữ khi chắc chắn.
- Không lặp lại câu hoặc đoạn văn đã có.
- Mỗi lô câu mới qua hai lượt kiểm tra: một agent soạn, một agent khác kiểm tra độc lập. Sau đó con người duyệt PR trước khi lên web.

## Cập nhật hằng tuần

1. Agent Claude chạy theo lịch mỗi tuần một lần. Agent đếm số câu còn lại theo dạng bài, soạn khoảng 40 câu cho các dạng còn ít câu và các dạng trong mục "Ưu tiên" bên dưới, kiểm tra chéo, chạy `npm test` và `npm run build`, rồi mở PR vào `main`. Agent không tự merge.
2. Phụ huynh đọc lướt PR và bấm Merge.
3. GitHub Action `Deploy to Cloudflare` chạy lại kiểm thử rồi đưa bản mới lên https://asmo-english.nangnv88.workers.dev.

Câu đã thêm không bị xóa hoặc đổi `id`, vì tiến độ của Moon gắn với `id`. Muốn sửa một câu sai thì sửa nội dung và giữ nguyên `id`.

## Ưu tiên

Phụ huynh xem mục "Cần luyện thêm" trên Dashboard rồi ghi dạng bài cần thêm câu vào đây, mỗi dòng một `type`. Agent hằng tuần dành khoảng một nửa số câu mới cho các dạng này.

Ví dụ: `verb-tense`, `inference`. Hiện chưa có ưu tiên nào.

<!-- priorities: start -->
<!-- priorities: end -->
