# -*- coding: utf-8 -*-
"""
main.py - Backend FastAPI cho ứng dụng Giao Ban HTV
=====================================================
Quản lý cuộc họp giao ban hằng ngày, chỉ đạo TGĐ, sự kiện.
Dùng SSO + Local Auth giống hệt Văn phòng Đài.
"""
import os
import time
import datetime
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from typing import Optional, List, Any

import db_service

try:
    from htv_sso_fastapi import (
        init_sso, get_sso_user, sso_exception_handler,
        _redirect_to_login, _extract_sso_department, _extract_sso_role,
    )
except ImportError:
    from htv_sso_fastapi import init_sso, get_sso_user, sso_exception_handler, _redirect_to_login

    def _extract_sso_department(p):
        return ""

    def _extract_sso_role(p):
        return "nhan_vien"


app = FastAPI(title="Giao Ban HTV")

# Cấu hình HTV SSO (giống Văn phòng Đài, session cookie riêng)
SSO_SECRET_KEY = os.environ.get("SSO_SECRET_KEY", "HTV_SSO_SHARED_SECRET_DOI_KHI_DEPLOY_THAT_2026")
SSO_SERVER_URL = os.environ.get("SSO_SERVER_URL", "http://ttphtl.htv.com.vn")

init_sso(app, secret_key=SSO_SECRET_KEY, sso_server_url=SSO_SERVER_URL, verify_slo=False, session_cookie="session_giaoban")
app.add_exception_handler(_redirect_to_login, sso_exception_handler)

# Tạo thư mục static và templates nếu chưa có
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# Cấu hình static và templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ===================== AUTH & HELPERS =====================

from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from htv_sso_fastapi import _login_url


def map_sso_role(sso_role: Optional[Any]) -> str:
    """Ánh xạ vai trò từ SSO sang ứng dụng."""
    if not sso_role:
        return "nhan_vien"
    role_str = str(sso_role).strip().lower()

    if role_str in ["04", "bantgd"] or any(
        k in role_str for k in ["bantgd", "tgđ", "ptgđ", "ban tổng giám đốc"]
    ):
        return "BanTGD"

    if role_str in ["02", "03", "bpt", "tb", "pb", "gd", "pgd"] or any(
        k in role_str
        for k in [
            "pho_ban", "truong_ban", "phó ban", "trưởng ban", "phó_ban", "trưởng_ban",
            "giam doc", "giám đốc", "giam_doc", "giám_đốc", "phó giám đốc", "phó_giám_đốc",
            "trường ban", "pho giam doc", "bpt",
        ]
    ):
        return "BPT"

    if role_str in ["admin"]:
        return "Admin"

    return "nhan_vien"


def get_current_user(request: Request) -> dict:
    """Lấy thông tin user hiện tại từ SSO hoặc Local session."""
    sso_user = get_sso_user(request)
    if not sso_user:
        return {"logged_in": False}

    username = sso_user.get("username")
    raw_payload = sso_user.get("raw_payload") or {}

    sso_role = sso_user.get("vai_tro") or sso_user.get("role") or "nhan_vien"
    if (sso_role in ["Guest", "nhan_vien", None, "", "user"]) and raw_payload:
        extracted_role = _extract_sso_role(raw_payload)
        if extracted_role and extracted_role != "nhan_vien":
            sso_role = extracted_role

    sso_dept = sso_user.get("ban") or sso_user.get("department")
    if not sso_dept and raw_payload:
        sso_dept = _extract_sso_department(raw_payload)

    mapped_role = map_sso_role(sso_role)

    if username:
        db_service.save_or_update_sso_user(username, mapped_role, sso_dept, force_update=True)

    db_user = db_service.get_user(username) if username else None

    role = mapped_role if mapped_role != "nhan_vien" else ((db_user.get("Role") if db_user else None) or mapped_role)
    dept = (db_user.get("Department") if (db_user and db_user.get("Department")) else None) or (sso_dept or "")
    full_name = sso_user.get("full_name") or username

    return {
        "logged_in": True,
        "username": username,
        "full_name": full_name,
        "role": role,
        "department": dept,
    }


def is_vpd_user(role: str, dept: str) -> bool:
    """Kiểm tra user có thuộc BPT Văn phòng Đài không."""
    if role in ["Admin", "BanTGD"]:
        return True
    if role == "BPT":
        dept_clean = (dept or "").strip().lower()
        return any(k in dept_clean for k in ["văn phòng đài", "van phong dai", "vpd", "vpđ", "văn phòng"])
    return False


def can_edit_report(user_role: str, user_dept: str, report_dept: str) -> bool:
    """Kiểm tra user có quyền sửa báo cáo của Ban nào đó."""
    if user_role == "Admin":
        return True
    if user_role in ["BPT", "BanTGD"]:
        # BPT chỉ sửa báo cáo của Ban mình (hoặc VPĐ sửa tất cả)
        if is_vpd_user(user_role, user_dept):
            return True
        user_dept_clean = (user_dept or "").strip().lower()
        report_dept_clean = (report_dept or "").strip().lower()
        return user_dept_clean == report_dept_clean or user_dept_clean in report_dept_clean or report_dept_clean in user_dept_clean
    return False


# ===================== PYDANTIC MODELS =====================

class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str
    department: Optional[str] = None


class UserUpdateRequest(BaseModel):
    role: str
    department: Optional[str] = ""


class MeetingCreateRequest(BaseModel):
    meeting_date: str = Field(..., alias="meetingDate")
    start_time: str = Field("08:00", alias="startTime")
    end_time: Optional[str] = Field(None, alias="endTime")
    location: str = Field("Phòng họp Giao ban Đài Phát thanh và Truyền hình Thành phố", alias="location")
    chairman: Optional[str] = None
    chairman_title: Optional[str] = Field(None, alias="chairmanTitle")
    secretary: Optional[str] = None
    secretary_title: Optional[str] = Field(None, alias="secretaryTitle")
    attendees: Optional[str] = None

    class Config:
        populate_by_name = True


class MeetingUpdateRequest(BaseModel):
    meeting_date: Optional[str] = Field(None, alias="meetingDate")
    start_time: Optional[str] = Field(None, alias="startTime")
    end_time: Optional[str] = Field(None, alias="endTime")
    location: Optional[str] = None
    chairman: Optional[str] = None
    chairman_title: Optional[str] = Field(None, alias="chairmanTitle")
    secretary: Optional[str] = None
    secretary_title: Optional[str] = Field(None, alias="secretaryTitle")
    attendees: Optional[str] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True


class ReportCreateRequest(BaseModel):
    department: str
    category: str = "noi_dung"
    content: str = ""


class DirectiveCreateRequest(BaseModel):
    category: str = "ket_luan"
    content: str
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    deadline: Optional[str] = None
    priority: int = 0

    class Config:
        populate_by_name = True


class DirectiveUpdateRequest(BaseModel):
    content: Optional[str] = None
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    deadline: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    category: Optional[str] = None

    class Config:
        populate_by_name = True


class EventCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str = Field(..., alias="eventDate")
    event_end_date: Optional[str] = Field(None, alias="eventEndDate")
    event_type: str = Field("tuan", alias="eventType")

    class Config:
        populate_by_name = True


class EventUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = Field(None, alias="eventDate")
    event_end_date: Optional[str] = Field(None, alias="eventEndDate")
    event_type: Optional[str] = Field(None, alias="eventType")

    class Config:
        populate_by_name = True


# ===================== ROUTES =====================

@app.get("/login-sso")
async def trigger_sso_login(request: Request):
    return RedirectResponse(url=_login_url(request), status_code=302)


@app.get("/logout-local")
async def local_logout(request: Request):
    request.session.clear()
    html_content = """
    <!DOCTYPE html>
    <html><head><title>Đang đăng xuất...</title></head>
    <body><script>window.close();setTimeout(function(){window.open('','_self','');window.close();},100);</script></body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    token = request.query_params.get("token")
    if token:
        return RedirectResponse(url=f"/api/auth/sso?token={token}", status_code=303)

    sso_user = get_sso_user(request)
    referer = request.headers.get("referer", "")

    if not sso_user and (
        ("10.1.1.215" in referer or "ttphtl.htv.com.vn" in referer)
        or request.query_params.get("sso") == "true"
    ):
        return RedirectResponse(url=_login_url(request), status_code=302)

    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/api/me")
def get_current_user_info(request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        return {"logged_in": False, "user": None}
    return user


@app.post("/api/login")
def login(request: Request, req: LoginRequest):
    user = db_service.get_user(req.username)
    if not user or user["Password"] != req.password:
        raise HTTPException(status_code=400, detail="Tài khoản hoặc mật khẩu không chính xác.")

    request.session["sso_user"] = {
        "username": user["Username"],
        "full_name": user["Username"],
        "role": user["Role"],
        "department": user.get("Department") or "",
        "sver": 1,
    }
    request.session["_sso_last_check"] = time.time()

    return {
        "username": user["Username"],
        "role": user["Role"],
        "department": user.get("Department") or "",
    }


# ===================== USER MANAGEMENT =====================

@app.get("/api/users/new-count")
def get_new_users_count(request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin":
        return {"count": 0}
    return {"count": db_service.get_new_user_count()}


@app.get("/api/users")
def get_users(request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập.")
    return db_service.get_all_users()


@app.post("/api/users")
def add_user(req: UserCreateRequest, request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập.")
    existing = db_service.get_user(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại.")
    db_service.create_user(req.username, req.password, req.role, req.department)
    return {"success": True, "message": "Tạo tài khoản thành công!"}


@app.put("/api/users/{username}")
def update_user_info(username: str, req: UserUpdateRequest, request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập.")
    db_service.save_or_update_sso_user(username, req.role, req.department, force_update=True)
    return {"success": True, "message": f"Đã cập nhật tài khoản '{username}'!"}


@app.delete("/api/users/{username}")
def delete_user(username: str, request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập.")
    if user.get("username", "").strip().lower() == username.strip().lower():
        raise HTTPException(status_code=400, detail="Bạn không thể tự xóa tài khoản của chính mình.")
    success = db_service.delete_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return {"success": True, "message": "Xóa tài khoản thành công!"}


# ===================== MEETINGS =====================

def parse_date(date_str: str) -> str:
    """Chuyển DD-MM-YYYY hoặc YYYY-MM-DD sang YYYY-MM-DD."""
    if not date_str:
        return date_str
    try:
        dt = datetime.datetime.strptime(date_str, "%d-%m-%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        try:
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ.")


@app.get("/api/meetings")
def api_get_meetings(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
):
    db_start = parse_date(start_date) if start_date else None
    db_end = parse_date(end_date) if end_date else None
    meetings = db_service.get_meetings(start_date=db_start, end_date=db_end, status=status)
    return meetings


@app.post("/api/meetings")
def api_create_meeting(req: MeetingCreateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Chỉ BPT Văn phòng Đài hoặc Admin mới có quyền tạo cuộc họp.")

    db_date = parse_date(req.meeting_date)
    meeting_id = db_service.create_meeting(
        meeting_date=db_date,
        start_time=req.start_time,
        end_time=req.end_time,
        location=req.location,
        chairman=req.chairman,
        chairman_title=req.chairman_title,
        secretary=req.secretary,
        secretary_title=req.secretary_title,
        attendees=req.attendees,
        status="Draft",
        created_by=user.get("username"),
    )
    return {"success": True, "message": "Tạo cuộc họp thành công!", "meeting_id": meeting_id}


@app.get("/api/meetings/{meeting_id}")
def api_get_meeting(meeting_id: int):
    meeting = db_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")
    return meeting


@app.put("/api/meetings/{meeting_id}")
def api_update_meeting(meeting_id: int, req: MeetingUpdateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Chỉ BPT Văn phòng Đài hoặc Admin mới có quyền sửa cuộc họp.")

    update_data = {}
    if req.meeting_date:
        update_data["MeetingDate"] = parse_date(req.meeting_date)
    if req.start_time is not None:
        update_data["StartTime"] = req.start_time
    if req.end_time is not None:
        update_data["EndTime"] = req.end_time
    if req.location is not None:
        update_data["Location"] = req.location
    if req.chairman is not None:
        update_data["Chairman"] = req.chairman
    if req.chairman_title is not None:
        update_data["ChairmanTitle"] = req.chairman_title
    if req.secretary is not None:
        update_data["Secretary"] = req.secretary
    if req.secretary_title is not None:
        update_data["SecretaryTitle"] = req.secretary_title
    if req.attendees is not None:
        update_data["Attendees"] = req.attendees
    if req.status is not None:
        update_data["Status"] = req.status

    success = db_service.update_meeting(meeting_id, **update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")
    return {"success": True, "message": "Cập nhật cuộc họp thành công!"}


@app.delete("/api/meetings/{meeting_id}")
def api_delete_meeting(meeting_id: int, request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa cuộc họp.")
    success = db_service.delete_meeting(meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")
    return {"success": True, "message": "Xóa cuộc họp thành công!"}


# ===================== REPORTS =====================

@app.get("/api/meetings/{meeting_id}/reports")
def api_get_reports(meeting_id: int, category: Optional[str] = None):
    return db_service.get_reports(meeting_id, category=category)


@app.post("/api/meetings/{meeting_id}/reports")
def api_create_report(meeting_id: int, req: ReportCreateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")

    user_role = user.get("role", "nhan_vien")
    user_dept = user.get("department", "")

    if not can_edit_report(user_role, user_dept, req.department):
        raise HTTPException(status_code=403, detail=f"Bạn không có quyền nhập báo cáo cho '{req.department}'.")

    meeting = db_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")

    report_id = db_service.create_report(
        meeting_id=meeting_id,
        department=req.department,
        category=req.category,
        content=req.content,
        created_by=user.get("username"),
    )
    return {"success": True, "message": "Lưu báo cáo thành công!", "report_id": report_id}


@app.put("/api/meetings/{meeting_id}/reports/{report_id}")
def api_update_report(meeting_id: int, report_id: int, req: ReportCreateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")

    report = db_service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo.")

    user_role = user.get("role", "nhan_vien")
    user_dept = user.get("department", "")

    if not can_edit_report(user_role, user_dept, report["Department"]):
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa báo cáo này.")

    success = db_service.update_report(report_id, req.content, created_by=user.get("username"))
    if not success:
        raise HTTPException(status_code=404, detail="Không thể cập nhật báo cáo.")
    return {"success": True, "message": "Cập nhật báo cáo thành công!"}


@app.delete("/api/meetings/{meeting_id}/reports/{report_id}")
def api_delete_report(meeting_id: int, report_id: int, request: Request):
    user = get_current_user(request)
    if user.get("role") != "Admin" and not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa báo cáo.")
    success = db_service.delete_report(report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo.")
    return {"success": True, "message": "Xóa báo cáo thành công!"}


# ===================== DIRECTIVES =====================

@app.get("/api/directives")
def api_get_all_directives(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    days: Optional[int] = None,
    mode: Optional[str] = "default",  # "default" (today+yesterday), "all", "days", "custom"
    category: Optional[str] = None,
):
    """API lấy danh sách chỉ đạo TGĐ có hỗ trợ lọc theo Ban và Ngày."""
    if mode == "all":
        return db_service.get_directives_filtered(
            department=department,
            category=category,
        )
    elif days and days > 0:
        return db_service.get_recent_directives(days=days, department=department)
    elif start_date or end_date:
        db_start = parse_date(start_date) if start_date else None
        db_end = parse_date(end_date) if end_date else None
        return db_service.get_directives_filtered(
            start_date=db_start,
            end_date=db_end,
            department=department,
            category=category,
        )
    else:
        # Mặc định: hôm nay và hôm qua (có fallback 7 ngày nếu chưa có dữ liệu)
        return db_service.get_recent_directives_2days(department=department)


@app.get("/api/directives/today")
def api_get_today_directives(department: Optional[str] = None):
    """Lấy chỉ đạo TGĐ (mặc định hôm nay & hôm qua)."""
    return db_service.get_recent_directives_2days(department=department)


@app.get("/api/directives/recent")
def api_get_recent_directives(days: int = 7, department: Optional[str] = None):
    """Lấy chỉ đạo N ngày gần nhất."""
    return db_service.get_recent_directives(days=days, department=department)


@app.get("/api/meetings/{meeting_id}/directives")
def api_get_directives(meeting_id: int, category: Optional[str] = None):
    return db_service.get_directives(meeting_id=meeting_id, category=category)


@app.post("/api/meetings/{meeting_id}/directives")
def api_create_directive(meeting_id: int, req: DirectiveCreateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Chỉ BPT Văn phòng Đài hoặc Admin mới có quyền nhập chỉ đạo.")

    meeting = db_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")

    directive_id = db_service.create_directive(
        meeting_id=meeting_id,
        category=req.category,
        content=req.content,
        assigned_to=req.assigned_to,
        deadline=req.deadline,
        priority=req.priority,
        created_by=user.get("username"),
    )
    return {"success": True, "message": "Thêm chỉ đạo thành công!", "directive_id": directive_id}


@app.put("/api/meetings/{meeting_id}/directives/{directive_id}")
def api_update_directive(meeting_id: int, directive_id: int, req: DirectiveUpdateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Chỉ BPT Văn phòng Đài hoặc Admin mới có quyền sửa chỉ đạo.")

    update_data = {}
    if req.content is not None:
        update_data["Content"] = req.content
    if req.assigned_to is not None:
        update_data["AssignedTo"] = req.assigned_to
    if req.deadline is not None:
        update_data["Deadline"] = req.deadline
    if req.status is not None:
        update_data["Status"] = req.status
    if req.priority is not None:
        update_data["Priority"] = req.priority
    if req.category is not None:
        update_data["Category"] = req.category

    success = db_service.update_directive(directive_id, **update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy chỉ đạo.")
    return {"success": True, "message": "Cập nhật chỉ đạo thành công!"}


@app.delete("/api/meetings/{meeting_id}/directives/{directive_id}")
def api_delete_directive(meeting_id: int, directive_id: int, request: Request):
    user = get_current_user(request)
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa chỉ đạo.")
    success = db_service.delete_directive(directive_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy chỉ đạo.")
    return {"success": True, "message": "Xóa chỉ đạo thành công!"}


# ===================== EVENTS =====================

@app.get("/api/events")
def api_get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
):
    db_start = parse_date(start_date) if start_date else None
    db_end = parse_date(end_date) if end_date else None
    return db_service.get_events(start_date=db_start, end_date=db_end, event_type=event_type)


@app.post("/api/events")
def api_create_event(req: EventCreateRequest, request: Request):
    user = get_current_user(request)
    if not user.get("logged_in"):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập.")
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Chỉ BPT Văn phòng Đài hoặc Admin mới có quyền thêm sự kiện.")

    event_id = db_service.create_event(
        title=req.title,
        event_date=parse_date(req.event_date),
        event_end_date=parse_date(req.event_end_date) if req.event_end_date else None,
        description=req.description,
        event_type=req.event_type,
        created_by=user.get("username"),
    )
    return {"success": True, "message": "Thêm sự kiện thành công!", "event_id": event_id}


@app.put("/api/events/{event_id}")
def api_update_event(event_id: int, req: EventUpdateRequest, request: Request):
    user = get_current_user(request)
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa sự kiện.")

    update_data = {}
    if req.title is not None:
        update_data["Title"] = req.title
    if req.description is not None:
        update_data["Description"] = req.description
    if req.event_date is not None:
        update_data["EventDate"] = parse_date(req.event_date)
    if req.event_end_date is not None:
        update_data["EventEndDate"] = parse_date(req.event_end_date)
    if req.event_type is not None:
        update_data["EventType"] = req.event_type

    success = db_service.update_event(event_id, **update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự kiện.")
    return {"success": True, "message": "Cập nhật sự kiện thành công!"}


@app.delete("/api/events/{event_id}")
def api_delete_event(event_id: int, request: Request):
    user = get_current_user(request)
    if not is_vpd_user(user.get("role", ""), user.get("department", "")):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa sự kiện.")
    success = db_service.delete_event(event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự kiện.")
    return {"success": True, "message": "Xóa sự kiện thành công!"}


# ===================== HEARTBEAT =====================

@app.post("/api/heartbeat")
async def post_heartbeat():
    return {"status": "ok"}
