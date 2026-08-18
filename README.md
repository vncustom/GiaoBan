# GIAO BAN HTV - HỆ THỐNG QUẢN LÝ CUỘC HỌP GIAO BAN HẰNG NGÀY

Ứng dụng web phục vụ quản lý, theo dõi biên bản cuộc họp giao ban và các chỉ đạo hằng ngày của Ban Tổng Giám đốc tại **Đài Phát thanh và Truyền hình Thành phố Hồ Chí Minh (HTV)**.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. 📌 Chỉ đạo Tổng Giám đốc (Trang chủ)
- **Mặc định hiển thị**: Tự động lọc và hiển thị chỉ đạo của **Ngày hiện tại và Ngày hôm qua** (có cơ chế fallback hiển thị các phiên họp gần nhất nếu ngày hiện tại chưa diễn ra giao ban).
- **Bộ lọc đa năng**:
  - Xem theo khoảng thời gian nhanh: **Hôm nay & Hôm qua**, **7 ngày qua**, **Tất cả các ngày**, hoặc **chọn một ngày cụ thể** trên lịch.
  - Lọc chỉ đạo theo từng **Ban / Trung tâm / Đơn vị** được phân công việc.
- **Trình bày rõ ràng**: Các chỉ đạo được nhóm trực quan theo từng ngày họp kèm số lượng nhiệm vụ, hiển thị nổi bật đơn vị nhận việc, nội dung chỉ đạo và thời hạn hoàn thành (nếu có).

### 2. 🌓 Giao diện Sáng / Tối (Light Mode & Dark Mode)
- **Mặc định Light Mode**: Giao diện sáng thanh lịch, hiện đại, phối màu xanh/trắng chuẩn phong cách văn phòng đài truyền hình, độ tương phản cao, dễ đọc.
- **Nút Toggle Chế độ tối**: Cho phép chuyển đổi nhanh giữa Light Mode và Dark Mode ngay trên Header, tự động ghi nhớ tùy chọn vào trình duyệt (`localStorage`).

### 3. 📅 Sự kiện trong tuần / tháng
- Hiển thị danh sách các sự kiện lớn, chương trình trọng điểm sắp diễn ra của Đài theo dạng thẻ trực quan.
- Hỗ trợ thêm/sửa/xóa sự kiện cho Ban Phụ trách Văn phòng Đài và Quản trị viên.

### 4. 📋 Quản lý Biên bản họp giao ban (Chuẩn 4 phần)
- **Phần I - Thông tin cuộc họp**: Thời gian, Địa điểm, Chủ trì, Thư ký, Thành phần tham dự.
- **Phần II.1 - Công tác nội dung và tuyên truyền**: Báo cáo tình hình phát sóng, tuyên truyền của từng Ban/Trung tâm (Ban Chương trình, Trung tâm Tin tức, Trung tâm Phát thanh, TFS, HTV Bình Dương, HTV Bà Rịa, v.v.).
- **Phần II.2 - Công tác điều hành chung**: Báo cáo hậu cần, cơ sở vật chất, kỹ thuật, an ninh trật tự của Văn phòng Đài.
- **Phần III - Ý kiến của Ban Tổng Giám đốc**: Các chỉ đạo, lưu ý nghiệp vụ của Ban TGĐ trong phiên họp.
- **Phần IV - Kết luận cuộc họp**: Các nhiệm vụ được giao cụ thể cho từng Ban kèm thời hạn hoàn thành.
- **Thêm chỉ đạo nhanh**: Dropdown sổ xuống chứa đầy đủ **22 đơn vị chuẩn** của Đài giúp nhập liệu nhanh chóng và đồng bộ.

### 5. 🗑️ Tính năng Quản trị & Xóa cuộc họp
- **Quản trị viên (Admin)** có quyền chỉnh sửa, công bố hoặc **xóa hoàn toàn một cuộc họp** (kèm toàn bộ báo cáo và chỉ đạo liên quan) với hộp thoại xác nhận an toàn.
- Quản lý tài khoản người dùng, phân quyền vai trò trực tiếp trên giao diện web.

### 6. 🔐 Xác thực kép (HTV SSO & Local Auth)
- Tích hợp **HTV SSO** dùng chung tài khoản với Dashboard / App Văn phòng Đài.
- Đăng nhập tài khoản nội bộ (Local) dự phòng, tự động đồng bộ vai trò và đơn vị công tác.

---

## 🔒 MA TRẬN PHÂN QUYỀN (RBAC)

| Vai trò | Xem nội dung | Tạo cuộc họp | Nhập báo cáo | Nhập chỉ đạo / Kết luận | Thêm sự kiện | Xóa cuộc họp | Quản trị User |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ | ✅ | ✅ *(Tất cả ban)* | ✅ | ✅ | ✅ | ✅ |
| **BanTGD** | ✅ | ✅ | ✅ *(Tất cả ban)* | ✅ | ✅ | ❌ | ❌ |
| **BPT Văn phòng Đài** | ✅ | ✅ | ✅ *(Tất cả ban)* | ✅ | ✅ | ❌ | ❌ |
| **BPT các Ban khác** | ✅ | ❌ | ✅ *(Chỉ Ban mình)* | ❌ | ❌ | ❌ | ❌ |
| **Nhân viên** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

```
g:\apptulam\GiaoBan\
├── .gitignore                  # Cấu hình loại trừ file khi quản lý mã nguồn Git
├── README.md                   # Tài liệu hướng dẫn sử dụng và triển khai hệ thống
├── main.py                     # Backend FastAPI & định tuyến API
├── db_service.py               # Database Service (SQLite / Sẵn sàng cho MS SQL Server)
├── htv_sso_fastapi.py          # Module tích hợp HTV SSO
├── giaoban.db                  # File CSDL SQLite (tự động sinh ra khi chạy lần đầu)
├── requirements.txt            # Danh sách thư viện Python phụ thuộc
├── run.bat                     # Script kích hoạt server (Port 8002)
├── setup_and_run.bat           # Script cài đặt môi trường ảo và khởi động tự động
├── templates/
│   └── index.html              # Giao diện Single Page Application (SPA)
└── static/
    ├── logo.png                # Logo HTV
    ├── css/
    │   └── style.css           # CSS hệ thống (Hỗ trợ Light Mode & Dark Mode)
    └── js/
        └── app.js              # Logic giao diện, gọi API, lọc dữ liệu, quản lý theme
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY

### 1. Khởi chạy tự động (Khuyên dùng)
- **Lần đầu tiên trên máy mới**:
  Nhấp đúp chuột vào file `setup_and_run.bat`. Chương trình sẽ:
  1. Tự động tạo môi trường ảo Python riêng theo tên máy (`.venv_%COMPUTERNAME%`).
  2. Tự động cài đặt đầy đủ các thư viện trong `requirements.txt`.
  3. Tự động mở trình duyệt web tại địa chỉ: `http://127.0.0.1:8002`.

- **Các lần chạy tiếp theo**:
  Nhấp đúp chuột vào file `run.bat`.

### 2. Khởi chạy thủ công bằng dòng lệnh
Mở Terminal / Command Prompt tại thư mục `GiaoBan`:
```bash
# 1. Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# 2. Khởi động máy chủ Uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --timeout-keep-alive 30
```

---

## 🔑 TÀI KHOẢN MẶC ĐỊNH

Khi khởi tạo cơ sở dữ liệu lần đầu, hệ thống tự động tạo sẵn tài khoản quản trị:
- **Tên đăng nhập**: `admin`
- **Mật khẩu**: `KTphtl`
- **Vai trò**: `Admin`
- **Đơn vị**: `Văn phòng Đài`

---

## ⚙️ CẤU HÌNH CỔNG & SSO

- **Cổng mạng (Port)**: Mặc định chạy trên cổng **`8002`** (để tránh trùng với `8001` - Văn phòng Đài, `5050`, `8010`).
  Nếu muốn đổi port khác, chỉ cần chỉnh sửa tham số `--port` trong file `run.bat` và `setup_and_run.bat`.
- **Cấu hình SSO**:
  Các biến môi trường có thể cấu hình trong hệ điều hành hoặc file script:
  - `SSO_SERVER_URL`: `http://ttphtl.htv.com.vn` (hoặc IP Server Dashboard HTV).
  - `SSO_SECRET_KEY`: Khóa bí mật chung khớp với Dashboard.

---

## 🗄️ HƯỚNG DẪN CHUYỂN ĐỔI SANG MS SQL SERVER

Cơ sở dữ liệu của ứng dụng được xây dựng theo kiến trúc trừu tượng hóa trong `db_service.py`, không sử dụng các cú pháp đặc thù riêng của SQLite.

Khi cần chuyển sang **MS SQL Server**:
1. Cài đặt thư viện kết nối:
   ```bash
   pip install pyodbc
   ```
2. Mở file `db_service.py` và điều chỉnh hàm kết nối:
   ```python
   import pyodbc

   def get_db_connection():
       conn_str = (
           "DRIVER={ODBC Driver 17 for SQL Server};"
           "SERVER=IP_MAY_CHU_SQL;"
           "DATABASE=GiaoBanHTV;"
           "UID=tai_khoan;PWD=mat_khau"
       )
       conn = pyodbc.connect(conn_str)
       return conn
   ```
3. Tạo các bảng tương ứng trên SQL Server:
   - Thay `INTEGER PRIMARY KEY AUTOINCREMENT` bằng `INT IDENTITY(1,1) PRIMARY KEY`.
   - Thay `DATETIME DEFAULT CURRENT_TIMESTAMP` bằng `DATETIME DEFAULT GETDATE()`.
   - Các trường `TEXT` chuyển thành `NVARCHAR(MAX)` để hỗ trợ đầy đủ tiếng Việt Unicode.

---

## 📞 HỖ TRỢ VÀ TRIỂN KHAI

Ứng dụng được thiết kế hoàn toàn độc lập trong thư mục `g:\apptulam\GiaoBan`. Có thể sao chép nguyên vẹn thư mục này sang bất kỳ máy chủ Windows/Linux nào khác trong mạng nội bộ của Đài để vận hành riêng biệt.
