# -*- coding: utf-8 -*-
"""
htv_sso_fastapi.py - SSO Client cho trang thành viên dùng FastAPI
=================================================================
Copy file này vào cùng thư mục với app FastAPI, rồi import.

Cách dùng:
    from fastapi import FastAPI, Request, Depends
    from htv_sso_fastapi import init_sso, sso_required, get_sso_user

    app = FastAPI()
    init_sso(app,
             secret_key="HTV_SSO_SHARED_SECRET_...",
             sso_server_url="http://IP_Dashboard:8080")

    @app.get("/")
    async def home(user: dict = Depends(sso_required)):
        return {"message": f"Xin chào {user['username']}"}

Dependencies:
    pip install fastapi uvicorn PyJWT requests itsdangerous
"""
import time
import jwt
import requests as http_requests
from functools import wraps
from urllib.parse import quote

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from starlette.middleware.sessions import SessionMiddleware


def _extract_sso_department(payload: dict) -> str:
    if not isinstance(payload, dict):
        return ""
    
    sources = [payload]
    for key in ["user", "data", "userInfo", "user_info"]:
        val = payload.get(key)
        if isinstance(val, dict):
            sources.append(val)
            
    possible_keys = [
        "ban", "trung_tam", "trungtam", "ban_trung_tam", "ban_tt", "Ban", "TrungTam", "BanTrungTam",
        "department", "don_vi", "donvi", "donVi", "Department", "dept", 
        "unit", "don_vi_cong_tac", "phong_ban", "phongban", 
        "department_name", "DepartmentName", "Department_Name"
    ]
    
    for src in sources:
        for k in possible_keys:
            v = src.get(k)
            if v is not None:
                if isinstance(v, dict):
                    vals = [str(v1).strip() for k1, v1 in v.items() if v1]
                    if vals:
                        return vals[0]
                elif isinstance(v, (list, tuple)) and len(v) > 0:
                    return str(v[0]).strip()
                elif isinstance(v, str) and v.strip() != "":
                    return v.strip()
    return ""


def _extract_sso_role(payload: dict) -> str:
    if not isinstance(payload, dict):
        return "nhan_vien"
    
    sources = [payload]
    for key in ["user", "data", "userInfo", "user_info"]:
        val = payload.get(key)
        if isinstance(val, dict):
            sources.append(val)
            
    possible_keys = [
        "role", "vai_tro", "vaitro", "vai_tro_trong_ban", "chuc_vu", "chucvu", "chuc_danh", "chucdanh",
        "position", "title", "user_role", "role_id", "role_code", "role_name", "ds_vai_tro", "group", "groups", "ma_chuc_vu"
    ]
    
    for src in sources:
        for k in possible_keys:
            v = src.get(k)
            if v is not None:
                if isinstance(v, dict):
                    return " ".join([f"{k1} {v1}" for k1, v1 in v.items()])
                elif isinstance(v, (list, tuple)):
                    return " ".join([str(x) for x in v])
                elif str(v).strip() != "":
                    return str(v).strip()
    return "nhan_vien"


def init_sso(app: FastAPI, secret_key: str, sso_server_url: str,
             verify_slo: bool = True, slo_check_interval: int = 30,
             session_cookie: str = "session"):
    """
    Gắn SSO Client vào FastAPI app.

    Tham số:
      secret_key         : khóa bí mật CHUNG với Dashboard (giống hệt)
      sso_server_url     : URL Dashboard, vd "http://10.1.1.xxx:8080"
      verify_slo         : True = check Single Log-Out mỗi (interval) giây
      slo_check_interval : giây giữa 2 lần check SLO
      session_cookie     : tên Cookie lưu session (tránh ghi đè cookie giữa các app chung IP)
    """
    sso_server = sso_server_url.rstrip("/")

    # Session middleware cho FastAPI (lưu cookie riêng cho từng app)
    app.add_middleware(SessionMiddleware, secret_key=secret_key, session_cookie=session_cookie)

    # Lưu config vào app.state
    app.state.sso_secret = secret_key
    app.state.sso_server = sso_server
    app.state.sso_verify_slo = verify_slo
    app.state.sso_interval = slo_check_interval

    # ---- Route nhận token từ Dashboard (POST body) ----
    @app.post("/api/auth/sso")
    @app.get("/api/auth/sso")
    @app.post("/sso")
    @app.get("/sso")  # GET fallback tương thích
    async def sso_callback(request: Request):
        try:
            # Ưu tiên POST body, fallback GET query
            token = None
            if request.method == "POST":
                form = await request.form()
                token = form.get("token")
            if not token:
                token = request.query_params.get("token")
            
            print(f"[SSO DEBUG] Nhan request /sso | Method: {request.method} | Token co hay khong: {bool(token)}")

            if not token:
                print("[SSO DEBUG] Khong tim thay token trong request!")
                return RedirectResponse(url=_login_url(request), status_code=302)

            try:
                # leeway=300 để bù trừ lệch đồng hồ (clock skew) lên đến 5 phút giữa server SSO và server app
                # options={"verify_iat": False} bỏ qua lỗi "not yet valid (iat)" do lệch giờ
                payload = jwt.decode(
                    token, secret_key, algorithms=["HS256"],
                    leeway=300,
                    options={"verify_iat": False}
                )
                print(f"[SSO DEBUG] Giai ma Token thanh cong! Payload: {payload}")
            except jwt.ExpiredSignatureError as e:
                print(f"[SSO DEBUG] Loi: Token da het han (ExpiredSignatureError): {e}")
                return RedirectResponse(url=_login_url(request), status_code=302)
            except jwt.InvalidTokenError as e:
                print(f"[SSO DEBUG] Loi: Token khong hop le hoac sai secret_key! Chi tiet: {e}")
                raise HTTPException(status_code=401, detail=f"Token không hợp lệ: {str(e)}")

            # Lưu vào session (dùng .get() linh hoạt tránh KeyError)
            username = payload.get("username")
            if isinstance(username, dict):
                username = username.get("username") or username.get("sub") or username.get("name")
            if not username or not isinstance(username, str):
                username = payload.get("sub") or payload.get("name") or payload.get("user") or "User"
            if isinstance(username, dict):
                username = str(username)

            role_val = payload.get("role") or _extract_sso_role(payload)
            vai_tro_val = payload.get("vai_tro") or payload.get("vai_tro_trong_ban") or role_val
            ban_val = payload.get("ban") or _extract_sso_department(payload)
            
            print(f"[SSO DEBUG] Parsed Username: {username} | Role: '{role_val}' | Vai tro: '{vai_tro_val}' | Ban: '{ban_val}'")

            request.session["sso_user"] = {
                "username": username,
                "full_name": payload.get("full_name") or payload.get("name") or username,
                "role": role_val,
                "vai_tro": vai_tro_val,
                "ban": ban_val,
                "department": ban_val,
                "raw_payload": payload if isinstance(payload, dict) else {},
                "sver": payload.get("sver"),
            }
            request.session["_sso_last_check"] = time.time()

            # Về trang đích ban đầu hoặc trang chủ
            next_url = request.session.pop("_sso_next", "/")
            print(f"[SSO DEBUG] Luu session thanh cong! Chuyen huong ve trang: {next_url}")
            return RedirectResponse(url=next_url, status_code=303)
        except HTTPException as he:
            raise he
        except Exception as err:
            import traceback
            print("[SSO ERROR EXCEPTION]:")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Loi SSO Internal: {str(err)}")

    # ---- Route logout (SLO) ----
    @app.get("/logout")
    async def sso_logout(request: Request):
        request.session.clear()
        html_content = """
        <!DOCTYPE html>
        <html>
        <head><title>Đang đăng xuất...</title></head>
        <body>
            <script>
                window.close();
                setTimeout(function() {
                    window.open('', '_self', '');
                    window.close();
                }, 100);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)


def _login_url(request: Request) -> str:
    """Tạo URL login Dashboard kèm ?next= callback."""
    sso_server = request.app.state.sso_server
    # Callback = URL /api/auth/sso của chính trang thành viên này
    callback = str(request.base_url).rstrip("/") + "/api/auth/sso"
    return f"{sso_server}/login?next={quote(callback)}"


def _check_slo(request: Request, user: dict) -> bool:
    """Gọi Dashboard check session_version còn hợp lệ (SLO)."""
    try:
        sso_server = request.app.state.sso_server
        resp = http_requests.get(
            f"{sso_server}/sso/session",
            params={"username": user["username"], "sver": user["sver"]},
            timeout=3,
        )
        return resp.ok and resp.json().get("valid", False)
    except http_requests.RequestException:
        return True  # Không gọi được Dashboard => tạm tin JWT


async def sso_required(request: Request) -> dict:
    """
    FastAPI Dependency — thay cho decorator.
    Dùng: async def route(user: dict = Depends(sso_required))

    Trả về dict user nếu đã login.
    Redirect về Dashboard login nếu chưa.
    """
    user = request.session.get("sso_user")

    if not user:
        # Nhớ trang user định vào
        request.session["_sso_next"] = str(request.url)
        raise _redirect_to_login(request)

    # Check Single Log-Out
    app = request.app
    if getattr(app.state, "sso_verify_slo", True):
        last = request.session.get("_sso_last_check", 0)
        interval = getattr(app.state, "sso_interval", 30)
        if time.time() - last > interval:
            if not _check_slo(request, user):
                request.session.clear()
                raise _redirect_to_login(request)
            request.session["_sso_last_check"] = time.time()

    return user


def get_sso_user(request: Request) -> dict | None:
    """Lấy user hiện tại (không bắt buộc login — trả None nếu chưa login)."""
    return request.session.get("sso_user")


class _redirect_to_login(HTTPException):
    """Custom exception để redirect về login."""
    def __init__(self, request: Request):
        self.login_url = _login_url(request)
        super().__init__(status_code=302)


def sso_exception_handler(request: Request, exc: _redirect_to_login):
    """Đăng ký handler này để redirect hoạt động."""
    return RedirectResponse(url=exc.login_url, status_code=302)
