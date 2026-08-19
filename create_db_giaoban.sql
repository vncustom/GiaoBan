-- ====================================================================
-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU [DB_Giaoban] TRÊN MICROSOFT SQL SERVER
-- Đài Phát thanh và Truyền hình TP. Hồ Chí Minh (HTV)
-- ====================================================================

-- 1. Tạo Database DB_Giaoban
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'DB_Giaoban')
BEGIN
    CREATE DATABASE DB_Giaoban;
    PRINT N'Đã tạo cơ sở dữ liệu [DB_Giaoban]';
END
GO

USE DB_Giaoban;
GO

-- Gán quyền cho user web_htv (nếu có)
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = 'web_htv')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'web_htv')
    BEGIN
        CREATE USER web_htv FOR LOGIN web_htv;
        ALTER ROLE db_owner ADD MEMBER web_htv;
        PRINT N'Đã gán quyền db_owner cho web_htv trong [DB_Giaoban]';
    END
END
GO

-- 2. Bảng Users - Tài khoản & Phân quyền
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(255) UNIQUE NOT NULL,
        Password NVARCHAR(255) NOT NULL,
        Role NVARCHAR(100) NOT NULL DEFAULT 'nhan_vien',
        Department NVARCHAR(255),
        IsNew INT DEFAULT 0
    );
    PRINT N'Đã tạo bảng [Users]';
END
GO

-- 3. Bảng Meetings - Cuộc họp giao ban
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Meetings')
BEGIN
    CREATE TABLE Meetings (
        MeetingID INT IDENTITY(1,1) PRIMARY KEY,
        MeetingDate NVARCHAR(50) NOT NULL,
        StartTime NVARCHAR(50) DEFAULT '08:00',
        EndTime NVARCHAR(50),
        Location NVARCHAR(500) DEFAULT N'Phòng họp Giao ban Đài Phát thanh và Truyền hình Thành phố',
        Chairman NVARCHAR(255),
        ChairmanTitle NVARCHAR(255),
        Secretary NVARCHAR(255),
        SecretaryTitle NVARCHAR(255),
        Attendees NVARCHAR(MAX),
        Status NVARCHAR(50) DEFAULT 'Draft',
        CreatedBy NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng [Meetings]';
END
GO

-- 4. Bảng MeetingReports - Báo cáo từng Ban/Trung tâm
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MeetingReports')
BEGIN
    CREATE TABLE MeetingReports (
        ReportID INT IDENTITY(1,1) PRIMARY KEY,
        MeetingID INT NOT NULL,
        Department NVARCHAR(255) NOT NULL,
        Category NVARCHAR(100) NOT NULL DEFAULT 'noi_dung',
        Content NVARCHAR(MAX),
        CreatedBy NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_MeetingReports_Meetings FOREIGN KEY (MeetingID) REFERENCES Meetings(MeetingID) ON DELETE CASCADE
    );
    PRINT N'Đã tạo bảng [MeetingReports]';
END
GO

-- 5. Bảng Directives - Chỉ đạo Ban TGĐ & Kết luận
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Directives')
BEGIN
    CREATE TABLE Directives (
        DirectiveID INT IDENTITY(1,1) PRIMARY KEY,
        MeetingID INT,
        Category NVARCHAR(100) NOT NULL DEFAULT 'ket_luan',
        Content NVARCHAR(MAX) NOT NULL,
        AssignedTo NVARCHAR(255),
        Deadline NVARCHAR(50),
        Status NVARCHAR(50) DEFAULT 'pending',
        Priority INT DEFAULT 0,
        DirectiveDate NVARCHAR(50),
        CreatedBy NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Directives_Meetings FOREIGN KEY (MeetingID) REFERENCES Meetings(MeetingID) ON DELETE SET NULL
    );
    PRINT N'Đã tạo bảng [Directives]';
END
GO

-- 6. Bảng Events - Sự kiện tuần / tháng
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Events')
BEGIN
    CREATE TABLE Events (
        EventID INT IDENTITY(1,1) PRIMARY KEY,
        Title NVARCHAR(500) NOT NULL,
        Description NVARCHAR(MAX),
        EventDate NVARCHAR(50) NOT NULL,
        EventEndDate NVARCHAR(50),
        EventType NVARCHAR(100) DEFAULT 'tuan',
        CreatedBy NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng [Events]';
END
GO

-- 7. Bảng PropagandaPlans - Kế hoạch tuyên truyền
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PropagandaPlans')
BEGIN
    CREATE TABLE PropagandaPlans (
        PlanID INT IDENTITY(1,1) PRIMARY KEY,
        ActivityName NVARCHAR(500) NOT NULL,
        Organizer NVARCHAR(255),
        ExecutingUnit NVARCHAR(255),
        EventTime NVARCHAR(255),
        Location NVARCHAR(500),
        AssignedUnit NVARCHAR(255),
        CooperatingUnit NVARCHAR(255),
        Notes NVARCHAR(MAX),
        PlanDate NVARCHAR(50) NOT NULL,
        PlanEndDate NVARCHAR(50),
        CreatedBy NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT N'Đã tạo bảng [PropagandaPlans]';
END
GO

-- Tạo tài khoản Admin mặc định
IF NOT EXISTS (SELECT * FROM Users WHERE LOWER(Username) = 'admin')
BEGIN
    INSERT INTO Users (Username, Password, Role, Department, IsNew)
    VALUES ('admin', 'KTphtl', 'Admin', N'Văn phòng Đài', 0);
    PRINT N'Đã tạo tài khoản admin mặc định';
END
GO

PRINT N'======================================================';
PRINT N'HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU [DB_Giaoban] TRÊN SQL SERVER!';
PRINT N'======================================================';
