# -*- coding: utf-8 -*-
"""
db_service.py - Database Service cho ứng dụng Giao Ban HTV
===========================================================
Sử dụng Microsoft SQL Server (MS SQL Server) qua pyodbc.
Tương thích hoàn toàn với hệ thống cơ sở dữ liệu Đài HTV.
"""
import os
import datetime
from typing import List, Dict, Any, Optional
import pyodbc

# Cấu hình kết nối SQL Server
# ============================================================
_SQL_SERVER   = os.environ.get("MSSQL_SERVER",   "PHTL-KTWEB\\SQLEXPRESS")
_SQL_DATABASE = os.environ.get("MSSQL_DATABASE", "DB_Giaoban")
_SQL_USER     = os.environ.get("MSSQL_USER",     "web_htv")
_SQL_PASSWORD = os.environ.get("MSSQL_PASSWORD", "HtvWeb@2026!")
_SQL_DRIVER   = os.environ.get("MSSQL_DRIVER",   "ODBC Driver 18 for SQL Server")


_WORKING_CONN_STR = None


def _ensure_database_exists():
    """Tự động kiểm tra và tạo cơ sở dữ liệu nếu chưa tồn tại trên SQL Server."""
    comp_name = os.environ.get("COMPUTERNAME", "")
    master_candidates = [
        f"DRIVER={{{_SQL_DRIVER}}};SERVER={_SQL_SERVER};DATABASE=master;UID={_SQL_USER};PWD={_SQL_PASSWORD};TrustServerCertificate=yes;",
        f"DRIVER={{{_SQL_DRIVER}}};SERVER=.\\SQLEXPRESS;DATABASE=master;Trusted_Connection=yes;TrustServerCertificate=yes;",
        f"DRIVER={{{_SQL_DRIVER}}};SERVER={comp_name}\\SQLEXPRESS;DATABASE=master;Trusted_Connection=yes;TrustServerCertificate=yes;",
        f"DRIVER={{{_SQL_DRIVER}}};SERVER=localhost\\SQLEXPRESS;DATABASE=master;Trusted_Connection=yes;TrustServerCertificate=yes;",
    ]
    for m_str in master_candidates:
        try:
            m_conn = pyodbc.connect(m_str, timeout=2, autocommit=True)
            m_cur = m_conn.cursor()
            m_cur.execute(f"IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{_SQL_DATABASE}') CREATE DATABASE [{_SQL_DATABASE}]")
            m_conn.close()
            break
        except Exception:
            pass


def get_db_connection():
    """Tạo kết nối tới Microsoft SQL Server (tự động cache connection string nhanh)."""
    global _WORKING_CONN_STR
    if _WORKING_CONN_STR:
        try:
            return pyodbc.connect(_WORKING_CONN_STR, timeout=5)
        except Exception:
            _WORKING_CONN_STR = None

    _ensure_database_exists()

    comp_name = os.environ.get("COMPUTERNAME", "")
    conn_candidates = [
        # 1. Cấu hình người dùng chỉ định
        f"DRIVER={{{_SQL_DRIVER}}};SERVER={_SQL_SERVER};DATABASE={_SQL_DATABASE};UID={_SQL_USER};PWD={_SQL_PASSWORD};TrustServerCertificate=yes;",
        # 2. Local machine SQLEXPRESS
        f"DRIVER={{{_SQL_DRIVER}}};SERVER=.\\SQLEXPRESS;DATABASE={_SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;",
        f"DRIVER={{{_SQL_DRIVER}}};SERVER={comp_name}\\SQLEXPRESS;DATABASE={_SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;",
        f"DRIVER={{{_SQL_DRIVER}}};SERVER=localhost\\SQLEXPRESS;DATABASE={_SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;",
        f"DRIVER={{{_SQL_DRIVER}}};SERVER=.\\SQLEXPRESS;DATABASE={_SQL_DATABASE};UID={_SQL_USER};PWD={_SQL_PASSWORD};TrustServerCertificate=yes;",
        # 3. Fallback Driver 17
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={_SQL_SERVER};DATABASE={_SQL_DATABASE};UID={_SQL_USER};PWD={_SQL_PASSWORD};TrustServerCertificate=yes;",
    ]

    for c_str in conn_candidates:
        try:
            conn = pyodbc.connect(c_str, timeout=2)
            _WORKING_CONN_STR = c_str
            return conn
        except Exception:
            pass

    raise ConnectionError(f"Cannot connect to SQL Server (Server: {_SQL_SERVER}, DB: {_SQL_DATABASE})")


def row_to_dict(cursor, row) -> Optional[Dict[str, Any]]:
    """Chuyển đổi 1 pyodbc.Row thành Dictionary theo tên cột."""
    if row is None:
        return None
    cols = [col[0] for col in cursor.description]
    return {cols[i]: row[i] for i in range(len(cols))}


def rows_to_dict_list(cursor, rows) -> List[Dict[str, Any]]:
    """Chuyển đổi danh sách pyodbc.Row thành List of Dictionaries."""
    if not rows:
        return []
    cols = [col[0] for col in cursor.description]
    return [{cols[i]: r[i] for i in range(len(cols))} for r in rows]


def init_db():
    """Khởi tạo cấu trúc các bảng trong cơ sở dữ liệu SQL Server nếu chưa có."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Bảng Users
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
            CREATE TABLE Users (
                UserID INT IDENTITY(1,1) PRIMARY KEY,
                Username NVARCHAR(255) UNIQUE NOT NULL,
                Password NVARCHAR(255) NOT NULL,
                Role NVARCHAR(100) NOT NULL DEFAULT 'nhan_vien',
                Department NVARCHAR(255),
                IsNew INT DEFAULT 0
            );
        """)

        # 2. Bảng Meetings - Cuộc họp giao ban
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Meetings')
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
        """)

        # 3. Bảng MeetingReports - Báo cáo từng Ban/Trung tâm
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MeetingReports')
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
        """)

        # 4. Bảng Directives - Chỉ đạo TGĐ & Kết luận
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Directives')
            CREATE TABLE Directives (
                DirectiveID INT IDENTITY(1,1) PRIMARY KEY,
                MeetingID INT,
                Category NVARCHAR(100) NOT NULL DEFAULT 'ket_luan',
                Content NVARCHAR(MAX) NOT NULL,
                AssignedTo NVARCHAR(255),
                CooperatingUnit NVARCHAR(MAX),
                Deadline NVARCHAR(50),
                Status NVARCHAR(50) DEFAULT 'pending',
                Priority INT DEFAULT 0,
                DirectiveDate NVARCHAR(50),
                CreatedBy NVARCHAR(255),
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_Directives_Meetings FOREIGN KEY (MeetingID) REFERENCES Meetings(MeetingID) ON DELETE SET NULL
            );
        """)

        # Thêm cột CooperatingUnit vào Directives nếu chưa có (migration)
        cursor.execute("""
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID('Directives') AND name = 'CooperatingUnit'
            )
            ALTER TABLE Directives ADD CooperatingUnit NVARCHAR(MAX);
        """)

        # Thêm cột MeetingType vào Meetings nếu chưa có (migration)
        cursor.execute("""
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID('Meetings') AND name = 'MeetingType'
            )
            ALTER TABLE Meetings ADD MeetingType NVARCHAR(255) DEFAULT N'Họp giao ban tuyên truyền hàng ngày';
        """)
        cursor.execute("""
            UPDATE Meetings SET MeetingType = N'Họp giao ban tuyên truyền hàng ngày'
            WHERE MeetingType IS NULL OR MeetingType = '';
        """)

        # Mở rộng cột Department của MeetingReports lên NVARCHAR(1000) để lưu nhiều đơn vị báo cáo
        cursor.execute("""
            IF EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID('MeetingReports') AND name = 'Department'
            )
            ALTER TABLE MeetingReports ALTER COLUMN Department NVARCHAR(1000);
        """)

        # Thêm cột DeletedCategories vào Meetings nếu chưa có (migration)
        cursor.execute("""
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID('Meetings') AND name = 'DeletedCategories'
            )
            ALTER TABLE Meetings ADD DeletedCategories NVARCHAR(MAX) DEFAULT '';
        """)

        # 7. Bảng DirectiveComments - Bình luận về chỉ đạo
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DirectiveComments')
            CREATE TABLE DirectiveComments (
                CommentID INT IDENTITY(1,1) PRIMARY KEY,
                DirectiveID INT,
                CommentText NVARCHAR(MAX) NOT NULL,
                AuthorUsername NVARCHAR(255) NOT NULL,
                AuthorName NVARCHAR(255),
                Department NVARCHAR(255),
                Status NVARCHAR(50) DEFAULT 'pending',
                ApprovedBy NVARCHAR(255),
                ApprovedAt DATETIME,
                CreatedAt DATETIME DEFAULT GETDATE()
            );
        """)

        # 5. Bảng Events - Sự kiện tuần/tháng
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Events')
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
        """)

        # 6. Bảng PropagandaPlans - Kế hoạch tuyên truyền
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PropagandaPlans')
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
        """)

        # 8. Bảng Banners - Banner chữ chạy ngang (Ticker)
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Banners')
            CREATE TABLE Banners (
                BannerID INT IDENTITY(1,1) PRIMARY KEY,
                Content NVARCHAR(MAX) NOT NULL,
                StartDate NVARCHAR(50) NOT NULL,
                EndDate NVARCHAR(50) NOT NULL,
                Status NVARCHAR(50) DEFAULT 'Draft',
                CreatedBy NVARCHAR(255),
                CreatedByName NVARCHAR(255),
                Department NVARCHAR(255),
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE()
            );
        """)

        # 9. Bảng SharedDocuments - Văn bản chia sẻ giữa các Ban/Trung tâm
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SharedDocuments')
            CREATE TABLE SharedDocuments (
                DocID INT IDENTITY(1,1) PRIMARY KEY,
                Title NVARCHAR(500) NOT NULL,
                Content NVARCHAR(MAX),
                DocType NVARCHAR(100) NOT NULL DEFAULT N'Khác',
                Department NVARCHAR(255),
                CreatedBy NVARCHAR(255),
                CreatedByName NVARCHAR(255),
                AttachmentPath NVARCHAR(500),
                AttachmentName NVARCHAR(500),
                AttachmentSize INT,
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE()
            );
        """)

        # Đảm bảo tài khoản Admin local luôn sẵn sàng
        cursor.execute("SELECT UserID FROM Users WHERE LOWER(Username) = 'admin'")
        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.execute(
                "INSERT INTO Users (Username, Password, Role, Department, IsNew) VALUES ('admin', 'KTphtl', 'Admin', N'Văn phòng Đài', 0)"
            )

        # Cập nhật chuyển đổi tên Ban theo cơ cấu tổ chức mới:
        # - Ban Chiến lược -> Ban Chiến lược - Đầu tư
        # - Ban Chuyên đề / Ban Khoa giáo -> Ban Chuyên đề - Khoa giáo
        dept_migrations = [
            "UPDATE Users SET Department = N'Ban Chiến lược - Đầu tư' WHERE Department = N'Ban Chiến lược' OR (Department LIKE N'%Ban Chiến lược%' AND Department NOT LIKE N'%Đầu tư%')",
            "UPDATE Users SET Department = N'Ban Chuyên đề - Khoa giáo' WHERE Department IN (N'Ban Chuyên đề', N'Ban Khoa giáo') OR (Department LIKE N'%Ban Chuyên đề%' AND Department NOT LIKE N'%Khoa giáo%')",
            "UPDATE MeetingReports SET Department = REPLACE(Department, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE Department LIKE N'%Ban Chiến lược%' AND Department NOT LIKE N'%Đầu tư%'",
            "UPDATE MeetingReports SET Department = REPLACE(Department, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Chuyên đề%' AND Department NOT LIKE N'%Khoa giáo%'",
            "UPDATE MeetingReports SET Department = REPLACE(Department, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Khoa giáo%'",
            "UPDATE Directives SET AssignedTo = REPLACE(AssignedTo, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE AssignedTo LIKE N'%Ban Chiến lược%' AND AssignedTo NOT LIKE N'%Đầu tư%'",
            "UPDATE Directives SET AssignedTo = REPLACE(AssignedTo, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE AssignedTo LIKE N'%Ban Chuyên đề%' AND AssignedTo NOT LIKE N'%Khoa giáo%'",
            "UPDATE Directives SET AssignedTo = REPLACE(AssignedTo, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE AssignedTo LIKE N'%Ban Khoa giáo%'",
            "UPDATE Directives SET CooperatingUnit = REPLACE(CooperatingUnit, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE CooperatingUnit LIKE N'%Ban Chiến lược%' AND CooperatingUnit NOT LIKE N'%Đầu tư%'",
            "UPDATE Directives SET CooperatingUnit = REPLACE(CooperatingUnit, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE CooperatingUnit LIKE N'%Ban Chuyên đề%' AND CooperatingUnit NOT LIKE N'%Khoa giáo%'",
            "UPDATE Directives SET CooperatingUnit = REPLACE(CooperatingUnit, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE CooperatingUnit LIKE N'%Ban Khoa giáo%'",
            "UPDATE PropagandaPlans SET ExecutingUnit = REPLACE(ExecutingUnit, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE ExecutingUnit LIKE N'%Ban Chiến lược%' AND ExecutingUnit NOT LIKE N'%Đầu tư%'",
            "UPDATE PropagandaPlans SET ExecutingUnit = REPLACE(ExecutingUnit, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE ExecutingUnit LIKE N'%Ban Chuyên đề%' AND ExecutingUnit NOT LIKE N'%Khoa giáo%'",
            "UPDATE PropagandaPlans SET ExecutingUnit = REPLACE(ExecutingUnit, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE ExecutingUnit LIKE N'%Ban Khoa giáo%'",
            "UPDATE PropagandaPlans SET AssignedUnit = REPLACE(AssignedUnit, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE AssignedUnit LIKE N'%Ban Chiến lược%' AND AssignedUnit NOT LIKE N'%Đầu tư%'",
            "UPDATE PropagandaPlans SET AssignedUnit = REPLACE(AssignedUnit, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE AssignedUnit LIKE N'%Ban Chuyên đề%' AND AssignedUnit NOT LIKE N'%Khoa giáo%'",
            "UPDATE PropagandaPlans SET AssignedUnit = REPLACE(AssignedUnit, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE AssignedUnit LIKE N'%Ban Khoa giáo%'",
            "UPDATE PropagandaPlans SET CooperatingUnit = REPLACE(CooperatingUnit, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE CooperatingUnit LIKE N'%Ban Chiến lược%' AND CooperatingUnit NOT LIKE N'%Đầu tư%'",
            "UPDATE PropagandaPlans SET CooperatingUnit = REPLACE(CooperatingUnit, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE CooperatingUnit LIKE N'%Ban Chuyên đề%' AND CooperatingUnit NOT LIKE N'%Khoa giáo%'",
            "UPDATE PropagandaPlans SET CooperatingUnit = REPLACE(CooperatingUnit, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE CooperatingUnit LIKE N'%Ban Khoa giáo%'",
            "UPDATE SharedDocuments SET Department = REPLACE(Department, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE Department LIKE N'%Ban Chiến lược%' AND Department NOT LIKE N'%Đầu tư%'",
            "UPDATE SharedDocuments SET Department = REPLACE(Department, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Chuyên đề%' AND Department NOT LIKE N'%Khoa giáo%'",
            "UPDATE SharedDocuments SET Department = REPLACE(Department, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Khoa giáo%'",
            "UPDATE Banners SET Department = REPLACE(Department, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE Department LIKE N'%Ban Chiến lược%' AND Department NOT LIKE N'%Đầu tư%'",
            "UPDATE Banners SET Department = REPLACE(Department, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Chuyên đề%' AND Department NOT LIKE N'%Khoa giáo%'",
            "UPDATE Banners SET Department = REPLACE(Department, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Khoa giáo%'",
            "UPDATE DirectiveComments SET Department = REPLACE(Department, N'Ban Chiến lược', N'Ban Chiến lược - Đầu tư') WHERE Department LIKE N'%Ban Chiến lược%' AND Department NOT LIKE N'%Đầu tư%'",
            "UPDATE DirectiveComments SET Department = REPLACE(Department, N'Ban Chuyên đề', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Chuyên đề%' AND Department NOT LIKE N'%Khoa giáo%'",
            "UPDATE DirectiveComments SET Department = REPLACE(Department, N'Ban Khoa giáo', N'Ban Chuyên đề - Khoa giáo') WHERE Department LIKE N'%Ban Khoa giáo%'",
        ]
        for query in dept_migrations:
            try:
                cursor.execute(query)
            except Exception:
                pass

        conn.commit()

        # Tự động di chuyển dữ liệu từ SQLite (nếu có)
        _migrate_from_sqlite_if_needed(conn)

    except Exception as e:
        print(f"[DB INIT WARN] init_db warning: {e}")
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _migrate_from_sqlite_if_needed(sql_conn):
    """Di chuyển dữ liệu cũ từ SQLite sang SQL Server nếu SQL Server đang rỗng."""
    db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "giaoban.db")
    if not os.path.exists(db_file):
        return

    import sqlite3
    try:
        sq_conn = sqlite3.connect(db_file)
        sq_cur = sq_conn.cursor()

        sql_cur = sql_conn.cursor()

        # Kiểm tra bảng Meetings trên SQL Server
        sql_cur.execute("SELECT COUNT(*) FROM Meetings")
        count = sql_cur.fetchone()[0]
        if count == 0:
            # 1. Migrate Meetings
            sq_cur.execute("SELECT MeetingID, MeetingDate, StartTime, EndTime, Location, Chairman, ChairmanTitle, Secretary, SecretaryTitle, Attendees, Status, CreatedBy, CreatedAt, UpdatedAt FROM Meetings")
            meetings = sq_cur.fetchall()
            if meetings:
                sql_cur.execute("SET IDENTITY_INSERT Meetings ON")
                for m in meetings:
                    sql_cur.execute(
                        """INSERT INTO Meetings (MeetingID, MeetingDate, StartTime, EndTime, Location, Chairman, ChairmanTitle, Secretary, SecretaryTitle, Attendees, Status, CreatedBy, CreatedAt, UpdatedAt)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        m
                    )
                sql_cur.execute("SET IDENTITY_INSERT Meetings OFF")
                sql_conn.commit()

            # 2. Migrate MeetingReports
            sq_cur.execute("SELECT ReportID, MeetingID, Department, Category, Content, CreatedBy, CreatedAt, UpdatedAt FROM MeetingReports")
            reports = sq_cur.fetchall()
            if reports:
                sql_cur.execute("SET IDENTITY_INSERT MeetingReports ON")
                for r in reports:
                    sql_cur.execute(
                        """INSERT INTO MeetingReports (ReportID, MeetingID, Department, Category, Content, CreatedBy, CreatedAt, UpdatedAt)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        r
                    )
                sql_cur.execute("SET IDENTITY_INSERT MeetingReports OFF")
                sql_conn.commit()

            # 3. Migrate Directives
            sq_cur.execute("SELECT DirectiveID, MeetingID, Category, Content, AssignedTo, Deadline, Status, Priority, DirectiveDate, CreatedBy, CreatedAt, UpdatedAt FROM Directives")
            directives = sq_cur.fetchall()
            if directives:
                sql_cur.execute("SET IDENTITY_INSERT Directives ON")
                for d in directives:
                    sql_cur.execute(
                        """INSERT INTO Directives (DirectiveID, MeetingID, Category, Content, AssignedTo, Deadline, Status, Priority, DirectiveDate, CreatedBy, CreatedAt, UpdatedAt)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        d
                    )
                sql_cur.execute("SET IDENTITY_INSERT Directives OFF")
                sql_conn.commit()

            # 4. Migrate Events
            sq_cur.execute("SELECT EventID, Title, Description, EventDate, EventEndDate, EventType, CreatedBy, CreatedAt, UpdatedAt FROM Events")
            events = sq_cur.fetchall()
            if events:
                sql_cur.execute("SET IDENTITY_INSERT Events ON")
                for ev in events:
                    sql_cur.execute(
                        """INSERT INTO Events (EventID, Title, Description, EventDate, EventEndDate, EventType, CreatedBy, CreatedAt, UpdatedAt)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        ev
                    )
                sql_cur.execute("SET IDENTITY_INSERT Events OFF")
                sql_conn.commit()

            # 5. Migrate PropagandaPlans
            sq_cur.execute("SELECT PlanID, ActivityName, Organizer, ExecutingUnit, EventTime, Location, AssignedUnit, CooperatingUnit, Notes, PlanDate, PlanEndDate, CreatedBy, CreatedAt, UpdatedAt FROM PropagandaPlans")
            plans = sq_cur.fetchall()
            if plans:
                sql_cur.execute("SET IDENTITY_INSERT PropagandaPlans ON")
                for p in plans:
                    sql_cur.execute(
                        """INSERT INTO PropagandaPlans (PlanID, ActivityName, Organizer, ExecutingUnit, EventTime, Location, AssignedUnit, CooperatingUnit, Notes, PlanDate, PlanEndDate, CreatedBy, CreatedAt, UpdatedAt)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        p
                    )
                sql_cur.execute("SET IDENTITY_INSERT PropagandaPlans OFF")
                sql_conn.commit()

            print("[MIGRATION] Da sao chep du lieu thanh cong tu SQLite sang SQL Server!")

        sq_conn.close()
    except Exception as e:
        print(f"[MIGRATION NOTE] {e}")


# ===================== USERS =====================

def get_user(username: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin tài khoản người dùng theo username."""
    if not username:
        return None
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Users WHERE LOWER(Username) = LOWER(?)", (username.strip(),))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


def get_all_users() -> List[Dict[str, Any]]:
    """Lấy toàn bộ danh sách người dùng."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT UserID, Username, Role, Department, COALESCE(IsNew, 0) AS IsNew FROM Users ORDER BY IsNew DESC, Username ASC"
        )
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def create_user(username: str, password_raw: str, role: str, department: Optional[str] = None) -> int:
    """Tạo tài khoản người dùng mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO Users (Username, Password, Role, Department, IsNew)
               OUTPUT INSERTED.UserID
               VALUES (?, ?, ?, ?, 0)""",
            (username.strip(), password_raw, role, department or "HTV"),
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        return user_id
    finally:
        conn.close()


def delete_user(username: str) -> bool:
    """Xóa tài khoản người dùng theo username."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Users WHERE LOWER(Username) = LOWER(?)", (username.strip(),))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def save_or_update_sso_user(
    username: str, role: Optional[str] = None, department: Optional[str] = None, force_update: bool = False
) -> None:
    """Tự động lưu hoặc cập nhật thông tin user từ SSO/Admin vào CSDL local."""
    if not username:
        return
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT UserID, Role, Department FROM Users WHERE LOWER(Username) = LOWER(?)",
            (username.strip(),),
        )
        row = cursor.fetchone()
        if row:
            user_id = row[0]
            if force_update:
                new_role = role or "nhan_vien"
                new_dept = department or "HTV"
                is_new = 0
            else:
                current_role = row[1]
                current_dept = row[2]
                new_role = role if (role and role != "nhan_vien") else current_role
                new_dept = (
                    department
                    if (department and department not in ["", "HTV"])
                    else (current_dept or "HTV")
                )
                is_new = 1 if (not new_dept or new_dept == "HTV") else 0

            cursor.execute(
                "UPDATE Users SET Role = ?, Department = ?, IsNew = ? WHERE UserID = ?",
                (new_role or "nhan_vien", new_dept or "HTV", is_new, user_id),
            )
        else:
            is_new_user = 0 if (department and department not in ["", "HTV"]) else 1
            cursor.execute(
                "INSERT INTO Users (Username, Password, Role, Department, IsNew) VALUES (?, ?, ?, ?, ?)",
                (username.strip(), "SSO_USER", role or "nhan_vien", department or "HTV", is_new_user),
            )
        conn.commit()
    except Exception as e:
        print(f"[DB SAVE WARN] save_or_update_sso_user error: {e}")
    finally:
        conn.close()


def get_new_user_count() -> int:
    """Đếm số lượng user mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM Users WHERE IsNew = 1 OR Department IS NULL OR Department = '' OR Department = 'HTV'"
        )
        count = cursor.fetchone()[0]
        return count
    finally:
        conn.close()


# ===================== MEETINGS =====================

def create_meeting(
    meeting_date: str,
    start_time: str = "08:00",
    end_time: Optional[str] = "08:30",
    location: str = "Phòng họp Giao ban Đài Phát thanh và Truyền hình Thành phố",
    chairman: Optional[str] = None,
    chairman_title: Optional[str] = None,
    secretary: Optional[str] = None,
    secretary_title: Optional[str] = None,
    attendees: Optional[str] = None,
    status: str = "Draft",
    created_by: Optional[str] = None,
    meeting_type: str = "Họp giao ban tuyên truyền hàng ngày",
) -> int:
    """Tạo cuộc họp giao ban mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO Meetings (MeetingDate, StartTime, EndTime, Location, Chairman, ChairmanTitle, Secretary, SecretaryTitle, Attendees, Status, CreatedBy, MeetingType)
               OUTPUT INSERTED.MeetingID
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                meeting_date, start_time, end_time, location,
                chairman, chairman_title, secretary, secretary_title,
                attendees, status, created_by, meeting_type or "Họp giao ban tuyên truyền hàng ngày",
            ),
        )
        meeting_id = cursor.fetchone()[0]
        conn.commit()
        return meeting_id
    finally:
        conn.close()


def get_meeting(meeting_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 cuộc họp."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Meetings WHERE MeetingID = ?", (meeting_id,))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


def get_meetings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 1000,
) -> List[Dict[str, Any]]:
    """Lấy danh sách cuộc họp theo bộ lọc."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = f"SELECT TOP ({int(limit)}) * FROM Meetings WHERE 1=1"
        params = []

        if start_date:
            query += " AND MeetingDate >= ?"
            params.append(start_date)
        if end_date:
            query += " AND MeetingDate <= ?"
            params.append(end_date)
        if status:
            query += " AND Status = ?"
            params.append(status)

        query += " ORDER BY MeetingDate DESC, StartTime DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def update_meeting(meeting_id: int, **kwargs) -> bool:
    """Cập nhật thông tin cuộc họp."""
    if not kwargs:
        return False
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        set_parts = []
        params = []
        allowed_fields = [
            "MeetingDate", "StartTime", "EndTime", "Location",
            "Chairman", "ChairmanTitle", "Secretary", "SecretaryTitle",
            "Attendees", "Status", "MeetingType", "DeletedCategories",
        ]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)

        if not set_parts:
            return False

        set_parts.append("UpdatedAt = GETDATE()")
        params.append(meeting_id)

        query = f"UPDATE Meetings SET {', '.join(set_parts)} WHERE MeetingID = ?"
        cursor.execute(query, params)
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_meeting(meeting_id: int) -> bool:
    """Xóa cuộc họp và tất cả báo cáo, chỉ đạo liên quan."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM MeetingReports WHERE MeetingID = ?", (meeting_id,))
        cursor.execute("DELETE FROM Directives WHERE MeetingID = ?", (meeting_id,))
        cursor.execute("DELETE FROM Meetings WHERE MeetingID = ?", (meeting_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


# ===================== REPORTS =====================

def create_report(
    meeting_id: int,
    department: str,
    category: str = "noi_dung",
    content: str = "",
    created_by: Optional[str] = None,
) -> int:
    """Thêm báo cáo của 1 Ban/Trung tâm vào cuộc họp."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO MeetingReports (MeetingID, Department, Category, Content, CreatedBy)
               OUTPUT INSERTED.ReportID
               VALUES (?, ?, ?, ?, ?)""",
            (meeting_id, department, category, content, created_by),
        )
        report_id = cursor.fetchone()[0]
        conn.commit()
        restore_meeting_category_if_needed(meeting_id, category)
        return report_id
    finally:
        conn.close()


def get_reports(meeting_id: int, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lấy danh sách báo cáo của 1 cuộc họp."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM MeetingReports WHERE MeetingID = ?"
        params = [meeting_id]
        if category:
            query += " AND Category = ?"
            params.append(category)
        query += " ORDER BY ReportID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def update_report(
    report_id: int,
    content: str,
    department: Optional[str] = None,
    category: Optional[str] = None,
    created_by: Optional[str] = None,
) -> bool:
    """Cập nhật nội dung báo cáo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "UPDATE MeetingReports SET Content = ?, UpdatedAt = GETDATE()"
        params = [content]
        if department:
            query += ", Department = ?"
            params.append(department)
        if category:
            query += ", Category = ?"
            params.append(category)
        if created_by:
            query += ", CreatedBy = ?"
            params.append(created_by)
        query += " WHERE ReportID = ?"
        params.append(report_id)
        cursor.execute(query, params)
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_report(report_id: int) -> bool:
    """Xóa báo cáo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM MeetingReports WHERE ReportID = ?", (report_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def get_report(report_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 báo cáo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM MeetingReports WHERE ReportID = ?", (report_id,))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


# ===================== DIRECTIVES =====================

def create_directive(
    meeting_id: int,
    category: str = "ket_luan",
    content: str = "",
    assigned_to: Optional[str] = None,
    cooperating_unit: Optional[str] = None,
    deadline: Optional[str] = None,
    priority: int = 0,
    created_by: Optional[str] = None,
) -> int:
    """Thêm chỉ đạo/kết luận cuộc họp."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO Directives (MeetingID, Category, Content, AssignedTo, CooperatingUnit, Deadline, Priority, CreatedBy)
               OUTPUT INSERTED.DirectiveID
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (meeting_id, category, content, assigned_to, cooperating_unit, deadline, priority, created_by),
        )
        directive_id = cursor.fetchone()[0]
        conn.commit()
        restore_meeting_category_if_needed(meeting_id, category)
        return directive_id
    finally:
        conn.close()


def create_standalone_directive(
    category: str = "y_kien_tgd",
    content: str = "",
    assigned_to: Optional[str] = None,
    cooperating_unit: Optional[str] = None,
    deadline: Optional[str] = None,
    priority: int = 0,
    directive_date: Optional[str] = None,
    created_by: Optional[str] = None,
) -> int:
    """Thêm chỉ đạo ngoài cuộc họp (Ban Tổng Giám đốc)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if not directive_date:
            directive_date = datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute(
            """INSERT INTO Directives (MeetingID, Category, Content, AssignedTo, CooperatingUnit, Deadline, Priority, DirectiveDate, CreatedBy)
               OUTPUT INSERTED.DirectiveID
               VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (category, content, assigned_to, cooperating_unit, deadline, priority, directive_date, created_by),
        )
        directive_id = cursor.fetchone()[0]
        conn.commit()
        return directive_id
    finally:
        conn.close()


def get_directives(
    meeting_id: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Lấy danh sách chỉ đạo (của 1 cuộc họp cụ thể)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT d.*, m.MeetingDate FROM Directives d LEFT JOIN Meetings m ON d.MeetingID = m.MeetingID WHERE d.MeetingID IS NOT NULL"
        params = []
        if meeting_id is not None:
            query += " AND d.MeetingID = ?"
            params.append(meeting_id)
        if category:
            query += " AND d.Category = ?"
            params.append(category)
        if status:
            query += " AND d.Status = ?"
            params.append(status)
        query += " ORDER BY d.Priority DESC, d.DirectiveID ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def get_directive(directive_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 chỉ đạo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Directives WHERE DirectiveID = ?", (directive_id,))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


def update_directive(directive_id: int, **kwargs) -> bool:
    """Cập nhật chỉ đạo."""
    if not kwargs:
        return False
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        set_parts = []
        params = []
        allowed_fields = ["Content", "AssignedTo", "CooperatingUnit", "Deadline", "Status", "Priority", "Category"]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)

        if not set_parts:
            return False

        set_parts.append("UpdatedAt = GETDATE()")
        params.append(directive_id)

        query = f"UPDATE Directives SET {', '.join(set_parts)} WHERE DirectiveID = ?"
        cursor.execute(query, params)
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_directive(directive_id: int) -> bool:
    """Xóa chỉ đạo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Directives WHERE DirectiveID = ?", (directive_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_meeting_category(meeting_id: int, section_type: str, category: str) -> bool:
    """Xóa 1 đề mục trong cuộc họp và toàn bộ báo cáo/chỉ đạo thuộc đề mục đó."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DeletedCategories FROM Meetings WHERE MeetingID = ?", (meeting_id,))
        row = cursor.fetchone()
        if not row:
            return False
        current_del = row[0] or ""
        del_list = [c.strip() for c in current_del.split(",") if c.strip()]
        if category not in del_list:
            del_list.append(category)
        new_del = ",".join(del_list)

        cursor.execute(
            "UPDATE Meetings SET DeletedCategories = ?, UpdatedAt = GETDATE() WHERE MeetingID = ?",
            (new_del, meeting_id),
        )

        if section_type == "report":
            cursor.execute("DELETE FROM MeetingReports WHERE MeetingID = ? AND Category = ?", (meeting_id, category))
        elif section_type == "directive":
            cursor.execute("DELETE FROM Directives WHERE MeetingID = ? AND Category = ?", (meeting_id, category))

        conn.commit()
        return True
    finally:
        conn.close()


def restore_meeting_category_if_needed(meeting_id: int, category: str) -> None:
    """Khôi phục lại category nếu trước đó đã bị xóa (khi người dùng thêm báo cáo/chỉ đạo mới vào category này)."""
    if not category:
        return
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DeletedCategories FROM Meetings WHERE MeetingID = ?", (meeting_id,))
        row = cursor.fetchone()
        if not row or not row[0]:
            return
        del_list = [c.strip() for c in row[0].split(",") if c.strip()]
        if category in del_list:
            del_list.remove(category)
            new_del = ",".join(del_list)
            cursor.execute(
                "UPDATE Meetings SET DeletedCategories = ?, UpdatedAt = GETDATE() WHERE MeetingID = ?",
                (new_del, meeting_id),
            )
            conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def get_directives_filtered(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """Lấy danh sách chỉ đạo có hỗ trợ lọc linh hoạt theo ngày và ban.
    Bao gồm cả chỉ đạo ngoài cuộc họp (MeetingID IS NULL)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = f"""
            SELECT TOP ({int(limit)}) d.*,
                   COALESCE(m.MeetingDate, d.DirectiveDate) AS MeetingDate,
                   m.Chairman, m.Location,
                   CASE WHEN d.MeetingID IS NULL THEN 1 ELSE 0 END AS IsStandalone
            FROM Directives d
            LEFT JOIN Meetings m ON d.MeetingID = m.MeetingID
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND COALESCE(m.MeetingDate, d.DirectiveDate) >= ?"
            params.append(start_date)
        if end_date:
            query += " AND COALESCE(m.MeetingDate, d.DirectiveDate) <= ?"
            params.append(end_date)
        if department and department.strip():
            query += " AND (d.AssignedTo LIKE ? OR d.AssignedTo = ? OR d.CooperatingUnit LIKE ? OR d.CooperatingUnit = ?)"
            params.append(f"%{department.strip()}%")
            params.append(department.strip())
            params.append(f"%{department.strip()}%")
            params.append(department.strip())
        if category and category.strip():
            query += " AND d.Category = ?"
            params.append(category.strip())

        query += " ORDER BY COALESCE(m.MeetingDate, d.DirectiveDate) DESC, d.Priority DESC, d.DirectiveID DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def get_recent_directives_2days(department: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lấy chỉ đạo trong ngày hôm nay và hôm qua (mặc định trang chủ)."""
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    start_str = yesterday.strftime("%Y-%m-%d")
    end_str = today.strftime("%Y-%m-%d")
    
    directives = get_directives_filtered(start_date=start_str, end_date=end_str, department=department)
    if not directives:
        # Nếu hôm nay và hôm qua chưa có dữ liệu (đầu tuần/sau nghỉ lễ), fallback 7 ngày gần nhất
        directives = get_directives_filtered(
            start_date=(today - datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
            end_date=end_str,
            department=department
        )
    return directives


def get_today_directives() -> List[Dict[str, Any]]:
    """Lấy chỉ đạo (mặc định hôm nay & hôm qua)."""
    return get_recent_directives_2days()


def get_recent_directives(days: int = 7, department: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lấy chỉ đạo trong N ngày gần nhất."""
    from_date = (datetime.date.today() - datetime.timedelta(days=days)).strftime("%Y-%m-%d")
    return get_directives_filtered(start_date=from_date, department=department)


def update_standalone_directive(directive_id: int, **kwargs) -> bool:
    """Cập nhật chỉ đạo ngoài cuộc họp (bao gồm DirectiveDate)."""
    if not kwargs:
        return False
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        set_parts = []
        params = []
        allowed_fields = ["Content", "AssignedTo", "CooperatingUnit", "Deadline", "Status", "Priority", "Category", "DirectiveDate"]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)
        if not set_parts:
            return False
        set_parts.append("UpdatedAt = GETDATE()")
        params.append(directive_id)
        query = f"UPDATE Directives SET {', '.join(set_parts)} WHERE DirectiveID = ?"
        cursor.execute(query, params)
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


# ===================== EVENTS =====================

def create_event(
    title: str,
    event_date: str,
    event_end_date: Optional[str] = None,
    description: Optional[str] = None,
    event_type: str = "tuan",
    created_by: Optional[str] = None,
) -> int:
    """Thêm sự kiện."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO Events (Title, Description, EventDate, EventEndDate, EventType, CreatedBy)
               OUTPUT INSERTED.EventID
               VALUES (?, ?, ?, ?, ?, ?)""",
            (title, description, event_date, event_end_date, event_type, created_by),
        )
        event_id = cursor.fetchone()[0]
        conn.commit()
        return event_id
    finally:
        conn.close()


def get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Lấy danh sách sự kiện."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM Events WHERE 1=1"
        params = []
        if start_date:
            query += " AND (EventDate >= ? OR (EventEndDate IS NOT NULL AND EventEndDate >= ?))"
            params.extend([start_date, start_date])
        if end_date:
            query += " AND EventDate <= ?"
            params.append(end_date)
        if event_type:
            query += " AND EventType = ?"
            params.append(event_type)
        query += " ORDER BY EventDate ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def update_event(event_id: int, **kwargs) -> bool:
    """Cập nhật sự kiện."""
    if not kwargs:
        return False
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        set_parts = []
        params = []
        allowed_fields = ["Title", "Description", "EventDate", "EventEndDate", "EventType"]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)
        if not set_parts:
            return False
        set_parts.append("UpdatedAt = GETDATE()")
        params.append(event_id)
        query = f"UPDATE Events SET {', '.join(set_parts)} WHERE EventID = ?"
        cursor.execute(query, params)
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_event(event_id: int) -> bool:
    """Xóa sự kiện."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Events WHERE EventID = ?", (event_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


# ===================== PROPAGANDA PLANS (Kế hoạch tuyên truyền) =====================

def create_propaganda_plan(
    activity_name: str,
    plan_date: str,
    organizer: Optional[str] = None,
    executing_unit: Optional[str] = None,
    event_time: Optional[str] = None,
    location: Optional[str] = None,
    assigned_unit: Optional[str] = None,
    cooperating_unit: Optional[str] = None,
    notes: Optional[str] = None,
    plan_end_date: Optional[str] = None,
    created_by: Optional[str] = None,
) -> int:
    """Tạo kế hoạch tuyên truyền mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO PropagandaPlans
               (ActivityName, Organizer, ExecutingUnit, EventTime, Location,
                AssignedUnit, CooperatingUnit, Notes, PlanDate, PlanEndDate, CreatedBy)
               OUTPUT INSERTED.PlanID
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (activity_name, organizer, executing_unit, event_time, location,
             assigned_unit, cooperating_unit, notes, plan_date, plan_end_date, created_by),
        )
        plan_id = cursor.fetchone()[0]
        conn.commit()
        return plan_id
    finally:
        conn.close()


def get_propaganda_plan(plan_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 kế hoạch tuyên truyền."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM PropagandaPlans WHERE PlanID = ?", (plan_id,))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


def get_propaganda_plans(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 500,
) -> List[Dict[str, Any]]:
    """Lấy danh sách kế hoạch tuyên truyền."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = f"SELECT TOP ({int(limit)}) * FROM PropagandaPlans WHERE 1=1"
        params = []
        if start_date and end_date:
            query += " AND (PlanDate <= ? AND (PlanEndDate >= ? OR (PlanEndDate IS NULL AND PlanDate >= ?)))"
            params.extend([end_date, start_date, start_date])
        elif start_date:
            query += " AND (PlanEndDate >= ? OR (PlanEndDate IS NULL AND PlanDate >= ?))"
            params.extend([start_date, start_date])
        elif end_date:
            query += " AND PlanDate <= ?"
            params.append(end_date)
        query += " ORDER BY PlanDate ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def get_upcoming_propaganda_plans(days: int = 60) -> List[Dict[str, Any]]:
    """Lấy kế hoạch tuyên truyền sắp tới (từ hôm nay trở đi)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        today = datetime.date.today().isoformat()
        end = (datetime.date.today() + datetime.timedelta(days=days)).isoformat()
        cursor.execute(
            """SELECT TOP (50) * FROM PropagandaPlans
               WHERE PlanDate >= ? AND PlanDate <= ?
               ORDER BY PlanDate ASC""",
            (today, end),
        )
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def update_propaganda_plan(plan_id: int, **kwargs) -> bool:
    """Cập nhật kế hoạch tuyên truyền."""
    if not kwargs:
        return False
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        allowed_fields = [
            "ActivityName", "Organizer", "ExecutingUnit", "EventTime", "Location",
            "AssignedUnit", "CooperatingUnit", "Notes", "PlanDate", "PlanEndDate"
        ]
        set_parts = []
        params = []
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)
        if not set_parts:
            return False
        set_parts.append("UpdatedAt = GETDATE()")
        params.append(plan_id)
        query = f"UPDATE PropagandaPlans SET {', '.join(set_parts)} WHERE PlanID = ?"
        cursor.execute(query, params)
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_propaganda_plan(plan_id: int) -> bool:
    """Xóa kế hoạch tuyên truyền."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM PropagandaPlans WHERE PlanID = ?", (plan_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


# ===================== DIRECTIVE COMMENTS =====================

def create_comment(
    directive_id: Optional[int],
    comment_text: str,
    author_username: str,
    author_name: Optional[str] = None,
    department: Optional[str] = None,
) -> int:
    """Tạo bình luận mới (status = pending, chờ duyệt)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO DirectiveComments (DirectiveID, CommentText, AuthorUsername, AuthorName, Department, Status)
               OUTPUT INSERTED.CommentID
               VALUES (?, ?, ?, ?, ?, 'pending')""",
            (directive_id, comment_text, author_username, author_name or author_username, department),
        )
        comment_id = cursor.fetchone()[0]
        conn.commit()
        return comment_id
    finally:
        conn.close()


def get_comments(
    directive_id: Optional[int] = None,
    status: Optional[str] = None,
    filter_period: Optional[str] = None,  # 'week', 'month', or None (all)
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """Lấy danh sách bình luận."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = f"SELECT TOP ({int(limit)}) * FROM DirectiveComments WHERE 1=1"
        params = []

        if directive_id is not None:
            query += " AND DirectiveID = ?"
            params.append(directive_id)
        if status:
            query += " AND Status = ?"
            params.append(status)
        if filter_period == 'week':
            query += " AND CreatedAt >= DATEADD(day, -7, GETDATE())"
        elif filter_period == 'month':
            query += " AND CreatedAt >= DATEADD(month, -1, GETDATE())"

        query += " ORDER BY CreatedAt DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def approve_comment(comment_id: int, approved_by: str) -> bool:
    """Duyệt bình luận."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE DirectiveComments SET Status = 'approved', ApprovedBy = ?, ApprovedAt = GETDATE() WHERE CommentID = ?",
            (approved_by, comment_id),
        )
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_comment(comment_id: int) -> bool:
    """Xóa bình luận."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM DirectiveComments WHERE CommentID = ?", (comment_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def get_pending_comment_count(department: Optional[str] = None) -> int:
    """Đếm số bình luận pending. Nếu có department thì chỉ đếm của đơn vị đó."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if department and department.strip():
            cursor.execute(
                "SELECT COUNT(*) FROM DirectiveComments WHERE Status = 'pending' AND Department = ?",
                (department.strip(),),
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM DirectiveComments WHERE Status = 'pending'")
        count = cursor.fetchone()[0]
        return count
    finally:
        conn.close()


# ===================== BANNERS (TICKER) =====================

def create_banner(
    content: str,
    start_date: str,
    end_date: str,
    created_by: str,
    created_by_name: str = "",
    department: str = "",
    status: str = "Draft"
) -> int:
    """Tạo banner thông báo chữ chạy ngang mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO Banners (Content, StartDate, EndDate, Status, CreatedBy, CreatedByName, Department, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.BannerID
            VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
            """,
            (content.strip(), start_date.strip(), end_date.strip(), status.strip(), created_by, created_by_name, department),
        )
        banner_id = cursor.fetchone()[0]
        conn.commit()
        return banner_id
    finally:
        conn.close()


def get_banners(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Lấy danh sách banners có hỗ trợ lọc theo thời gian và trạng thái."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM Banners WHERE 1=1"
        params = []

        if status and status.strip():
            query += " AND Status = ?"
            params.append(status.strip())

        if start_date and start_date.strip():
            query += " AND EndDate >= ?"
            params.append(start_date.strip())

        if end_date and end_date.strip():
            query += " AND StartDate <= ?"
            params.append(end_date.strip())

        query += " ORDER BY CreatedAt DESC, BannerID DESC"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def get_active_banners(target_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lấy danh sách các banner đã công bố đang có hiệu lực trong ngày target_date."""
    if not target_date or not str(target_date).strip():
        target_date = datetime.date.today().isoformat()
    else:
        target_date = str(target_date).strip()[:10]

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM Banners
            WHERE Status = 'Published'
              AND StartDate <= ?
              AND EndDate >= ?
            ORDER BY CreatedAt ASC, BannerID ASC
            """,
            (target_date, target_date),
        )
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def get_banner_by_id(banner_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 banner theo ID."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Banners WHERE BannerID = ?", (banner_id,))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


def update_banner(
    banner_id: int,
    content: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
) -> bool:
    """Cập nhật thông tin banner."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        fields = []
        params = []
        if content is not None:
            fields.append("Content = ?")
            params.append(content.strip())
        if start_date is not None:
            fields.append("StartDate = ?")
            params.append(start_date.strip())
        if end_date is not None:
            fields.append("EndDate = ?")
            params.append(end_date.strip())
        if status is not None:
            fields.append("Status = ?")
            params.append(status.strip())

        if not fields:
            return False

        fields.append("UpdatedAt = GETDATE()")
        params.append(banner_id)
        sql = f"UPDATE Banners SET {', '.join(fields)} WHERE BannerID = ?"
        cursor.execute(sql, tuple(params))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def publish_banner(banner_id: int) -> bool:
    """Công bố banner (Status = 'Published')."""
    return update_banner(banner_id, status="Published")


def delete_banner(banner_id: int) -> bool:
    """Xóa banner khỏi cơ sở dữ liệu."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Banners WHERE BannerID = ?", (banner_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


# Khởi tạo bảng ngay khi import module
init_db()


# ===================== SHARED DOCUMENTS (Văn bản chia sẻ) =====================

def create_shared_document(
    title: str,
    content: str,
    doc_type: str,
    department: Optional[str],
    created_by: Optional[str],
    created_by_name: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_name: Optional[str] = None,
    attachment_size: Optional[int] = None,
) -> int:
    """Tạo văn bản chia sẻ mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO SharedDocuments
               (Title, Content, DocType, Department, CreatedBy, CreatedByName,
                AttachmentPath, AttachmentName, AttachmentSize)
               OUTPUT INSERTED.DocID
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, content, doc_type, department, created_by, created_by_name,
             attachment_path, attachment_name, attachment_size),
        )
        doc_id = cursor.fetchone()[0]
        conn.commit()
        return doc_id
    finally:
        conn.close()


def get_shared_documents(
    doc_type: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Lấy danh sách văn bản chia sẻ có hỗ trợ lọc theo hình thức, ban, ngày, tháng."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = (
            f"SELECT TOP ({int(limit)}) * FROM SharedDocuments WHERE 1=1"
        )
        params: List[Any] = []

        if doc_type and doc_type.strip():
            query += " AND DocType = ?"
            params.append(doc_type.strip())
        if department and department.strip():
            dept_val = department.strip()
            # Normalize and support variations like TT <-> Trung tâm, TTPHTL, TFS, PTGĐ
            sub_clauses = ["Department = ?", "Department LIKE ?"]
            params.extend([dept_val, f"%{dept_val}%"])

            # Map common variants
            clean_name = dept_val.replace("Trung tâm", "").replace("TT", "").replace("Ban", "").strip()
            if clean_name and len(clean_name) >= 3:
                sub_clauses.append("Department LIKE ?")
                params.append(f"%{clean_name}%")

            if "Phát hình" in dept_val or "Tư liệu" in dept_val or dept_val == "TTPHTL":
                sub_clauses.extend(["Department = 'TTPHTL'", "Department LIKE '%TTPHTL%'"])
            elif "Hãng phim" in dept_val or "TFS" in dept_val:
                sub_clauses.append("Department LIKE '%TFS%'")
            elif "Văn phòng" in dept_val:
                sub_clauses.append("Department LIKE '%Văn phòng%'")
            elif "Giám đốc" in dept_val or dept_val.startswith("PTGĐ"):
                sub_clauses.extend(["Department LIKE '%Giám đốc%'", "Department LIKE '%PTGĐ%'"])

            query += f" AND ({' OR '.join(sub_clauses)})"
        if search and search.strip():
            query += " AND (Title LIKE ? OR Content LIKE ?)"
            params.extend([f"%{search.strip()}%", f"%{search.strip()}%"])
        if month and month.strip():
            query += " AND CONVERT(VARCHAR(7), CreatedAt, 120) = ?"
            params.append(month.strip())
        elif date and date.strip():
            query += " AND CONVERT(VARCHAR(10), CreatedAt, 120) = ?"
            params.append(date.strip())
        elif start_date or end_date:
            if start_date:
                query += " AND CONVERT(VARCHAR(10), CreatedAt, 120) >= ?"
                params.append(start_date.strip())
            if end_date:
                query += " AND CONVERT(VARCHAR(10), CreatedAt, 120) <= ?"
                params.append(end_date.strip())

        query += " ORDER BY CreatedAt DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows_to_dict_list(cursor, rows)
    finally:
        conn.close()


def get_shared_document(doc_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 văn bản chia sẻ."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM SharedDocuments WHERE DocID = ?", (doc_id,))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)
    finally:
        conn.close()


def update_shared_document(
    doc_id: int,
    title: Optional[str] = None,
    content: Optional[str] = None,
    doc_type: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_name: Optional[str] = None,
    attachment_size: Optional[int] = None,
) -> bool:
    """Cập nhật văn bản chia sẻ."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        fields: List[str] = []
        params: List[Any] = []

        if title is not None:
            fields.append("Title = ?")
            params.append(title)
        if content is not None:
            fields.append("Content = ?")
            params.append(content)
        if doc_type is not None:
            fields.append("DocType = ?")
            params.append(doc_type)
        if attachment_path is not None:
            fields.append("AttachmentPath = ?")
            params.append(attachment_path)
        if attachment_name is not None:
            fields.append("AttachmentName = ?")
            params.append(attachment_name)
        if attachment_size is not None:
            fields.append("AttachmentSize = ?")
            params.append(attachment_size)

        if not fields:
            return False

        fields.append("UpdatedAt = GETDATE()")
        params.append(doc_id)
        sql = f"UPDATE SharedDocuments SET {', '.join(fields)} WHERE DocID = ?"
        cursor.execute(sql, tuple(params))
        rows_affected = cursor.rowcount
        conn.commit()
        return rows_affected > 0
    finally:
        conn.close()


def delete_shared_document(doc_id: int) -> Optional[str]:
    """Xóa văn bản chia sẻ, trả về đường dẫn file đính kèm để xóa vật lý."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT AttachmentPath FROM SharedDocuments WHERE DocID = ?", (doc_id,))
        row = cursor.fetchone()
        attachment_path = row[0] if row else None

        cursor.execute("DELETE FROM SharedDocuments WHERE DocID = ?", (doc_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        if rows_affected > 0:
            return attachment_path
        return None
    finally:
        conn.close()
