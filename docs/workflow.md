# Quy Trình Quản Lý Nhật Ký Dự Án (Workflow)

Tài liệu này hướng dẫn các bước thực hiện việc tổng hợp và cập nhật nhật ký cho các dự án phát triển phần mềm, đảm bảo tính liên tục và khả năng theo dõi tiến độ hiệu quả.

## 1. Đọc và Tổng hợp Nhật ký Dự án
Mục tiêu: Thu thập thông tin từ các nguồn dữ liệu thô để nắm bắt trạng thái hiện tại của hệ thống và các công việc đã thực hiện.

* **Truy xuất dữ liệu:** Kiểm tra các file nhật ký thô (`.log`), các ghi chú ngắn trong quá trình coding hoặc các thông báo commit từ Git.
* **Phân tích nội dung:** * Xác định các tác vụ đã hoàn thành.
    * Liệt kê các lỗi (bugs) phát sinh và trạng thái xử lý.
    * Ghi nhận các thay đổi về cấu trúc thư mục hoặc kiến trúc hệ thống.
* **Công cụ hỗ trợ:** Sử dụng các trình đọc log hoặc các script tự động để lọc thông tin quan trọng.

## 2. Viết Nhật ký Dự án cho Từng Phần Lớn
Mục tiêu: Chuyển đổi thông tin thô thành báo cáo có cấu trúc cho từng module hoặc thành phần quan trọng của dự án.

### Cấu trúc đề xuất cho mỗi phần:
Mỗi phần lớn (ví dụ: Frontend, Backend, AI Agent, Database) nên được ghi chép theo định dạng sau:

#### [Tên Phần/Module] - Cập nhật ngày: DD/MM/YYYY
* **Mục tiêu chính:** Tóm tắt ngắn gọn mục tiêu của module trong giai đoạn này.
* **Công việc đã thực hiện:** * Liệt kê chi tiết các tính năng đã triển khai.
    * Các thay đổi trong logic xử lý hoặc cấu hình (ví dụ: thay đổi trong file `.env`, cập nhật API endpoint).
* **Vấn đề & Giải pháp:**
    * Mô tả các khó khăn gặp phải trong quá trình đọc nhật ký thô.
    * Các giải pháp đã áp dụng để khắc phục lỗi.
* **Kế hoạch tiếp theo:** Các bước cần thực hiện cho phần này trong giai đoạn tới.

##### 3. Luôn đặt câu hỏi trước khi làm việc
hi hỏi xong phải lưu lại vào file nhật ký để sau này còn nhớ mình đã hỏi gì, và đã xử lý ra sao. 

---
*Ghi chú: File này cần được cập nhật thường xuyên sau mỗi phiên làm việc hoặc mỗi khi hoàn thành một mốc quan trọng (milestone). Luôn Luôn ghi lại các thông tin cần thiết cho phiên làm việc kế tiếp vào các file .md để tiện cho việc theo dõi và phát triển dự án. Nếu thấy file .md nào cần thiết thì hãy cập nhật luôn.*