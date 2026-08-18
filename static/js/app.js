/**
 * GIAO BAN HTV - Frontend SPA Logic
 * ===================================
 * Light/Dark Mode Toggle, Directives Filter (2 Days default, by Dept/Date),
 * Meetings CRUD (including Admin delete), Reports, Directives, Events
 */

// ===================== STATE =====================
let currentUser = null;
const ROLE_LABELS = {
    'Admin': 'Quản trị viên',
    'BanTGD': 'Ban Tổng Giám đốc',
    'BPT': 'Ban Phụ trách',
    'nhan_vien': 'Nhân viên'
};

// Filter state cho Chỉ đạo TGĐ
let heroDirectiveFilter = {
    mode: '2days', // '2days' (hôm nay + hôm qua), '7days', 'all', 'custom_date'
    date: '',
    department: ''
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    loadHeroDirectives();
    loadEvents();
    loadMeetings();
    bindEvents();
});

// ===================== THEME TOGGLE (LIGHT / DARK) =====================
function initTheme() {
    const savedTheme = localStorage.getItem('giaoban_theme') || 'light';
    applyTheme(savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
}

function applyTheme(theme) {
    const icon = document.getElementById('themeToggleIcon');
    const text = document.getElementById('themeToggleText');
    
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('giaoban_theme', 'dark');
        if (icon) icon.textContent = '☀️';
        if (text) text.textContent = 'Chế độ sáng';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('giaoban_theme', 'light');
        if (icon) icon.textContent = '🌙';
        if (text) text.textContent = 'Chế độ tối';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
}

// ===================== AUTH =====================
async function checkAuth() {
    try {
        const resp = await fetch('/api/me');
        const data = await resp.json();
        if (data.logged_in) {
            currentUser = data;
            showLoggedIn(data);
        } else {
            currentUser = null;
            showLoggedOut();
        }
    } catch (e) {
        currentUser = null;
        showLoggedOut();
    }
}

function showLoggedIn(user) {
    document.getElementById('authUnlogged').style.display = 'none';
    document.getElementById('authLogged').style.display = 'flex';
    document.getElementById('loggedUsername').textContent = user.full_name || user.username;
    
    const badge = document.getElementById('loggedUserRole');
    badge.textContent = ROLE_LABELS[user.role] || user.role;
    badge.className = 'user-role-badge ' + (user.role || '').toLowerCase();

    // Phân quyền hiển thị
    const isAdmin = user.role === 'Admin';
    const isVPD = isAdmin || user.role === 'BanTGD' || (user.role === 'BPT' && isVpdDept(user.department));

    document.getElementById('adminUserMgmtBtn').style.display = isAdmin ? '' : 'none';
    document.getElementById('addMeetingBtn').style.display = isVPD ? '' : 'none';
    document.getElementById('addEventBtn').style.display = isVPD ? '' : 'none';
    // Nút thêm chỉ đạo ngoài họp: BanTGD và Admin
    const canAddStandalone = isAdmin || user.role === 'BanTGD';
    document.getElementById('addStandaloneDirectiveBtn').style.display = canAddStandalone ? '' : 'none';

    // Tải lại biên bản để hiện các nút chức năng phù hợp
    loadMeetings();
}

function showLoggedOut() {
    document.getElementById('authUnlogged').style.display = 'flex';
    document.getElementById('authLogged').style.display = 'none';
    document.getElementById('adminUserMgmtBtn').style.display = 'none';
    document.getElementById('addMeetingBtn').style.display = 'none';
    document.getElementById('addEventBtn').style.display = 'none';
    document.getElementById('addStandaloneDirectiveBtn').style.display = 'none';
}

function isVpdDept(dept) {
    if (!dept) return false;
    const d = dept.toLowerCase();
    return ['văn phòng đài','van phong dai','vpd','vpđ','văn phòng'].some(k => d.includes(k));
}

function isVpdUser() {
    if (!currentUser) return false;
    return currentUser.role === 'Admin' || currentUser.role === 'BanTGD' || 
           (currentUser.role === 'BPT' && isVpdDept(currentUser.department));
}

function canEditReport(reportDept) {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (isVpdUser()) return true;
    if (currentUser.role === 'BPT' || currentUser.role === 'BanTGD') {
        const ud = (currentUser.department || '').toLowerCase();
        const rd = (reportDept || '').toLowerCase();
        return ud === rd || ud.includes(rd) || rd.includes(ud);
    }
    return false;
}

// ===================== EVENTS BINDING =====================
function bindEvents() {
    // Login & Logout
    document.getElementById('openLoginModalBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('ssoLoginBtn').addEventListener('click', () => { window.location.href = '/login-sso'; });
    document.getElementById('localLoginForm').addEventListener('submit', handleLocalLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Meetings
    document.getElementById('addMeetingBtn').addEventListener('click', () => openMeetingModal());
    document.getElementById('meetingFormSubmit').addEventListener('click', handleMeetingSubmit);

    // Reports
    document.getElementById('reportFormSubmit').addEventListener('click', handleReportSubmit);

    // Directives
    document.getElementById('directiveFormSubmit').addEventListener('click', handleDirectiveSubmit);

    // Events
    document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
    document.getElementById('eventFormSubmit').addEventListener('click', handleEventSubmit);

    // Standalone Directive (Chỉ đạo ngoài họp)
    document.getElementById('addStandaloneDirectiveBtn').addEventListener('click', () => openStandaloneDirectiveModal());
    document.getElementById('standaloneDirectiveFormSubmit').addEventListener('click', handleStandaloneDirectiveSubmit);

    // User Management
    document.getElementById('adminUserMgmtBtn').addEventListener('click', () => { openModal('userMgmtModal'); loadUsers(); });
    document.getElementById('addUserBtn').addEventListener('click', () => openModal('addUserModal'));
    document.getElementById('addUserSubmit').addEventListener('click', handleAddUser);

    // Filter cuộc họp giao ban
    document.getElementById('filterTodayBtn').addEventListener('click', () => filterMeetings('today'));
    document.getElementById('filterWeekBtn').addEventListener('click', () => filterMeetings('week'));
    document.getElementById('filterMonthBtn').addEventListener('click', () => filterMeetings('month'));
    document.getElementById('filterAllBtn').addEventListener('click', () => filterMeetings('all'));
    document.getElementById('filterDate').addEventListener('change', (e) => {
        if (e.target.value) filterMeetings('date', e.target.value);
    });

    // Filter Chỉ đạo TGĐ trên Hero Section
    document.getElementById('heroFilter2DaysBtn').addEventListener('click', () => setHeroDirectiveFilter('2days'));
    document.getElementById('heroFilter7DaysBtn').addEventListener('click', () => setHeroDirectiveFilter('7days'));
    document.getElementById('heroFilterAllDaysBtn').addEventListener('click', () => setHeroDirectiveFilter('all'));
    
    document.getElementById('heroFilterDate').addEventListener('change', (e) => {
        if (e.target.value) {
            setHeroDirectiveFilter('custom_date', e.target.value);
        }
    });

    document.getElementById('heroFilterDept').addEventListener('change', (e) => {
        heroDirectiveFilter.department = e.target.value;
        loadHeroDirectives();
    });

    document.getElementById('heroResetFilterBtn').addEventListener('click', resetHeroDirectiveFilter);

    // Đóng modals khi nhấp ra ngoài
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });
}

// ===================== AUTH HANDLERS =====================
async function handleLocalLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();
        if (!resp.ok) {
            showToast(data.detail || 'Đăng nhập thất bại', 'error');
            return;
        }
        closeModal('loginModal');
        showToast('Đăng nhập thành công!', 'success');
        checkAuth();
    } catch (e) {
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

function handleLogout() {
    if (currentUser) {
        window.location.href = '/logout';
    }
}

// ===================== HERO DIRECTIVES (CHỈ ĐẠO TGĐ) =====================
function setHeroDirectiveFilter(mode, dateVal = '') {
    heroDirectiveFilter.mode = mode;
    heroDirectiveFilter.date = dateVal;

    // Cập nhật trạng thái nút bấm
    const btn2Days = document.getElementById('heroFilter2DaysBtn');
    const btn7Days = document.getElementById('heroFilter7DaysBtn');
    const btnAllDays = document.getElementById('heroFilterAllDaysBtn');
    const dateInput = document.getElementById('heroFilterDate');

    btn2Days.className = mode === '2days' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';
    btn7Days.className = mode === '7days' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';
    btnAllDays.className = mode === 'all' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';

    if (mode !== 'custom_date') {
        dateInput.value = '';
    }

    loadHeroDirectives();
}

function resetHeroDirectiveFilter() {
    heroDirectiveFilter = {
        mode: '2days',
        date: '',
        department: ''
    };
    document.getElementById('heroFilterDept').value = '';
    document.getElementById('heroFilterDate').value = '';
    setHeroDirectiveFilter('2days');
}

async function loadHeroDirectives() {
    const listContainer = document.getElementById('heroDirectiveList');
    listContainer.innerHTML = `<li class="empty-state"><div class="loading-spinner">Đang tải dữ liệu chỉ đạo...</div></li>`;

    try {
        let url = '/api/directives?';
        const params = new URLSearchParams();

        if (heroDirectiveFilter.mode === '2days') {
            params.append('mode', 'default');
        } else if (heroDirectiveFilter.mode === '7days') {
            params.append('days', '7');
        } else if (heroDirectiveFilter.mode === 'all') {
            params.append('mode', 'all');
        } else if (heroDirectiveFilter.mode === 'custom_date' && heroDirectiveFilter.date) {
            params.append('start_date', heroDirectiveFilter.date);
            params.append('end_date', heroDirectiveFilter.date);
        }

        if (heroDirectiveFilter.department) {
            params.append('department', heroDirectiveFilter.department);
        }

        const resp = await fetch(url + params.toString());
        if (!resp.ok) {
            throw new Error(`Server returned status ${resp.status}`);
        }
        const directives = await resp.json();
        
        if (!Array.isArray(directives)) {
            console.warn('API returned non-array:', directives);
            renderHeroDirectives([]);
            return;
        }
        renderHeroDirectives(directives);
    } catch (e) {
        console.error('Error loading directives:', e);
        listContainer.innerHTML = `<li class="empty-state"><div class="icon">⚠️</div><p>Lỗi khi tải dữ liệu chỉ đạo. Vui lòng kiểm tra kết nối server.</p></li>`;
    }
}

function renderHeroDirectives(directives) {
    const listContainer = document.getElementById('heroDirectiveList');
    const badge = document.getElementById('directiveDateBadge');

    // Cập nhật text badge mô tả bộ lọc hiện tại
    if (heroDirectiveFilter.mode === '2days') {
        badge.textContent = 'Hôm nay & Hôm qua';
    } else if (heroDirectiveFilter.mode === '7days') {
        badge.textContent = '7 ngày gần nhất';
    } else if (heroDirectiveFilter.mode === 'all') {
        badge.textContent = 'Tất cả các ngày';
    } else if (heroDirectiveFilter.mode === 'custom_date' && heroDirectiveFilter.date) {
        badge.textContent = formatDbDateVi(heroDirectiveFilter.date);
    }

    if (heroDirectiveFilter.department) {
        badge.textContent += ` • ${heroDirectiveFilter.department}`;
    }

    if (!directives || directives.length === 0) {
        listContainer.innerHTML = `
        <li class="empty-state">
            <div class="icon">📋</div>
            <p>Không có chỉ đạo nào phù hợp với bộ lọc đã chọn</p>
        </li>`;
        return;
    }

    // Nhóm các chỉ đạo theo từng Ngày họp (MeetingDate)
    const grouped = {};
    directives.forEach(d => {
        const date = d.MeetingDate || 'Chưa xác định';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(d);
    });

    const sortedDates = Object.keys(grouped).sort().reverse();

    let html = '';
    sortedDates.forEach(dateStr => {
        const items = grouped[dateStr];
        html += `
        <div class="directive-date-group">
            <div class="directive-group-header">
                <span class="directive-group-date">
                    📅 ${formatDbDateVi(dateStr)}
                </span>
                <span class="directive-group-count">${items.length} chỉ đạo / kết luận</span>
            </div>
            <ul class="directive-list">`;

        items.forEach((d, i) => {
            const categoryLabel = d.Category === 'y_kien_tgd' ? 'Ý kiến Ban TGĐ' : 'Kết luận cuộc họp';
            const isStandalone = d.IsStandalone === 1 || d.MeetingID === null || d.MeetingID === undefined;
            const sourceLabel = isStandalone
                ? '<span class="directive-tag" style="background:var(--accent-purple-light);color:var(--accent-purple);font-size:0.7rem;">Chỉ đạo ngoài họp</span>'
                : '<span class="directive-tag" style="background:var(--accent-cyan-light);color:var(--accent-cyan);font-size:0.7rem;">Họp giao ban tuyên truyền hàng ngày</span>';
            const canEditStandalone = isStandalone && isVpdUser();

            html += `
            <li class="directive-item" style="animation-delay: ${i * 0.05}s">
                <div class="directive-bullet"></div>
                <div class="directive-content">
                    ${d.AssignedTo ? `<span class="assigned">Giao ${escapeHtml(d.AssignedTo)}</span>` : ''}
                    <span>${formatContent(d.Content)}</span>
                    <div class="directive-meta">
                        <span class="directive-tag" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-color);">${categoryLabel}</span>
                        ${sourceLabel}
                        ${d.Deadline ? `<span class="directive-tag" style="background: var(--accent-red-light); color: var(--accent-red); font-weight:600;">Hạn: ${formatDbDateVi(d.Deadline)}</span>` : ''}
                        ${d.Priority > 0 ? `<span class="directive-tag" style="background: var(--accent-amber-light); color: var(--accent-amber); font-weight:600;">${d.Priority >= 2 ? 'Khẩn cấp' : 'Quan trọng'}</span>` : ''}
                    </div>
                    ${canEditStandalone ? `
                    <div class="report-actions" style="margin-top:6px">
                        <button class="btn btn-xs btn-secondary" onclick="editStandaloneDirective(${d.DirectiveID})">✎ Sửa</button>
                        <button class="btn btn-xs btn-secondary" onclick="deleteStandaloneDirective(${d.DirectiveID})">✕ Xóa</button>
                    </div>` : ''}
                </div>
            </li>`;
        });

        html += `</ul></div>`;
    });

    listContainer.innerHTML = html;
}

// ===================== EVENTS =====================
async function loadEvents() {
    try {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 60);
        
        const startStr = toDbDate(today);
        const endStr = toDbDate(futureDate);
        
        const resp = await fetch(`/api/events?start_date=${startStr}&end_date=${endStr}`);
        const events = await resp.json();
        renderEvents(events);
    } catch (e) {
        console.error('Error loading events:', e);
    }
}

function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    
    if (!events || events.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p class="text-muted">Không có sự kiện nào sắp tới</p></div>`;
        return;
    }

    let html = '';
    events.forEach((ev, i) => {
        const d = parseDbDate(ev.EventDate);
        const day = d ? d.getDate() : '?';
        const month = d ? `Th ${d.getMonth() + 1}` : '';
        const typeClass = ev.EventType || 'tuan';
        const typeLabel = { tuan: 'Tuần', thang: 'Tháng', dac_biet: 'Đặc biệt' }[typeClass] || typeClass;

        let dateStr = formatDbDateVi(ev.EventDate);
        if (ev.EventEndDate && ev.EventEndDate !== ev.EventDate) {
            dateStr += ' → ' + formatDbDateVi(ev.EventEndDate);
        }

        html += `
        <div class="event-card" style="animation-delay: ${i * 0.05}s" data-event-id="${ev.EventID}">
            <div class="event-date-box">
                <span class="day">${day}</span>
                <span class="month">${month}</span>
            </div>
            <div class="event-info" style="flex:1">
                <h4>${escapeHtml(ev.Title)}</h4>
                <p>${dateStr}</p>
                ${ev.Description ? `<p style="margin-top:4px;font-size:0.78rem;color:var(--text-muted)">${escapeHtml(ev.Description)}</p>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                <span class="event-type-badge ${typeClass}">${typeLabel}</span>
                ${isVpdUser() ? `
                <button class="btn-icon btn-xs" onclick="editEventById(${ev.EventID})" title="Sửa sự kiện">✎</button>
                <button class="btn-icon btn-xs" onclick="deleteEvent(${ev.EventID})" title="Xóa sự kiện">✕</button>
                ` : ''}
            </div>
        </div>`;
    });

    grid.innerHTML = html;
}

async function editEventById(eventId) {
    try {
        // Lấy thông tin event từ danh sách hiện tại (trên DOM)
        const resp = await fetch(`/api/events?start_date=2020-01-01&end_date=2099-12-31`);
        const events = await resp.json();
        const ev = events.find(e => e.EventID === eventId);
        if (ev) openEventModal(ev);
        else showToast('Không tìm thấy sự kiện', 'error');
    } catch (e) { showToast('Lỗi tải sự kiện', 'error'); }
}

function openEventModal(event) {
    document.getElementById('eventModalTitle').textContent = event ? 'Sửa sự kiện' : 'Thêm sự kiện';
    document.getElementById('efEventId').value = event ? event.EventID : '';
    document.getElementById('efTitle').value = event ? event.Title : '';
    document.getElementById('efDate').value = event ? event.EventDate : '';
    document.getElementById('efEndDate').value = event ? (event.EventEndDate || '') : '';
    document.getElementById('efType').value = event ? event.EventType : 'tuan';
    document.getElementById('efDescription').value = event ? (event.Description || '') : '';
    openModal('eventModal');
}

async function handleEventSubmit() {
    const eventId = document.getElementById('efEventId').value;
    const data = {
        title: document.getElementById('efTitle').value.trim(),
        eventDate: document.getElementById('efDate').value,
        eventEndDate: document.getElementById('efEndDate').value || null,
        eventType: document.getElementById('efType').value,
        description: document.getElementById('efDescription').value.trim()
    };

    if (!data.title || !data.eventDate) {
        showToast('Vui lòng nhập tên sự kiện và ngày', 'warning');
        return;
    }

    try {
        const url = eventId ? `/api/events/${eventId}` : '/api/events';
        const method = eventId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('eventModal');
        loadEvents();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
        const resp = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadEvents();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ===================== MEETINGS =====================
let meetingsFilter = { type: 'all' };

function filterMeetings(type, dateValue) {
    meetingsFilter = { type, dateValue };
    ['filterTodayBtn','filterWeekBtn','filterMonthBtn','filterAllBtn'].forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    if (type !== 'date') {
        const btnMap = { today: 'filterTodayBtn', week: 'filterWeekBtn', month: 'filterMonthBtn', all: 'filterAllBtn' };
        if (btnMap[type]) document.getElementById(btnMap[type]).classList.add('active');
    }
    loadMeetings();
}

async function loadMeetings() {
    try {
        let params = '';
        const today = new Date();
        
        if (meetingsFilter.type === 'today') {
            const d = toDbDate(today);
            params = `?start_date=${d}&end_date=${d}`;
        } else if (meetingsFilter.type === 'week') {
            const mon = new Date(today);
            mon.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
            const sun = new Date(mon);
            sun.setDate(mon.getDate() + 6);
            params = `?start_date=${toDbDate(mon)}&end_date=${toDbDate(sun)}`;
        } else if (meetingsFilter.type === 'month') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            params = `?start_date=${toDbDate(start)}&end_date=${toDbDate(end)}`;
        } else if (meetingsFilter.type === 'date' && meetingsFilter.dateValue) {
            params = `?start_date=${meetingsFilter.dateValue}&end_date=${meetingsFilter.dateValue}`;
        }

        const resp = await fetch(`/api/meetings${params}`);
        const meetings = await resp.json();
        renderMeetings(meetings);
    } catch (e) {
        console.error('Error loading meetings:', e);
    }
}

function renderMeetings(meetings) {
    const container = document.getElementById('meetingsList');
    
    if (!meetings || meetings.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">📂</div><p>Chưa có cuộc họp nào</p></div>`;
        return;
    }

    let html = '';
    meetings.forEach((m, i) => {
        const dateStr = formatDbDateVi(m.MeetingDate);
        const statusClass = (m.Status || 'Draft').toLowerCase();
        const statusLabel = m.Status === 'Published' ? 'Đã công bố' : 'Bản nháp';

        html += `
        <div class="meeting-card" id="meeting-${m.MeetingID}" style="animation-delay: ${i * 0.05}s">
            <div class="meeting-header" onclick="toggleMeeting(${m.MeetingID})">
                <div class="meeting-header-left">
                    <span class="meeting-date-badge">${dateStr}</span>
                    <span class="meeting-title-text">Họp giao ban tuyên truyền hằng ngày</span>
                    <span class="meeting-status ${statusClass}">${statusLabel}</span>
                </div>
                <span class="meeting-toggle">▼</span>
            </div>
            <div class="meeting-body" id="meeting-body-${m.MeetingID}">
                <div class="loading-spinner mt-2">Đang tải chi tiết...</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

async function toggleMeeting(meetingId) {
    const card = document.getElementById(`meeting-${meetingId}`);
    const body = document.getElementById(`meeting-body-${meetingId}`);
    
    if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
        return;
    }
    
    card.classList.add('expanded');

    try {
        const [meetingResp, reportsResp, directivesResp] = await Promise.all([
            fetch(`/api/meetings/${meetingId}`),
            fetch(`/api/meetings/${meetingId}/reports`),
            fetch(`/api/meetings/${meetingId}/directives`)
        ]);
        const meeting = await meetingResp.json();
        const reports = await reportsResp.json();
        const directives = await directivesResp.json();

        body.innerHTML = renderMeetingDetail(meeting, reports, directives);
    } catch (e) {
        body.innerHTML = '<p class="text-muted mt-2">Lỗi tải chi tiết cuộc họp</p>';
    }
}

function renderMeetingDetail(meeting, reports, directives) {
    const canManage = isVpdUser();
    const m = meeting;

    // I. Thông tin cuộc họp
    let infoHtml = `
    <div class="meeting-info-grid">
        <div class="info-item"><span class="info-label">Thời gian</span><span class="info-value">${m.StartTime || '08:00'}${m.EndTime ? ' - ' + m.EndTime : ''}, ${formatDbDateVi(m.MeetingDate)}</span></div>
        <div class="info-item"><span class="info-label">Địa điểm</span><span class="info-value">${m.Location || '---'}</span></div>
        <div class="info-item"><span class="info-label">Chủ trì</span><span class="info-value">${m.Chairman || '---'}${m.ChairmanTitle ? ', ' + m.ChairmanTitle : ''}</span></div>
        <div class="info-item"><span class="info-label">Thư ký</span><span class="info-value">${m.Secretary || '---'}${m.SecretaryTitle ? ', ' + m.SecretaryTitle : ''}</span></div>
    </div>`;

    if (m.Attendees) {
        infoHtml += `<div class="info-item mb-4" style="background:var(--bg-card);padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);"><span class="info-label">Thành phần tham dự</span><span class="info-value" style="font-size:0.84rem;line-height:1.6">${escapeHtml(m.Attendees)}</span></div>`;
    }

    // II.1 Báo cáo nội dung
    const noiDungReports = reports.filter(r => r.Category === 'noi_dung');
    const dieuHanhReports = reports.filter(r => r.Category === 'dieu_hanh');

    let reportsHtml = '';
    
    // Nội dung & Tuyên truyền
    reportsHtml += `<div class="content-section-title"><span class="num">II.1</span> Công tác nội dung và tuyên truyền</div>`;
    if (noiDungReports.length > 0) {
        noiDungReports.forEach(r => {
            reportsHtml += renderReportItem(r, m.MeetingID);
        });
    } else {
        reportsHtml += `<p class="text-muted" style="padding:8px 16px;font-size:0.84rem">Chưa có báo cáo nào</p>`;
    }

    // II.2 Điều hành chung
    reportsHtml += `<div class="content-section-title mt-4"><span class="num">II.2</span> Báo cáo công tác điều hành chung</div>`;
    if (dieuHanhReports.length > 0) {
        dieuHanhReports.forEach(r => {
            reportsHtml += renderReportItem(r, m.MeetingID);
        });
    } else {
        reportsHtml += `<p class="text-muted" style="padding:8px 16px;font-size:0.84rem">Chưa có báo cáo nào</p>`;
    }

    // III. Ý kiến Ban TGĐ
    const yKienTgd = directives.filter(d => d.Category === 'y_kien_tgd');
    let yKienHtml = `<div class="content-section-title mt-4"><span class="num">III</span> Ý kiến của Ban Tổng Giám đốc</div>`;
    if (yKienTgd.length > 0) {
        yKienTgd.forEach(d => {
            yKienHtml += renderDirectiveItem(d, m.MeetingID);
        });
    } else {
        yKienHtml += `<p class="text-muted" style="padding:8px 16px;font-size:0.84rem">Chưa có ý kiến nào</p>`;
    }

    // IV. Kết luận cuộc họp
    const ketLuan = directives.filter(d => d.Category === 'ket_luan');
    let ketLuanHtml = `<div class="content-section-title mt-4"><span class="num">IV</span> Kết luận cuộc họp</div>`;
    if (ketLuan.length > 0) {
        ketLuan.forEach(d => {
            ketLuanHtml += renderDirectiveItem(d, m.MeetingID);
        });
    } else {
        ketLuanHtml += `<p class="text-muted" style="padding:8px 16px;font-size:0.84rem">Chưa có kết luận nào</p>`;
    }

    // Action buttons
    let actionsHtml = '';
    if (currentUser && currentUser.logged_in) {
        const canAddReport = currentUser.role === 'Admin' || currentUser.role === 'BPT' || currentUser.role === 'BanTGD';
        actionsHtml = `<div class="flex gap-2 mt-4" style="padding-top:12px;border-top:1px solid var(--border-color);flex-wrap:wrap;align-items:center;">`;
        if (canAddReport) {
            actionsHtml += `<button class="btn btn-sm btn-secondary" onclick="openReportModal(${m.MeetingID})">+ Thêm báo cáo</button>`;
        }
        if (canManage) {
            actionsHtml += `<button class="btn btn-sm btn-secondary" onclick="openDirectiveModal(${m.MeetingID})">+ Thêm chỉ đạo/kết luận</button>`;
            actionsHtml += `<button class="btn btn-sm btn-secondary" onclick="openMeetingModal(${m.MeetingID})">✎ Sửa thông tin họp</button>`;
            const pubBtn = m.Status === 'Published' 
                ? `<button class="btn btn-sm btn-ghost" onclick="updateMeetingStatus(${m.MeetingID}, 'Draft')">↩ Chuyển nháp</button>`
                : `<button class="btn btn-sm btn-primary" onclick="updateMeetingStatus(${m.MeetingID}, 'Published')">✓ Công bố</button>`;
            actionsHtml += pubBtn;
        }
        if (currentUser.role === 'Admin') {
            actionsHtml += `<button class="btn btn-sm btn-danger" onclick="deleteMeeting(${m.MeetingID}, '${m.MeetingDate}')" style="margin-left:auto;">🗑️ Xóa cuộc họp</button>`;
        }
        actionsHtml += `</div>`;
    }

    return `
        <div class="meeting-content-section">
            <div class="content-section-title"><span class="num">I</span> Thông tin cuộc họp</div>
            ${infoHtml}
        </div>
        <div class="meeting-content-section">
            ${reportsHtml}
        </div>
        <div class="meeting-content-section">
            ${yKienHtml}
        </div>
        <div class="meeting-content-section">
            ${ketLuanHtml}
        </div>
        ${actionsHtml}
    `;
}

function renderReportItem(r, meetingId) {
    const canEdit = canEditReport(r.Department);
    return `
    <div class="report-item">
        <div class="flex justify-between items-center">
            <span class="report-dept">${escapeHtml(r.Department)}</span>
            ${canEdit ? `
            <div class="report-actions">
                <button class="btn-icon btn-xs" onclick="editReport(${meetingId}, ${r.ReportID})" title="Sửa báo cáo">✎</button>
                <button class="btn-icon btn-xs" onclick="deleteReport(${meetingId}, ${r.ReportID})" title="Xóa báo cáo">✕</button>
            </div>` : ''}
        </div>
        <div class="report-content">${formatContent(r.Content)}</div>
        ${r.CreatedBy ? `<p style="font-size:0.72rem;color:var(--text-muted);margin-top:6px">Người nhập: ${escapeHtml(r.CreatedBy)}</p>` : ''}
    </div>`;
}

// BỎ hoàn toàn badge "Chưa thực hiện/Đã hoàn thành" và nút "✓ Hoàn thành"
function renderDirectiveItem(d, meetingId) {
    const canManage = isVpdUser();

    return `
    <div class="report-item">
        <div class="directive-content">
            ${d.AssignedTo ? `<span class="assigned">Giao ${escapeHtml(d.AssignedTo)}:</span>` : ''}
            <span>${formatContent(d.Content)}</span>
            <div class="directive-meta" style="margin-top:6px">
                ${d.Deadline ? `<span class="directive-tag" style="background:var(--accent-red-light);color:var(--accent-red);font-weight:600;">Hạn: ${formatDbDateVi(d.Deadline)}</span>` : ''}
                ${d.Priority > 0 ? `<span class="directive-tag" style="background:var(--accent-amber-light);color:var(--accent-amber);font-weight:600;">${d.Priority >= 2 ? 'Khẩn cấp' : 'Quan trọng'}</span>` : ''}
            </div>
        </div>
        ${canManage ? `
        <div class="report-actions" style="margin-top:8px">
            <button class="btn btn-xs btn-secondary" onclick="editDirective(${meetingId}, ${d.DirectiveID})">✎ Sửa</button>
            <button class="btn btn-xs btn-secondary" onclick="deleteDirective(${meetingId}, ${d.DirectiveID})">✕ Xóa</button>
        </div>` : ''}
    </div>`;
}

// ===================== MEETING CRUD =====================
async function openMeetingModal(meetingId) {
    document.getElementById('meetingFormId').value = '';
    document.getElementById('mfDate').value = '';
    document.getElementById('mfStartTime').value = '08:00';
    document.getElementById('mfChairman').value = '';
    document.getElementById('mfChairmanTitle').value = '';
    document.getElementById('mfSecretary').value = '';
    document.getElementById('mfSecretaryTitle').value = '';
    document.getElementById('mfLocation').value = 'Phòng họp Giao ban Đài Phát thanh và Truyền hình Thành phố';
    document.getElementById('mfAttendees').value = '';

    if (meetingId) {
        document.getElementById('meetingModalTitle').textContent = 'Sửa cuộc họp';
        try {
            const resp = await fetch(`/api/meetings/${meetingId}`);
            const m = await resp.json();
            document.getElementById('meetingFormId').value = m.MeetingID;
            document.getElementById('mfDate').value = m.MeetingDate || '';
            document.getElementById('mfStartTime').value = m.StartTime || '08:00';
            document.getElementById('mfChairman').value = m.Chairman || '';
            document.getElementById('mfChairmanTitle').value = m.ChairmanTitle || '';
            document.getElementById('mfSecretary').value = m.Secretary || '';
            document.getElementById('mfSecretaryTitle').value = m.SecretaryTitle || '';
            document.getElementById('mfLocation').value = m.Location || '';
            document.getElementById('mfAttendees').value = m.Attendees || '';
        } catch (e) { showToast('Lỗi tải thông tin', 'error'); }
    } else {
        document.getElementById('meetingModalTitle').textContent = 'Tạo cuộc họp mới';
        document.getElementById('mfDate').value = toDbDate(new Date());
    }

    openModal('meetingModal');
}

async function handleMeetingSubmit() {
    const meetingId = document.getElementById('meetingFormId').value;
    const data = {
        meetingDate: document.getElementById('mfDate').value,
        startTime: document.getElementById('mfStartTime').value,
        location: document.getElementById('mfLocation').value,
        chairman: document.getElementById('mfChairman').value.trim(),
        chairmanTitle: document.getElementById('mfChairmanTitle').value.trim(),
        secretary: document.getElementById('mfSecretary').value.trim(),
        secretaryTitle: document.getElementById('mfSecretaryTitle').value.trim(),
        attendees: document.getElementById('mfAttendees').value.trim()
    };

    if (!data.meetingDate) {
        showToast('Vui lòng chọn ngày họp', 'warning');
        return;
    }

    try {
        const url = meetingId ? `/api/meetings/${meetingId}` : '/api/meetings';
        const method = meetingId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('meetingModal');
        loadMeetings();
        loadHeroDirectives();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function updateMeetingStatus(meetingId, status) {
    try {
        const resp = await fetch(`/api/meetings/${meetingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(status === 'Published' ? 'Đã công bố biên bản!' : 'Đã chuyển về nháp', 'success');
        
        const card = document.getElementById(`meeting-${meetingId}`);
        if (card && card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            toggleMeeting(meetingId);
        }
        loadMeetings();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteMeeting(meetingId, meetingDate = '') {
    const dateDisplay = meetingDate ? `ngày ${formatDbDateVi(meetingDate)}` : `số #${meetingId}`;
    const confirmMsg = `Bạn có chắc chắn muốn XÓA CUỘC HỌP ${dateDisplay}?\n\nToàn bộ báo cáo của các Ban và các chỉ đạo/kết luận thuộc cuộc họp này sẽ bị xóa vĩnh viễn!`;
    
    if (!confirm(confirmMsg)) return;

    try {
        const resp = await fetch(`/api/meetings/${meetingId}`, {
            method: 'DELETE'
        });
        const result = await resp.json();
        if (!resp.ok) {
            showToast(result.detail || 'Lỗi khi xóa cuộc họp', 'error');
            return;
        }
        showToast(result.message || 'Đã xóa cuộc họp thành công!', 'success');
        loadMeetings();
        loadHeroDirectives();
    } catch (e) {
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

// ===================== REPORT CRUD =====================
function openReportModal(meetingId, report) {
    document.getElementById('rfMeetingId').value = meetingId;
    document.getElementById('rfReportId').value = report ? report.ReportID : '';
    document.getElementById('rfDepartment').value = report ? report.Department : (currentUser ? (currentUser.department || '') : '');
    document.getElementById('rfCategory').value = report ? report.Category : 'noi_dung';
    document.getElementById('rfContent').value = report ? report.Content : '';
    document.getElementById('reportModalTitle').textContent = report ? 'Sửa báo cáo' : 'Thêm báo cáo';
    openModal('reportModal');
}

async function editReport(meetingId, reportId) {
    try {
        const resp = await fetch(`/api/meetings/${meetingId}/reports`);
        const reports = await resp.json();
        const report = reports.find(r => r.ReportID === reportId);
        if (report) openReportModal(meetingId, report);
    } catch (e) { showToast('Lỗi tải báo cáo', 'error'); }
}

async function handleReportSubmit() {
    const meetingId = document.getElementById('rfMeetingId').value;
    const reportId = document.getElementById('rfReportId').value;
    const data = {
        department: document.getElementById('rfDepartment').value,
        category: document.getElementById('rfCategory').value,
        content: document.getElementById('rfContent').value.trim()
    };

    if (!data.department || !data.content) {
        showToast('Vui lòng chọn đơn vị và nhập nội dung', 'warning');
        return;
    }

    try {
        const url = reportId 
            ? `/api/meetings/${meetingId}/reports/${reportId}` 
            : `/api/meetings/${meetingId}/reports`;
        const method = reportId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('reportModal');
        
        const card = document.getElementById(`meeting-${meetingId}`);
        if (card && card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            toggleMeeting(meetingId);
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteReport(meetingId, reportId) {
    if (!confirm('Bạn có chắc muốn xóa báo cáo này?')) return;
    try {
        const resp = await fetch(`/api/meetings/${meetingId}/reports/${reportId}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        const card = document.getElementById(`meeting-${meetingId}`);
        if (card && card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            toggleMeeting(meetingId);
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ===================== DIRECTIVE CRUD =====================
function openDirectiveModal(meetingId, directive) {
    document.getElementById('dfMeetingId').value = meetingId;
    document.getElementById('dfDirectiveId').value = directive ? directive.DirectiveID : '';
    document.getElementById('dfCategory').value = directive ? directive.Category : 'ket_luan';
    document.getElementById('dfContent').value = directive ? directive.Content : '';
    
    // Gán giá trị đơn vị được giao cho dropdown
    const assignedSelect = document.getElementById('dfAssignedTo');
    const assignedVal = directive ? (directive.AssignedTo || '') : '';
    if (assignedVal) {
        let matched = false;
        for (let i = 0; i < assignedSelect.options.length; i++) {
            if (assignedSelect.options[i].value.toLowerCase() === assignedVal.toLowerCase() || 
                assignedSelect.options[i].text.toLowerCase() === assignedVal.toLowerCase()) {
                assignedSelect.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const opt = new Option(assignedVal, assignedVal);
            assignedSelect.add(opt);
            assignedSelect.value = assignedVal;
        }
    } else {
        assignedSelect.value = '';
    }

    document.getElementById('dfDeadline').value = directive ? (directive.Deadline || '') : '';
    document.getElementById('dfPriority').value = directive ? (directive.Priority || 0) : 0;
    document.getElementById('directiveModalTitle').textContent = directive ? 'Sửa chỉ đạo' : 'Thêm chỉ đạo / kết luận';
    openModal('directiveModal');
}

async function editDirective(meetingId, directiveId) {
    try {
        const resp = await fetch(`/api/meetings/${meetingId}/directives`);
        const directives = await resp.json();
        const directive = directives.find(d => d.DirectiveID === directiveId);
        if (directive) openDirectiveModal(meetingId, directive);
    } catch (e) { showToast('Lỗi tải chỉ đạo', 'error'); }
}

async function handleDirectiveSubmit() {
    const meetingId = document.getElementById('dfMeetingId').value;
    const directiveId = document.getElementById('dfDirectiveId').value;
    const data = {
        category: document.getElementById('dfCategory').value,
        content: document.getElementById('dfContent').value.trim(),
        assignedTo: document.getElementById('dfAssignedTo').value.trim() || null,
        deadline: document.getElementById('dfDeadline').value || null,
        priority: parseInt(document.getElementById('dfPriority').value) || 0
    };

    if (!data.content) {
        showToast('Vui lòng nhập nội dung chỉ đạo', 'warning');
        return;
    }

    try {
        const url = directiveId 
            ? `/api/meetings/${meetingId}/directives/${directiveId}` 
            : `/api/meetings/${meetingId}/directives`;
        const method = directiveId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('directiveModal');
        
        loadHeroDirectives();
        const card = document.getElementById(`meeting-${meetingId}`);
        if (card && card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            toggleMeeting(meetingId);
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteDirective(meetingId, directiveId) {
    if (!confirm('Bạn có chắc muốn xóa chỉ đạo này?')) return;
    try {
        const resp = await fetch(`/api/meetings/${meetingId}/directives/${directiveId}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadHeroDirectives();
        const card = document.getElementById(`meeting-${meetingId}`);
        if (card && card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            toggleMeeting(meetingId);
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ===================== STANDALONE DIRECTIVE CRUD =====================
function openStandaloneDirectiveModal(directive) {
    document.getElementById('sdDirectiveId').value = directive ? directive.DirectiveID : '';
    document.getElementById('sdCategory').value = directive ? directive.Category : 'y_kien_tgd';
    document.getElementById('sdContent').value = directive ? directive.Content : '';
    document.getElementById('sdDirectiveDate').value = directive ? (directive.DirectiveDate || toDbDate(new Date())) : toDbDate(new Date());
    document.getElementById('sdDeadline').value = directive ? (directive.Deadline || '') : '';
    document.getElementById('sdPriority').value = directive ? (directive.Priority || 0) : 0;
    
    // Giao cho
    const assignedSelect = document.getElementById('sdAssignedTo');
    const assignedVal = directive ? (directive.AssignedTo || '') : '';
    if (assignedVal) {
        let matched = false;
        for (let i = 0; i < assignedSelect.options.length; i++) {
            if (assignedSelect.options[i].value.toLowerCase() === assignedVal.toLowerCase()) {
                assignedSelect.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const opt = new Option(assignedVal, assignedVal);
            assignedSelect.add(opt);
            assignedSelect.value = assignedVal;
        }
    } else {
        assignedSelect.value = '';
    }

    document.getElementById('standaloneDirectiveModalTitle').textContent = directive ? 'Sửa chỉ đạo ngoài họp' : 'Thêm chỉ đạo ngoài họp';
    openModal('standaloneDirectiveModal');
}

async function editStandaloneDirective(directiveId) {
    // Lấy thông tin directive từ API directives hiện tại
    try {
        const resp = await fetch('/api/directives?mode=all');
        const directives = await resp.json();
        const d = directives.find(x => x.DirectiveID === directiveId && (x.IsStandalone === 1 || x.MeetingID === null || x.MeetingID === undefined));
        if (d) openStandaloneDirectiveModal(d);
        else showToast('Không tìm thấy chỉ đạo', 'error');
    } catch (e) { showToast('Lỗi tải chỉ đạo', 'error'); }
}

async function handleStandaloneDirectiveSubmit() {
    const directiveId = document.getElementById('sdDirectiveId').value;
    const data = {
        category: document.getElementById('sdCategory').value,
        content: document.getElementById('sdContent').value.trim(),
        assignedTo: document.getElementById('sdAssignedTo').value.trim() || null,
        directiveDate: document.getElementById('sdDirectiveDate').value,
        deadline: document.getElementById('sdDeadline').value || null,
        priority: parseInt(document.getElementById('sdPriority').value) || 0
    };

    if (!data.content) {
        showToast('Vui lòng nhập nội dung chỉ đạo', 'warning');
        return;
    }
    if (!data.directiveDate) {
        showToast('Vui lòng chọn ngày chỉ đạo', 'warning');
        return;
    }

    try {
        const url = directiveId ? `/api/directives/${directiveId}` : '/api/directives';
        const method = directiveId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('standaloneDirectiveModal');
        loadHeroDirectives();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteStandaloneDirective(directiveId) {
    if (!confirm('Bạn có chắc muốn xóa chỉ đạo này?')) return;
    try {
        const resp = await fetch(`/api/directives/${directiveId}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadHeroDirectives();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ===================== USER MANAGEMENT =====================
async function loadUsers() {
    const container = document.getElementById('userListContainer');
    try {
        const resp = await fetch('/api/users');
        if (!resp.ok) { container.innerHTML = '<p class="text-muted">Không có quyền truy cập</p>'; return; }
        const users = await resp.json();
        
        let html = `<table style="width:100%;border-collapse:collapse;font-size:0.84rem">
            <thead><tr style="border-bottom:1px solid var(--border-color)">
                <th style="padding:10px 8px;text-align:left;color:var(--text-muted)">Username</th>
                <th style="padding:10px 8px;text-align:left;color:var(--text-muted)">Vai trò</th>
                <th style="padding:10px 8px;text-align:left;color:var(--text-muted)">Đơn vị</th>
                <th style="padding:10px 8px;text-align:center;color:var(--text-muted)">Thao tác</th>
            </tr></thead><tbody>`;
        
        users.forEach(u => {
            html += `<tr style="border-bottom:1px solid var(--border-color)">
                <td style="padding:10px 8px;font-weight:600">${escapeHtml(u.Username)}</td>
                <td style="padding:10px 8px"><span class="user-role-badge ${(u.Role||'').toLowerCase()}" style="font-size:0.7rem">${ROLE_LABELS[u.Role] || u.Role}</span></td>
                <td style="padding:10px 8px;color:var(--text-secondary)">${escapeHtml(u.Department || '')}</td>
                <td style="padding:10px 8px;text-align:center">
                    <button class="btn-icon btn-xs" onclick="deleteUserAction('${u.Username}')" title="Xóa tài khoản">✕</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p class="text-muted">Lỗi tải danh sách</p>';
    }
}

async function handleAddUser() {
    const data = {
        username: document.getElementById('newUsername').value.trim(),
        password: document.getElementById('newPassword').value,
        role: document.getElementById('newRole').value,
        department: document.getElementById('newDepartment').value.trim()
    };
    if (!data.username || !data.password) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
        return;
    }
    try {
        const resp = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('addUserModal');
        loadUsers();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteUserAction(username) {
    if (!confirm(`Xóa tài khoản "${username}"?`)) return;
    try {
        const resp = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadUsers();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ===================== UTILITIES =====================
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatContent(str) {
    if (!str) return '';
    return escapeHtml(str).replace(/\n/g, '<br>');
}

function toDbDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseDbDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatDbDateVi(str) {
    if (!str) return '';
    const d = parseDbDate(str);
    if (!d) return str;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[d.getDay()];
    
    return `${dayName}, ${dd}/${mm}/${yyyy}`;
}
