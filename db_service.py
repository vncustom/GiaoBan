# -*- coding: utf-8 -*-
"""
db_service.py - Database Service cho ứng dụng Giao Ban HTV
===========================================================
Sử dụng SQLite, thiết kế sẵn cho migrate sang MS SQL Server.
Tránh sử dụng cú pháp SQLite-specific.
"""
import sqlite3
import os
import datetime
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "giaoban.db")


def get_db_connection():
    conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA busy_timeout = 10000;")
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn


def init_db():
    """Khởi tạo cơ sở dữ liệu."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Bảng Users - giống Văn phòng Đài
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                UserID INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT UNIQUE NOT NULL,
                Password TEXT NOT NULL,
                Role TEXT NOT NULL DEFAULT 'nhan_vien',
                Department TEXT,
                IsNew INTEGER DEFAULT 0
            )
        """)

        # Bảng Meetings - Cuộc họp giao ban
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Meetings (
                MeetingID INTEGER PRIMARY KEY AUTOINCREMENT,
                MeetingDate TEXT NOT NULL,
                StartTime TEXT DEFAULT '08:00',
                EndTime TEXT,
                Location TEXT DEFAULT 'Phòng họp Giao ban Đài Phát thanh và Truyền hình Thành phố',
                Chairman TEXT,
                ChairmanTitle TEXT,
                Secretary TEXT,
                SecretaryTitle TEXT,
                Attendees TEXT,
                Status TEXT DEFAULT 'Draft',
                CreatedBy TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Bảng MeetingReports - Báo cáo từng Ban/Trung tâm
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MeetingReports (
                ReportID INTEGER PRIMARY KEY AUTOINCREMENT,
                MeetingID INTEGER NOT NULL,
                Department TEXT NOT NULL,
                Category TEXT NOT NULL DEFAULT 'noi_dung',
                Content TEXT,
                CreatedBy TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (MeetingID) REFERENCES Meetings(MeetingID)
            )
        """)

        # Bảng Directives - Chỉ đạo TGĐ & Kết luận (MeetingID NULL = chỉ đạo ngoài cuộc họp)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Directives (
                DirectiveID INTEGER PRIMARY KEY AUTOINCREMENT,
                MeetingID INTEGER,
                Category TEXT NOT NULL DEFAULT 'ket_luan',
                Content TEXT NOT NULL,
                AssignedTo TEXT,
                Deadline TEXT,
                Status TEXT DEFAULT 'pending',
                Priority INTEGER DEFAULT 0,
                DirectiveDate TEXT,
                CreatedBy TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (MeetingID) REFERENCES Meetings(MeetingID)
            )
        """)
        # Migration: thêm cột DirectiveDate nếu chưa có (cho DB cũ)
        try:
            cursor.execute("ALTER TABLE Directives ADD COLUMN DirectiveDate TEXT")
        except Exception:
            pass
        # Migration: cho phép MeetingID NULL nếu DB cũ có constraint NOT NULL
        # SQLite không hỗ trợ ALTER COLUMN, nhưng vì đã dùng CREATE IF NOT EXISTS nên chỉ cần patch mới

        # Bảng Events - Sự kiện tuần/tháng
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Events (
                EventID INTEGER PRIMARY KEY AUTOINCREMENT,
                Title TEXT NOT NULL,
                Description TEXT,
                EventDate TEXT NOT NULL,
                EventEndDate TEXT,
                EventType TEXT DEFAULT 'tuan',
                CreatedBy TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Đảm bảo tài khoản Admin local luôn sẵn sàng
        cursor.execute("SELECT UserID FROM Users WHERE LOWER(Username) = 'admin'")
        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.execute(
                "INSERT INTO Users (Username, Password, Role, Department, IsNew) VALUES ('admin', 'KTphtl', 'Admin', 'Văn phòng Đài', 0)"
            )

        conn.commit()
    except Exception as e:
        print(f"[DB INIT WARN] init_db warning: {e}")
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


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
        if row:
            return dict(row)
        return None
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
        return [dict(row) for row in rows]
    finally:
        conn.close()


def create_user(username: str, password_raw: str, role: str, department: Optional[str] = None) -> int:
    """Tạo tài khoản người dùng mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Users (Username, Password, Role, Department, IsNew) VALUES (?, ?, ?, ?, 0)",
            (username.strip(), password_raw, role, department or "HTV"),
        )
        user_id = cursor.lastrowid
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
            user_id = row["UserID"]
            if force_update:
                new_role = role or "nhan_vien"
                new_dept = department or "HTV"
                is_new = 0
            else:
                current_role = row["Role"]
                current_dept = row["Department"]
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
    end_time: Optional[str] = None,
    location: str = "Phòng họp Giao ban Đài Phát thanh và Truyền hình Thành phố",
    chairman: Optional[str] = None,
    chairman_title: Optional[str] = None,
    secretary: Optional[str] = None,
    secretary_title: Optional[str] = None,
    attendees: Optional[str] = None,
    status: str = "Draft",
    created_by: Optional[str] = None,
) -> int:
    """Tạo cuộc họp giao ban mới."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO Meetings (MeetingDate, StartTime, EndTime, Location, Chairman, ChairmanTitle, Secretary, SecretaryTitle, Attendees, Status, CreatedBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                meeting_date, start_time, end_time, location,
                chairman, chairman_title, secretary, secretary_title,
                attendees, status, created_by,
            ),
        )
        meeting_id = cursor.lastrowid
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
        return dict(row) if row else None
    finally:
        conn.close()


def get_meetings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Lấy danh sách cuộc họp theo bộ lọc."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM Meetings WHERE 1=1"
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

        query += " ORDER BY MeetingDate DESC, StartTime DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
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
            "Attendees", "Status",
        ]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)

        if not set_parts:
            return False

        set_parts.append("UpdatedAt = CURRENT_TIMESTAMP")
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


# ===================== MEETING REPORTS =====================

def create_report(
    meeting_id: int,
    department: str,
    category: str = "noi_dung",
    content: str = "",
    created_by: Optional[str] = None,
) -> int:
    """Thêm báo cáo của Ban/Trung tâm vào cuộc họp."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Kiểm tra xem đã có báo cáo của ban này chưa
        cursor.execute(
            "SELECT ReportID FROM MeetingReports WHERE MeetingID = ? AND Department = ? AND Category = ?",
            (meeting_id, department, category),
        )
        existing = cursor.fetchone()
        if existing:
            # Cập nhật nếu đã tồn tại
            cursor.execute(
                "UPDATE MeetingReports SET Content = ?, CreatedBy = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE ReportID = ?",
                (content, created_by, existing["ReportID"]),
            )
            conn.commit()
            return existing["ReportID"]

        cursor.execute(
            """INSERT INTO MeetingReports (MeetingID, Department, Category, Content, CreatedBy)
            VALUES (?, ?, ?, ?, ?)""",
            (meeting_id, department, category, content, created_by),
        )
        report_id = cursor.lastrowid
        conn.commit()
        return report_id
    finally:
        conn.close()


def get_reports(meeting_id: int, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lấy danh sách báo cáo của cuộc họp."""
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
        return [dict(row) for row in rows]
    finally:
        conn.close()


def update_report(report_id: int, content: str, created_by: Optional[str] = None) -> bool:
    """Cập nhật nội dung báo cáo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE MeetingReports SET Content = ?, CreatedBy = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE ReportID = ?",
            (content, created_by, report_id),
        )
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
        return dict(row) if row else None
    finally:
        conn.close()


# ===================== DIRECTIVES =====================

def create_directive(
    meeting_id: int,
    category: str = "ket_luan",
    content: str = "",
    assigned_to: Optional[str] = None,
    deadline: Optional[str] = None,
    priority: int = 0,
    created_by: Optional[str] = None,
) -> int:
    """Thêm chỉ đạo/kết luận cuộc họp."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO Directives (MeetingID, Category, Content, AssignedTo, Deadline, Priority, CreatedBy)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (meeting_id, category, content, assigned_to, deadline, priority, created_by),
        )
        directive_id = cursor.lastrowid
        conn.commit()
        return directive_id
    finally:
        conn.close()


def create_standalone_directive(
    category: str = "y_kien_tgd",
    content: str = "",
    assigned_to: Optional[str] = None,
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
            """INSERT INTO Directives (MeetingID, Category, Content, AssignedTo, Deadline, Priority, DirectiveDate, CreatedBy)
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)""",
            (category, content, assigned_to, deadline, priority, directive_date, created_by),
        )
        directive_id = cursor.lastrowid
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
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_directive(directive_id: int) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết 1 chỉ đạo."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Directives WHERE DirectiveID = ?", (directive_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
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
        allowed_fields = ["Content", "AssignedTo", "Deadline", "Status", "Priority", "Category"]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)

        if not set_parts:
            return False

        set_parts.append("UpdatedAt = CURRENT_TIMESTAMP")
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
        # Dùng COALESCE để lấy ngày: ưu tiên MeetingDate từ cuộc họp, fallback DirectiveDate
        query = """
            SELECT d.*,
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
            query += " AND (d.AssignedTo LIKE ? OR d.AssignedTo = ?)"
            params.append(f"%{department.strip()}%")
            params.append(department.strip())
        if category and category.strip():
            query += " AND d.Category = ?"
            params.append(category.strip())

        query += " ORDER BY COALESCE(m.MeetingDate, d.DirectiveDate) DESC, d.Priority DESC, d.DirectiveID DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
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
        allowed_fields = ["Content", "AssignedTo", "Deadline", "Status", "Priority", "Category", "DirectiveDate"]
        for key, value in kwargs.items():
            if key in allowed_fields:
                set_parts.append(f"{key} = ?")
                params.append(value)
        if not set_parts:
            return False
        set_parts.append("UpdatedAt = CURRENT_TIMESTAMP")
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
            VALUES (?, ?, ?, ?, ?, ?)""",
            (title, description, event_date, event_end_date, event_type, created_by),
        )
        event_id = cursor.lastrowid
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
        return [dict(row) for row in rows]
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
        set_parts.append("UpdatedAt = CURRENT_TIMESTAMP")
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


# Khởi tạo bảng ngay khi import module
init_db()
