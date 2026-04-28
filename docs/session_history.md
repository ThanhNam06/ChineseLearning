# Project Session History & Status Tracking

Tài liệu này lưu trữ lịch sử trạng thái của dự án theo từng phiên làm việc, tuân thủ theo [ANTIGRAVITY AI PROTOCOL](./antigravity_protocol.md).

## Phiên làm việc: 2026-04-28 (Session 5 - UI Upgrade, Privacy/Security Pages, Bug Fixes)
### [STATUS]
- **AI Model:** Chuyển toàn bộ 3 Edge Functions (ai-chat, ai-score, ai-feedback) sang model `tencent/hy3-preview:free` với fallback `google/gemini-2.0-flash-lite-preview-02-05:free`.
- **AI Bug Fix:** Thêm `cleanJSON()` helper vào ai-score & ai-feedback để xử lý markdown wrapper (` ```json ``` `) mà Tencent model thường trả về, khắc phục lỗi 400 Bad Request.
- **Frontend Auth:** Chuyển `ai-feedback` và `srs-calculate-review` từ `fetch()` thuần sang `supabase.functions.invoke()` trong `aiProvider.js` để tránh lỗi 401 Unauthorized.
- **Privacy Page:** Tạo mới trang `/privacy` với thiết kế premium: gradient hero, staggered card sections, CTA footer.
- **Security Page:** Tạo mới trang `/security` với dark hero, stats grid, 6-feature card grid có badges, và CTA báo cáo bảo mật.
- **Routes:** Đã thêm `/privacy` và `/security` vào `App.jsx` và gắn link vào sidebar footer của `MainLayout.jsx`.
- **Leaderboard Fix:** Thay thế `Loader2` (gây ReferenceError do bundle cache cũ) bằng component `Spinner` inline. Thêm `motion.div` animation staggered cho từng row.
- **Push Subscriptions Fix:** Thêm UNIQUE constraint trên `user_id, endpoint` và cập nhật logic `App.jsx` để theo dõi `last_seen_at` + heartbeat qua `visibilitychange` & setInterval.
- **Home UI:** Thêm Framer Motion animations cho hero banner, chữ Hán xoay tròn, và lesson cards có hover effect.
- **SmartReview Mode:** Thêm màn hình flashcard toàn màn hình (SmartReview.jsx) tự động lấy các thẻ đến hạn, hỗ trợ phím tắt và SRS grading.
- **Session Complete:** Thêm màn hình chúc mừng (SessionComplete.jsx) có hiệu ứng Confetti CSS khi học xong 5 thẻ hoặc hoàn tất SmartReview.
- **AI Contextual Greeting:** AI Tutor tự động gợi ý sử dụng 1 từ vựng mà user vừa ôn trong vòng 24h qua ở câu chào đầu tiên.
- **Echo AI (Battle Royale):** Chế độ Nhại lại AI - Khi bắt đầu trận đấu, AI tự động phát âm câu thử thách, người chơi phải nghe và đọc lại chuẩn xác để giành điểm. Có thêm nút "Nghe lại" trong trận.

### [BACKLOG]
- Cần kiểm tra tất cả 3 Edge Functions với account thật sau khi đổi model Tencent để xác nhận fallback hoạt động.
- Battle Royale 4 người cần test latency thực tế.
- Trang Learning Center routing vẫn cần kiểm tra kỹ hơn.

### [NEXT STEPS]
1. Kiểm tra lại trang Leaderboard trong trình duyệt để xác nhận lỗi Loader2 đã biến mất sau khi build lại.
2. Test luồng Speaking → ai-score và Writing → ai-feedback để xác nhận model Tencent hoạt động end-to-end.
3. Cân nhắc thêm trang Terms of Service (`/terms`) để hoàn thiện bộ tài liệu pháp lý của nền tảng.


- **Edge Caching:** Tích hợp cơ chế cache in-memory cho `ai-chat` để giảm thiểu chi phí API và tăng tốc độ phản hồi.
- **Bug Fix:** Khắc phục lỗi `ReferenceError: session is not defined` bằng cách chuyển logic đăng ký Push Notification vào `useEffect` trong `App.jsx`, đảm bảo bối cảnh (context) Redux và Supabase Auth luôn sẵn sàng.

### [BACKLOG]
- Cần chạy lệnh `supabase secrets set OPENROUTER_API_KEY=...` để các Edge Function hoạt động ổn định trong môi trường production.
- Tính năng Battle Royale 4 người cần kiểm tra độ trễ (latency) khi có nhiều broadcast đồng thời.

### [NEXT STEPS]
1. Tối ưu hóa UI cho mobile của trang Đấu Trường khi có 4 người chơi (layout grid).
2. Thêm âm thanh hiệu ứng (Sound Effects) khi chiến thắng hoặc ghi điểm trong Đấu Trường.
3. Xây dựng trang "Lịch sử đấu" để người chơi xem lại các trận Battle đã qua.

## Phiên làm việc: 2026-04-28 (Session 3 - AI LLM & Social Gamification)
### [STATUS]
- Đã thiết lập Supabase Edge Function `ai-chat` làm proxy trung gian an toàn gọi trực tiếp OpenRouter API (sử dụng Gemini 2.5 Flash).
- Tích hợp thành công `ai-chat` vào trang AI Tutor 1-1.
- Xây dựng Supabase Edge Function `push-notifications` với kịch bản Cron Job quét tiến độ SRS và trả về danh sách user đến hạn.
- Đã thêm widget Thống kê phân bố từ vựng theo HSK (HSK Dashboard) vào trang Home.
- Phát triển thành công tính năng "Đấu Trường" (Battle) sử dụng Supabase Realtime Channels & Presence để 2 user có thể so tài phát âm trực tuyến.

### [BACKLOG]
- Hàm Push Notifications cần cấu hình crontab thực tế trên Supabase và Web Push VAPID keys ở Client để gửi thông báo đẩy đến trình duyệt.
- Tính năng Đấu Trường hiện sử dụng cơ chế chấm điểm mô phỏng dựa trên Deepgram STT, cần điều chỉnh độ nhạy điểm số.

### [NEXT STEPS]
1. Kết nối Backend với VAPID Web Push để nhận thông báo trình duyệt thực sự.
2. Nâng cấp hệ thống bạn bè (Friend List) để người dùng có thể mời trực tiếp thay vì ghép ngẫu nhiên.
3. Bổ sung Leaderboard tuần/tháng cụ thể cho điểm số Đấu Trường.

## Phiên làm việc: 2026-04-28 (Session 2 - Tối ưu hóa UI/UX và Features)
- **Speaking (Luyện Nói):** Đã thêm ô nhập văn bản (Custom Input) để người dùng tự do nhập câu tiếng Trung muốn luyện tập. Nâng cấp thuật toán dự phòng (Fallback) khi không có mạng để đối chiếu chính tả một cách chính xác nhất. Sửa lỗi trùng lặp khai báo `feedbackProvider`.
- **Writing (Luyện Viết):** Đã nâng cấp UI, bổ sung thêm khung "Tự chọn chữ khó" để người dùng nhập bất kỳ một chữ Hán (như 赢, 繁) và AI sẽ vẽ/hướng dẫn nét cho chữ đó.
- **Learning (Luyện Đọc/Nghe):** Bổ sung mục "✍️ Tự nhập văn bản" trong danh sách bài học. Người dùng có thể copy/paste một bài báo hoặc văn bản dài, sau đó bấm nút "Nghe" để hệ thống tự động đọc và hiển thị Pinyin mà không cần Audio File.
- **Đóng Góp (Admin):** Cập nhật giao diện Đóng Góp, thay đổi thông báo để người dùng nhận thức rõ các bài học/từ vựng họ thêm vào sẽ tự động Public ngay lập tức lên web.

## Phiên làm việc: 2026-04-28 (Session 1)

### [STATUS]
- **Kiến trúc:** Chuyển đổi thành công sang kiến trúc Supabase hoàn toàn.
- **Frontend:**
  - Tích hợp Redux Toolkit cho State Management.
  - Hệ thống Authentication hoàn thiện (Auth.jsx, authSlice.js).
  - Tích hợp Deepgram cho chuyển đổi âm thanh thành văn bản (Speaking.jsx).
  - Tích hợp Hanzi Writer cho hoạt ảnh viết chữ Hán (Writing.jsx).
  - Hệ thống Flashcard (Vocabulary.jsx) với khả năng mở rộng SRS.
- **Backend:** Sử dụng Supabase làm backend-as-a-service (BaaS) cho Database, Auth và Storage.
- **Protocol:** Đã thiết lập file `antigravity_protocol.md` và `workflow.md`.

### [BACKLOG]
- Cần tối ưu hóa hiệu suất load của Hanzi Writer khi có nhiều chữ trên cùng một trang.
- Chưa có hệ thống thông báo (Notifications) cho người dùng khi hoàn thành task.
- Logic Spaced Repetition (SRS) trong Vocabulary cần được hiện thực hóa phía DB (Supabase Functions/Tables).

### [NEXT STEPS]
1. Thiết kế schema DB cho Spaced Repetition (SRS) trên Supabase (bảng `user_progress`, `flashcards_history`).
2. Tối ưu hóa UI/UX cho trang Speaking, thêm phản hồi AI về phát âm (Pronunciation Assessment).
3. Triển khai hệ thống thông báo Toast để cải thiện trải nghiệm người dùng khi thao tác.

---
*Cập nhật bởi: Antigravity AI*
