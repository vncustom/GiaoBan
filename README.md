# GIAO BAN HTV - HỆ THỐNG QUẢN LÝ CUỘC HỌP GIAO BAN HẰNG NGÀY

Ứng dụng web phục vụ quản lý, theo dõi biên bản cuộc họp giao ban, kế hoạch tuyên truyền và các chỉ đạo hằng ngày của Ban Tổng Giám đốc tại **Đài Phát thanh và Truyền hình Thành phố Hồ Chí Minh (HTV)**.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. 📌 Chỉ đạo Tổng Giám đốc (Hero Section)
- **Mặc định hiển thị**: Tự động lọc và hiển thị chỉ đạo của **Ngày hiện tại và Ngày hôm qua** (hỗ trợ cơ chế tự động tìm ngày gần nhất nếu hôm nay chưa diễn ra giao ban).
- **Chỉ đạo ngoài cuộc họp**: Thành viên Ban Tổng Giám đốc (`CaoAnhMinh-TGD`, `vai_tro='BanTGD'`) và Admin có thể thêm trực tiếp chỉ đạo đột xuất ngoài các phiên giao ban định kỳ.
- **Bộ lọc đa năng**:
  - Lọc theo khoảng thời gian nhanh: **Hôm nay & Hôm qua**, **7 ngày qua**, **Tất cả các ngày**, hoặc **chọn một ngày cụ thể** trên lịch.
  - Lọc chỉ đạo theo từng **Ban / Trung tâm / Đơn vị** được phân công việc.
- **Trình bày trực quan**: Các chỉ đạo được nhóm theo từng ngày kèm số lượng nhiệm vụ, hiển thị đơn vị nhận việc, nội dung chỉ đạo, mức độ ưu tiên và thời hạn hoàn thành.

### 2. 📣 Kế hoạch tuyên truyền (Mới)
- **Vị trí**: Đặt nổi bật phía trước mục "Sự kiện sắp tới".
- **Giao diện thanh bar ngang tinh gọn**: 
  - Phần ngày tháng năm được bố trí thành **thanh bar ngang trên đầu thẻ** kèm badge trạng thái thời gian ("Hôm nay", "Ngày mai", "Còn X ngày"), giúp tiết kiệm diện tích tối đa.
  - Tên hoạt động in đậm rõ ràng ngay bên dưới thanh bar.
  - **Địa điểm**: Tự động rút gọn lấy tối đa 10 từ đầu kèm `...` để thẻ luôn cân đối, tránh tràn viền.
- **Khu vực cuộn chuyên biệt**: Danh sách thẻ nằm trong khung cuộn mượt mà (`Scroll container`), không gây rối mắt khi có nhiều kế hoạch.
- **Bộ lọc thời gian linh hoạt**:
  - **Tháng này (Mặc định)**: Xem các kế hoạch diễn ra trong tháng hiện tại.
  - **Tuần này**: Xem kế hoạch trong tuần hiện tại.
  - **Tất cả**: Xem toàn bộ kế hoạch.
- **Xuất Excel (Export .xlsx)**: Nút `📊 Xuất Excel` cho phép tải danh sách kế hoạch tuyên truyền về máy tính thành file bảng tính Excel chuẩn, có định dạng tiêu đề, màu sắc, viền và độ rộng cột tự động.
- **Xem chi tiết**: Nhấn vào từng thẻ để mở modal xem đầy đủ 8 trường thông tin (Tên hoạt động, Thời gian, Danh nghĩa tổ chức, Đơn vị thực hiện, Địa điểm, Phân công đơn vị HTV, Đơn vị phối hợp, Ghi chú).
- **Quản trị**: Trưởng/Phó Ban Văn phòng Đài và Admin có nút thêm/sửa/xóa kế hoạch.

### 3. 📅 Sự kiện sắp tới (Tuần / Tháng)
- Hiển thị danh sách các sự kiện lớn, chương trình trọng điểm sắp diễn ra của Đài theo dạng thẻ trực quan.
- Hỗ trợ thêm/sửa/xóa sự kiện cho Ban Phụ trách Văn phòng Đài và Admin.

### 4. 📋 Quản lý Biên bản họp giao ban (Chuẩn 4 phần)
- **Phần I - Thông tin cuộc họp**: Thời gian, Địa điểm, Chủ trì, Thư ký, Thành phần tham dự.
- **Phần II.1 - Công tác nội dung và tuyên truyền**: Báo cáo tình hình phát sóng, tuyên truyền của từng Ban/Trung tâm.
- **Phần II.2 - Công tác điều hành chung**: Báo cáo hậu cần, cơ sở vật chất, kỹ thuật, an ninh trật tự của Văn phòng Đài.
- **Phần III - Ý kiến của Ban Tổng Giám đốc**: Các chỉ đạo, lưu ý nghiệp vụ của Ban TGĐ trong phiên họp.
- **Phần IV - Kết luận cuộc họp**: Các nhiệm vụ được giao cụ thể cho từng Ban kèm thời hạn hoàn thành.
- **Quy trình Công bố**:
  - Khi cuộc họp ở trạng thái **Bản nháp (Draft)**: Trưởng/Phó các Ban được phép nhập, chỉnh sửa báo cáo của ban mình.
  - Khi Văn phòng Đài / Admin chuyển sang **Đã công bố (Published)**: Báo cáo của các ban khác sẽ tự động bị khóa (chỉ xem), bảo đảm tính toàn vẹn của biên bản đã kết luận.

### 5. 🌓 Giao diện Sáng / Tối (Light Mode & Dark Mode)
- **Mặc định Light Mode**: Thiết kế thanh lịch, phối màu xanh/cam/trắng chuẩn phong cách văn phòng, độ tương phản cao, tối ưu trải nghiệm đọc.
- **Chuyển đổi giao diện**: Nút Toggle trên Header cho phép đổi nhanh giữa Light/Dark Mode, lưu trạng thái tự động vào trình duyệt.

### 6. 🔐 Xác thực kép (HTV SSO & Local Auth)
- Tích hợp **HTV SSO** trực tiếp: App tự động đọc nguyên gốc `vai_tro` từ SSO (`BanTGD`, `truong_ban`, `pho_ban`, `truong_phong`, `nhan_vien`) mà không cần ánh xạ thủ công.
- Đăng nhập tài khoản nội bộ (Local `Admin`) dự phòng khi hệ thống SSO cần bảo trì.

---

## 🔒 MA TRẬN PHÂN QUYỀN (RBAC)

| Đối tượng / Vai trò | Xem dữ liệu | Tạo / Sửa Cuộc họp | Nhập / Sửa Báo cáo (Chưa công bố) | Nhập / Sửa Báo cáo (Đã công bố) | Chỉ đạo ngoài họp | Sự kiện & Kế hoạch tuyên truyền | Xóa cuộc họp | Quản trị User |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Local Admin / SSO Admin** | ✅ | ✅ | ✅ *(Tất cả ban)* | ✅ *(Tất cả ban)* | ✅ | ✅ | ✅ | ✅ |
| **Trưởng/Phó Ban Văn phòng Đài** | ✅ | ✅ | ✅ *(Tất cả ban)* | ✅ *(Tất cả ban)* | ✅ | ✅ | ❌ | ❌ |
| **Ban Tổng Giám đốc (`BanTGD`)** | ✅ | ✅ | ✅ *(Tất cả ban)* | ✅ *(Tất cả ban)* | ✅ | ✅ | ❌ | ❌ |
| **Trưởng/Phó Ban các Ban khác** | ✅ | ❌ | ✅ *(Chỉ Ban mình)* | ❌ *(Bị khóa khi Published)* | ❌ | ❌ | ❌ | ❌ |
| **Nhân viên (`nhan_vien`)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

```
c:\Users\lyhan\Documents\GitHub\GiaoBan\
├── .gitignore                  # Cấu hình loại trừ file khi quản lý mã nguồn Git
├── README.md                   # Tài liệu hướng dẫn sử dụng và triển khai hệ thống
├── main.py                     # Backend FastAPI, API endpoints, phân quyền RBAC
├── db_service.py               # Database Service (SQLite / Sẵn sàng cho MS SQL Server)
├── htv_sso_fastapi.py          # Module tích hợp HTV SSO (Xử lý JWT, Leeway đồng bộ giờ)
├── giaoban.db                  # File CSDL SQLite
├── requirements.txt            # Danh sách thư viện Python phụ thuộc
├── run.bat                     # Script kích hoạt server (Port 8002)
├── setup_and_run.bat           # Script cài đặt môi trường ảo và khởi động tự động
├── templates/
│   └── index.html              # Giao diện Single Page Application (SPA)
└── static/
    ├── logo.png                # Logo HTV
    ├── css/
    │   └── style.css           # CSS hệ thống (Giao diện Sáng / Tối, Kế hoạch tuyên truyền)
    └── js/
        └── app.js              # Logic giao diện, phân quyền, API client, CRUD Modals
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY

### 1. Khởi chạy tự động (Khuyên dùng trên Windows)
- **Lần đầu tiên trên máy mới**:
  Nhấp đúp chuột vào file `setup_and_run.bat`. Chương trình sẽ:
  1. Tự động tạo môi trường ảo Python riêng theo tên máy (`.venv_%COMPUTERNAME%`).
  2. Tự động cài đặt đầy đủ các thư viện trong `requirements.txt`.
  3. Tự động mở trình duyệt web tại địa chỉ: `http://127.0.0.1:8002`.

- **Các lần chạy tiếp theo**:
  Nhấp đúp chuột vào file `run.bat`.

### 2. Khởi chạy thủ công bằng dòng lệnh
```bash
# 1. Kích hoạt môi trường ảo
.venv_PHTL-KT02\Scripts\activate

# 2. Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# 3. Khởi động máy chủ Uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --timeout-keep-alive 30
```

---

## 🔑 TÀI KHOẢN MẶC ĐỊNH

Khi khởi tạo cơ sở dữ liệu lần đầu, hệ thống tự động tạo sẵn tài khoản quản trị local:
- **Tên đăng nhập**: `admin`
- **Mật khẩu**: `KTphtl`
- **Vai trò**: `Admin` (Full tất cả các quyền)
- **Đơn vị**: `Văn phòng Đài`

---

## 🗄️ CẤU HÌNH CƠ SỞ DỮ LIỆU MICROSOFT SQL SERVER

Hệ thống kết nối trực tiếp với **MS SQL Server** qua thư viện `pyodbc` (hỗ trợ cả ODBC Driver 18 và 17 for SQL Server).

### Thông tin cấu hình mặc định (trong `db_service.py` hoặc biến môi trường):
- **Server (`MSSQL_SERVER`)**: `PHTL-KTWEB\SQLEXPRESS` (tự động fallback sang `.\SQLEXPRESS` khi chạy local)
- **Database (`MSSQL_DATABASE`)**: `DB_Giaoban`
- **User (`MSSQL_USER`)**: `web_htv`
- **Password (`MSSQL_PASSWORD`)**: `HtvWeb@2026!`
- **Driver (`MSSQL_DRIVER`)**: `ODBC Driver 18 for SQL Server`

Các bảng trong cơ sở dữ liệu:
1. `Users`: Quản trị tài khoản & phân quyền
2. `Meetings`: Cuộc họp giao ban hằng ngày
3. `MeetingReports`: Báo cáo nội dung & điều hành của các đơn vị
4. `Directives`: Chỉ đạo Ban Tổng Giám đốc & kết luận cuộc họp
5. `Events`: Sự kiện sắp tới
6. `PropagandaPlans`: Kế hoạch tuyên truyền

---

## 🌐 DANH SÁCH API ENDPOINTS

### Kế hoạch tuyên truyền (Propaganda Plans)
- `GET /api/propaganda-plans?upcoming=true&days=90`: Lấy danh sách kế hoạch sắp tới.
- `GET /api/propaganda-plans/{id}`: Lấy chi tiết 1 kế hoạch.
- `POST /api/propaganda-plans`: Thêm mới kế hoạch (Văn phòng Đài / Admin).
- `PUT /api/propaganda-plans/{id}`: Cập nhật kế hoạch (Văn phòng Đài / Admin).
- `DELETE /api/propaganda-plans/{id}`: Xóa kế hoạch (Văn phòng Đài / Admin).

### Biên bản cuộc họp & Báo cáo
- `GET /api/meetings`: Lấy danh sách cuộc họp (lọc theo ngày/tuần/tháng).
- `POST /api/meetings`: Tạo cuộc họp (Văn phòng Đài / Admin).
- `PUT /api/meetings/{id}`: Sửa thông tin hoặc đổi trạng thái Draft/Published.
- `POST /api/meetings/{id}/reports`: Thêm báo cáo ban (Khóa khi cuộc họp Published với các ban khác).
- `PUT /api/meetings/{id}/reports/{report_id}`: Sửa báo cáo (Khóa khi Published với ban khác).
- `DELETE /api/meetings/{id}/reports/{report_id}`: Xóa báo cáo (Khóa khi Published với ban khác).

### Chỉ đạo Ban Tổng Giám đốc
- `GET /api/directives`: Lấy danh sách chỉ đạo (hôm nay + hôm qua, 7 ngày, lọc theo ban).
- `POST /api/directives`: Thêm chỉ đạo ngoài cuộc họp (Ban TGĐ / Admin).
- `POST /api/meetings/{id}/directives`: Thêm chỉ đạo trong cuộc họp (Văn phòng Đài / Admin).

---

## 📞 HỖ TRỢ VÀ TRIỂN KHAI

Ứng dụng được thiết kế hoàn toàn độc lập, có thể sao chép nguyên vẹn thư mục sang bất kỳ máy chủ nào trong mạng nội bộ của Đài để vận hành.
