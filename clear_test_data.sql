-- ====================================================================
-- SCRIPT XÓA TOÀN BỘ DỮ LIỆU THỬ NGHIỆM TRONG [DB_Giaoban]
-- (Giữ lại cấu trúc các bảng và tài khoản Quản trị viên Admin)
-- ====================================================================

USE DB_Giaoban;
GO

-- 1. Xóa dữ liệu các bảng theo thứ tự ràng buộc khóa ngoại
DELETE FROM MeetingReports;
DELETE FROM Directives;
DELETE FROM Meetings;
DELETE FROM Events;
DELETE FROM PropagandaPlans;
GO

-- 2. Đặt lại (Reset) chỉ số tự tăng IDENTITY về 0
DBCC CHECKIDENT ('Meetings', RESEED, 0);
DBCC CHECKIDENT ('MeetingReports', RESEED, 0);
DBCC CHECKIDENT ('Directives', RESEED, 0);
DBCC CHECKIDENT ('Events', RESEED, 0);
DBCC CHECKIDENT ('PropagandaPlans', RESEED, 0);
GO

-- 3. Đảm bảo tài khoản admin luôn có quyền Admin
IF EXISTS (SELECT * FROM Users WHERE LOWER(Username) = 'admin')
BEGIN
    UPDATE Users SET Role = 'Admin', Department = N'Văn phòng Đài', IsNew = 0 WHERE LOWER(Username) = 'admin';
END
ELSE
BEGIN
    INSERT INTO Users (Username, Password, Role, Department, IsNew)
    VALUES ('admin', 'KTphtl', 'Admin', N'Văn phòng Đài', 0);
END
GO

PRINT N'======================================================';
PRINT N'ĐÃ XÓA SẠCH DỮ LIỆU TEST VÀ RESET TOÀN BỘ BẢNG TRONG [DB_Giaoban]!';
PRINT N'======================================================';
