# HƯỚNG DẪN THIẾT LẬP MÁY CHỦ DỰ PHÒNG (STANDBY SERVER)
## HỆ THỐNG GIAO BAN HTV (IP: 10.1.1.162)

> **Mục tiêu**: Thiết lập máy chủ dự phòng `10.1.1.162` (đã có sẵn SQL Server) luôn sẵn sàng thay thế máy chủ chính `10.1.1.211` khi gặp sự cố phần cứng, sập mạng hoặc bảo trì, đảm bảo dữ liệu cập nhật từ các bản backup `.bak` hằng ngày và thời gian gián đoạn (RTO) dưới 5 phút.

---

## 📌 TỔNG QUAN KIẾN TRÚC

| Thành phần | Máy chủ Chính (Main) | Máy chủ Dự phòng (Standby) |
| :--- | :--- | :--- |
| **Địa chỉ IP** | `10.1.1.211` | `10.1.1.162` |
| **Hệ điều hành** | Windows | Windows |
| **Cơ sở dữ liệu** | MS SQL Server (`DB_Giaoban`) | MS SQL Server (`DB_Giaoban`) |
| **Web Service** | FastAPI / Uvicorn (Port `8002`) | FastAPI / Uvicorn (Port `8002`) |
| **Chiến lược dữ liệu**| Xuất file `.bak` hằng ngày | Khôi phục (Restore) file `.bak` mỗi ngày |
| **Trạng thái chạy** | Hoạt động chính (Active) | Chờ sẵn sàng (Warm/Hot Standby) |

---

## 🛠️ PHẦN 1: CHUẨN BỊ MÔI TRƯỜNG TRÊN MÁY 10.1.1.162

### Bước 1: Cài đặt Python và ODBC Driver
1. **Cài đặt Python 3.10+ (64-bit)**:
   - Tải bộ cài từ [python.org](https://www.python.org/downloads/).
   - ⚠️ **LƯU Ý QUAN TRỌNG**: Khi cài đặt, tick chọn ô **`Add python.exe to PATH`**.
2. **Cài đặt Microsoft ODBC Driver for SQL Server**:
   - Máy cần có **ODBC Driver 18 for SQL Server** (hoặc Driver 17) để ứng dụng kết nối vào CSDL.
   - Nếu chưa có, tải và cài đặt: [Microsoft ODBC Driver for SQL Server (x64)](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server).

### Bước 2: Sao chép mã nguồn ứng dụng
1. Copy toàn bộ thư mục mã nguồn ứng dụng `GiaoBan` từ máy `10.1.1.211` sang máy `10.1.1.162` (khuyến nghị đặt tại ổ đĩa ổn định, ví dụ: `D:\GiaoBan` hoặc `C:\GiaoBan`).
2. *Lưu ý*: Không cần copy các thư mục ảo `.venv_*` cũ (sẽ được tạo tự động mới phù hợp với cấu hình máy `162`).

---

## 🗄️ PHẦN 2: CẤU HÌNH SQL SERVER VÀ TÀI KHOẢN KẾT NỐI

Để web trên máy `10.1.1.162` kết nối trơn tru với database nội bộ của chính nó, cần cấu hình tài khoản SQL theo đúng chuẩn của hệ thống:

Mở **SQL Server Management Studio (SSMS)** trên máy `10.1.1.162` bằng quyền Windows Authentication / sa, mở New Query và chạy đoạn script sau:

```sql
-- 1. Bật chế độ xác thực kết hợp (SQL Server and Windows Authentication mode) nếu chưa bật
-- (Thao tác trong SSMS: Chuột phải Server Instance -> Properties -> Security -> Chọn 'SQL Server and Windows Authentication mode')

-- 2. Tạo Login web_htv (nếu chưa có)
USE [master];
GO
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'web_htv')
BEGIN
    CREATE LOGIN [web_htv] WITH PASSWORD = N'HtvWeb@2026!',
    CHECK_EXPIRATION = OFF,
    CHECK_POLICY = OFF;
END
GO

-- 3. Cấp quyền sysadmin hoặc dbcreator tạm thời để app khởi tạo
ALTER SERVER ROLE [sysadmin] ADD MEMBER [web_htv];
GO
```

---

## 🔄 PHẦN 3: QUY TRÌNH RESTORE DỮ LIỆU TỪ FILE `.BAK` HẰNG NGÀY

### Cách 1: Khôi phục thủ công qua SSMS (Khi cần kiểm tra tức thì)
1. Copy file backup `.bak` mới nhất từ máy `10.1.1.211` sang máy `10.1.1.162` (Ví dụ lưu tại `D:\Backup_Giaoban\DB_Giaoban_Daily.bak`).
2. Mở **SSMS** trên máy `162`.
3. Chuột phải vào mục **Databases** -> Chọn **Restore Database...**
4. Chọn **Device** -> Nhấn dấu `...` -> Chọn file `.bak`.
5. Đặt tên Database đích là: `DB_Giaoban`.
6. Chuyển sang tab **Options**:
   - Tick chọn: **Overwrite the existing database (WITH REPLACE)**.
   - Tick chọn: **Close existing connections to destination database** (ngắt kết nối cũ để tránh lỗi file đang bận).
7. Nhấn **OK** để tiến hành restore.
8. Sau khi restore xong, chạy lệnh map lại quyền user `web_htv` vào database vừa restore:
   ```sql
   USE [DB_Giaoban];
   GO
   -- Tạo user trong DB nếu chưa có và gán quyền
   IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'web_htv')
   BEGIN
       CREATE USER [web_htv] FOR LOGIN [web_htv];
   END
   ALTER ROLE [db_owner] ADD MEMBER [web_htv];
   GO
   ```

---

### Cách 2: Tự động hóa Restore hàng ngày bằng Script (Khuyên dùng)

Tạo file kịch bản tự động `restore_daily.bat` tại máy `10.1.1.162` trong thư mục `D:\Backup_Giaoban\`:

```bat
@echo off
title Tu dong Restore Database Giaoban Standby
echo ===================================================
echo   DANG RESTORE CSDL GIAO BAN TU FILE .BAK MOI NHAT
echo ===================================================

:: Đường dẫn chứa file backup copy từ máy 211
set BACKUP_FILE=D:\Backup_Giaoban\DB_Giaoban_latest.bak

:: Kiểm tra file backup có tồn tại không
if not exist "%BACKUP_FILE%" (
    echo [LOI] Khong tim thay file backup tai: %BACKUP_FILE%
    pause
    exit /b 1
)

:: Thực hiện Restore đè (WITH REPLACE) và ánh xạ lại user web_htv
sqlcmd -S .\SQLEXPRESS -E -Q "ALTER DATABASE [DB_Giaoban] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [DB_Giaoban] FROM DISK = N'%BACKUP_FILE%' WITH REPLACE; ALTER DATABASE [DB_Giaoban] SET MULTI_USER; USE [DB_Giaoban]; IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'web_htv') CREATE USER [web_htv] FOR LOGIN [web_htv]; ALTER ROLE [db_owner] ADD MEMBER [web_htv];"

if %ERRORLEVEL% EQU 0 (
    echo [THANH CONG] Database DB_Giaoban da duoc khoi phuc thanh cong!
) else (
    echo [THAT BAI] Qua trinh restore gap loi. Vui long kiem tra lai.
)
```

> **Gợi ý tự động hóa cao cấp**:
> 1. Có thể dùng lệnh `robocopy` hoặc `Task Scheduler` chia sẻ thư mục mạng từ `10.1.1.211` sang `10.1.1.162` vào lúc 23:30 mỗi đêm.
> 2. Lúc 23:45 mỗi đêm, `Task Scheduler` trên máy `10.1.1.162` tự chạy script `restore_daily.bat`. Nhờ vậy máy dự phòng luôn có dữ liệu ngày hôm trước mà không cần ai làm tay.

---

## 🚀 PHẦN 4: CÀI ĐẶT VÀ KHỞI ĐỘNG WEB APP TRÊN MÁY 10.1.1.162

### Bước 1: Chạy cài đặt ban đầu
1. Mở thư mục mã nguồn trên máy `162`.
2. Nhấp đúp chuột vào file **`setup_and_run.bat`**:
   - Script sẽ tự động tạo thư mục môi trường ảo `.venv_%COMPUTERNAME%`.
   - Cài đặt đầy đủ các thư viện (`fastapi`, `uvicorn`, `pyodbc`, `PyJWT`, `openpyxl`...).
   - Khởi chạy Web Server tại cổng `8002`.
3. Trình duyệt tự mở `http://127.0.0.1:8002`. Đăng nhập thử bằng tài khoản `admin` để kiểm tra giao diện và dữ liệu đã hiển thị đầy đủ hay chưa.

### Bước 2: Mở Firewall cho cổng 8002 trên máy 10.1.1.162
Để các máy tính khác trong mạng nội bộ truy cập được vào máy `10.1.1.162:8002`, cần mở cổng tường lửa:
- Mở **PowerShell (Run as Administrator)** trên máy `162` và gõ lệnh:
  ```powershell
  New-NetFirewallRule -DisplayName "GiaoBan Web 8002" -Direction Inbound -Protocol TCP -LocalPort 8002 -Action Allow
  ```
- Thử dùng máy khác gõ trên trình duyệt: `http://10.1.1.162:8002` để xác nhận kết nối thành công.

### Bước 3: Cấu hình Web tự khởi động cùng Windows
Để đảm bảo khi máy `162` khởi động lại thì web tự chạy ngầm:
1. Nhấn tổ hợp phím `Windows + R`, gõ `shell:startup` rồi nhấn `Enter`.
2. Chuột phải vào file `run.bat` (hoặc `service.bat`) trong thư mục ứng dụng -> Chọn **Create shortcut**.
3. Kéo shortcut đó bỏ vào thư mục Startup vừa mở.
4. Kể từ nay, mỗi khi máy `10.1.1.162` bật máy hoặc restart, web giao ban sẽ tự động kích hoạt.

---

## 🚨 PHẦN 5: KỊCH BẢN CHUYỂN ĐỔI KHI MÁY CHÍNH (10.1.1.211) BỊ HƯ (FAILOVER)

Khi máy `10.1.1.211` gặp sự cố (cháy nguồn, chết ổ cứng, hỏng mainboard):

### Cách 1: Đổi IP máy 162 thành 211 (Nhanh nhất, người dùng không cần làm gì)
1. Tắt hẳn máy `10.1.1.211` (rút dây mạng máy hỏng).
2. Trên máy `10.1.1.162`, vào **Network Connections** (cài đặt Card mạng) -> Đổi IP tĩnh từ `10.1.1.162` thành `10.1.1.211`.
3. Toàn bộ người dùng trong cơ quan tiếp tục truy cập địa chỉ cũ `http://10.1.1.211:8002` như bình thường mà không hề hay biết máy chủ vật lý đã được thay thế.

### Cách 2: Giữ nguyên IP 162 và thông báo chuyển hướng
1. Nếu không đổi IP card mạng, gửi thông báo hoặc cập nhật bookmark cho người dùng:
   - Truy cập vào địa chỉ mới: **`http://10.1.1.162:8002`**.
2. Toàn bộ tính năng (đăng nhập SSO, thêm chỉ đạo, xem kế hoạch, biên bản) hoạt động y hệt máy chính.

---

## 📋 DANH MỤC KIỂM TRA ĐỊNH KỲ (CHECKLIST HÀNG TUẦN)

- [ ] File backup `.bak` mới nhất đã được sao chép sang máy `10.1.1.162`.
- [ ] Database `DB_Giaoban` trên `10.1.1.162` được restore thành công, không báo lỗi.
- [ ] Mở trình duyệt truy cập `http://10.1.1.162:8002` kiểm tra dữ liệu hiển thị đúng ngày gần nhất.
- [ ] Dịch vụ SQL Server và Uvicorn trên máy `10.1.1.162` đang chạy ổn định.
