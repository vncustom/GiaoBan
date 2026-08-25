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
const VAI_TRO_LABELS = {
    'BanTGD':     'Ban Tổng Giám đốc',
    'truong_ban': 'Trưởng đơn vị',
    'pho_ban':    'Phó đơn vị',
    'truong_phong':'Trưởng phòng',
    'Pho_phong':  'Phó phòng',
    'nhan_vien':  'Nhân viên',
    'Admin':      'Quản trị viên',
};

// Filter state cho Chỉ đạo TGĐ & Pagination
let heroDirectiveFilter = {
    mode: '2days', // '2days' (hôm nay + hôm qua), '7days', 'month', 'custom_date'
    date: '',
    department: ''
};
let heroDirectivePage = 1;
const HERO_DIRECTIVES_PER_PAGE = 2; // Mỗi page 2 ngày theo yêu cầu người dùng
let heroMonthDate = new Date(); // Tháng đang xem
let cachedHeroDirectives = [];

const DEPARTMENT_OPTIONS = [
    { value: '', label: '-- Toàn Đài / Chung cho các Ban --' },
    { value: 'Các Trưởng Ban', label: 'Các Trưởng Ban / Đơn vị' },
    { value: 'Ban Chương trình', label: 'Ban Chương trình' },
    { value: 'Trung tâm Tin tức', label: 'Trung tâm Tin tức' },
    { value: 'Trung tâm Phát thanh', label: 'Trung tâm Phát thanh' },
    { value: 'Trung tâm Phát triển nội dung số', label: 'TT Phát triển nội dung số' },
    { value: 'Ban Chuyên đề', label: 'Ban Chuyên đề' },
    { value: 'Ban Văn nghệ', label: 'Ban Văn nghệ' },
    { value: 'Ban Khoa giáo', label: 'Ban Khoa giáo' },
    { value: 'Ban Thể dục Thể thao', label: 'Ban Thể dục Thể thao' },
    { value: 'Hãng phim Truyền hình (TFS)', label: 'Hãng phim Truyền hình (TFS)' },
    { value: 'Trung tâm HTV Bình Dương', label: 'TT HTV Bình Dương' },
    { value: 'Trung tâm HTV Bà Rịa', label: 'TT HTV Bà Rịa' },
    { value: 'Văn phòng Hà Nội', label: 'Văn phòng Hà Nội' },
    { value: 'Văn phòng Đài', label: 'Văn phòng Đài' },
    { value: 'Ban Tổ chức - Đào tạo', label: 'Ban Tổ chức - Đào tạo' },
    { value: 'Ban Chiến lược', label: 'Ban Chiến lược' },
    { value: 'Ban Kế hoạch - Tài chính', label: 'Ban Kế hoạch - Tài chính' },
    { value: 'Ban Kỹ thuật công nghệ', label: 'Ban Kỹ thuật công nghệ' },
    { value: 'Ban Kỹ thuật cơ điện lạnh', label: 'Ban Kỹ thuật cơ điện lạnh' },
    { value: 'Trung tâm Sản xuất chương trình', label: 'TT Sản xuất chương trình' },
    { value: 'Trung tâm Truyền dẫn Phát sóng', label: 'TT Truyền dẫn Phát sóng' },
    { value: 'Trung tâm Phát hình - Tư liệu', label: 'TT Phát hình - Tư liệu' },
    { value: 'Trung tâm Dịch vụ truyền thông', label: 'TT Dịch vụ truyền thông' },
];

function buildDepartmentOptionsHtml(selectedVal = '') {
    return DEPARTMENT_OPTIONS.map(opt => {
        const isSel = (opt.value && opt.value.toLowerCase() === (selectedVal || '').toLowerCase()) ? 'selected' : '';
        return `<option value="${escapeHtml(opt.value)}" ${isSel}>${escapeHtml(opt.label)}</option>`;
    }).join('');
}

function buildCoopOptionsHtml(selectedVal = '') {
    const coopOpts = [{ value: '', label: '-- Không có đơn vị phối hợp --' }, ...DEPARTMENT_OPTIONS.slice(1)];
    return coopOpts.map(opt => {
        const isSel = (opt.value && opt.value.toLowerCase() === (selectedVal || '').toLowerCase()) ? 'selected' : '';
        return `<option value="${escapeHtml(opt.value)}" ${isSel}>${escapeHtml(opt.label)}</option>`;
    }).join('');
}

function addAssignedUnitRow(containerId, selectClass, selectedVal = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'assigned-unit-row';
    row.innerHTML = `
        <select class="form-select ${selectClass}">
            ${buildDepartmentOptionsHtml(selectedVal)}
        </select>
        <button type="button" class="btn-remove-unit" title="Xóa đơn vị này" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
}

function addCoopUnitRow(containerId, selectClass, selectedVal = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'assigned-unit-row coop-row';
    row.innerHTML = `
        <select class="form-select ${selectClass}" style="border-color: #c4b5fd;">
            ${buildCoopOptionsHtml(selectedVal)}
        </select>
        <button type="button" class="btn-remove-unit" title="Xóa đơn vị phối hợp" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
}

// Comment filter state
let commentFilter = '';

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    loadActiveBanners();
    updateHeroMonthLabel();
    loadHeroDirectives();
    loadPropagandaPlans(true);
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
    currentUser = user;
    document.getElementById('authUnlogged').style.display = 'none';
    document.getElementById('authLogged').style.display = 'flex';
    document.getElementById('loggedUsername').textContent = user.full_name || user.username;
    
    // Phân quyền hiển thị
    const isAdmin  = isAdminUser();
    const isVPD    = isVpdUser();
    const canStandalone = isAdmin || isBanTgdUser() || isVPD;
    const vt = (user.vai_tro || '').toLowerCase();
    const isBPT = ['truong_ban','pho_ban','truong_phong','pho_phong'].includes(vt) || user.role === 'BPT';
    const canManageBanner = isAdmin || isBanTgdUser() || isBPT;

    const badge = document.getElementById('loggedUserRole');
    let displayLabel = 'Nhân viên';
    if (isAdmin) {
        displayLabel = 'Quản trị viên';
    } else {
        displayLabel = ROLE_LABELS[user.role] || VAI_TRO_LABELS[user.vai_tro] || user.vai_tro || user.role || 'Nhân viên';
    }
    const badgeKey = isAdmin ? 'admin' : (user.vai_tro || user.role || '').toLowerCase().replace(/_/g, '-');
    badge.textContent = displayLabel;
    badge.className = 'user-role-badge ' + badgeKey;

    document.getElementById('adminUserMgmtBtn').style.display = isAdmin ? '' : 'none';
    document.getElementById('addMeetingBtn').style.display = isVPD ? '' : 'none';
    const addMeetingDirectiveBtn = document.getElementById('addMeetingDirectiveBtn');
    if (addMeetingDirectiveBtn) addMeetingDirectiveBtn.style.display = canStandalone ? '' : 'none';
    document.getElementById('addEventBtn').style.display = isVPD ? '' : 'none';
    document.getElementById('addPropagandaBtn').style.display = isVPD ? '' : 'none';
    document.getElementById('addStandaloneDirectiveBtn').style.display = canStandalone ? '' : 'none';

    // Nút tạo Banner (chỉ Trưởng ban / BPT / Ban TGĐ / Admin)
    const bannerCreateBtn = document.getElementById('bannerCreateBtn');
    if (bannerCreateBtn) bannerCreateBtn.style.display = canManageBanner ? '' : 'none';
    const bannerListCreateBtn = document.getElementById('bannerListCreateBtn');
    if (bannerListCreateBtn) bannerListCreateBtn.style.display = canManageBanner ? '' : 'none';

    // Tải lại biên bản để hiện các nút chức năng phù hợp
    loadMeetings();
}

function showLoggedOut() {
    currentUser = null;
    document.getElementById('authUnlogged').style.display = 'flex';
    document.getElementById('authLogged').style.display = 'none';
    document.getElementById('adminUserMgmtBtn').style.display = 'none';
    document.getElementById('addMeetingBtn').style.display = 'none';
    const addMeetingDirectiveBtn = document.getElementById('addMeetingDirectiveBtn');
    if (addMeetingDirectiveBtn) addMeetingDirectiveBtn.style.display = 'none';
    document.getElementById('addEventBtn').style.display = 'none';
    document.getElementById('addPropagandaBtn').style.display = 'none';
    document.getElementById('addStandaloneDirectiveBtn').style.display = 'none';

    const bannerCreateBtn = document.getElementById('bannerCreateBtn');
    if (bannerCreateBtn) bannerCreateBtn.style.display = 'none';
    const bannerListCreateBtn = document.getElementById('bannerListCreateBtn');
    if (bannerListCreateBtn) bannerListCreateBtn.style.display = 'none';
}

function isAdminUser() {
    if (!currentUser) return false;
    const un = (currentUser.username || '').toLowerCase();
    if (un === 'admin') return true;
    if ((currentUser.sso_role || '').toLowerCase() === 'admin') return true;
    if ((currentUser.role || '').toLowerCase() === 'admin') return true;
    if ((currentUser.vai_tro || '').toLowerCase() === 'admin') return true;
    return false;
}

function isBanTgdUser() {
    if (!currentUser) return false;
    const vt = (currentUser.vai_tro || '').toLowerCase();
    const role = (currentUser.role || '').toLowerCase();
    const un = (currentUser.username || '').toLowerCase();
    return vt.includes('tgd') || vt === 'bantgd' || role.includes('tgd') || role === 'bantgd' || un.includes('tgd') || un.includes('caoanhminh') || un.includes('diepbuuchi');
}

function isVpdDept(dept) {
    if (!dept) return false;
    const d = dept.toLowerCase();
    return ['văn phòng đài','van phong dai','vpd','vpđ','văn phòng'].some(k => d.includes(k));
}

function isVpdUser() {
    if (!currentUser) return false;
    const vt = (currentUser.vai_tro || '').toLowerCase();
    const role = (currentUser.role || '');
    const dept = currentUser.department || '';
    // Admin
    if (role === 'Admin' || (currentUser.sso_role || '').toLowerCase() === 'admin') return true;
    // BanTGD
    if (currentUser.vai_tro === 'BanTGD' || role === 'BanTGD') return true;
    // BPT của Văn Phòng Đài
    const isBPT = ['truong_ban','pho_ban','truong_phong','pho_phong'].includes(vt) || role === 'BPT';
    return isBPT && isVpdDept(dept);
}

function canEditReport(reportDept, createdBy) {
    if (!currentUser) return false;
    if (isAdminUser()) return true;
    if (isVpdUser()) return true;
    const un = (currentUser.username || '').toLowerCase();
    if (createdBy && un === (createdBy || '').toLowerCase()) return true;
    // BPT của bất kỳ ban nào có thể sửa báo cáo của ban mình
    const vt = (currentUser.vai_tro || '').toLowerCase();
    const role = (currentUser.role || '');
    const isBPT = ['truong_ban','pho_ban','truong_phong','pho_phong'].includes(vt)
               || role === 'BPT' || currentUser.vai_tro === 'BanTGD' || role === 'BanTGD';
    if (isBPT && reportDept && reportDept.toLowerCase() !== 'không đơn vị') {
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
    const dfAddDeptBtn = document.getElementById('dfAddDeptBtn');
    if (dfAddDeptBtn) dfAddDeptBtn.addEventListener('click', () => addAssignedUnitRow('dfAssignedList', 'df-assigned-select'));
    const dfAddCoopBtn = document.getElementById('dfAddCoopBtn');
    if (dfAddCoopBtn) dfAddCoopBtn.addEventListener('click', () => addCoopUnitRow('dfCoopList', 'df-coop-select'));
    const sdAddCoopBtn = document.getElementById('sdAddCoopBtn');
    if (sdAddCoopBtn) sdAddCoopBtn.addEventListener('click', () => addCoopUnitRow('sdCoopList', 'sd-coop-select'));

    // Events
    document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
    document.getElementById('eventFormSubmit').addEventListener('click', handleEventSubmit);

    // Propaganda Plans (Kế hoạch tuyên truyền)
    const addPpBtn = document.getElementById('addPropagandaBtn');
    if (addPpBtn) addPpBtn.addEventListener('click', () => openPropagandaModal());
    
    const ppSubmit = document.getElementById('propagandaFormSubmit');
    if (ppSubmit) ppSubmit.addEventListener('click', handlePropagandaSubmit);

    const prevMonthBtn = document.getElementById('ppPrevMonthBtn');
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', prevPropagandaMonth);

    const nextMonthBtn = document.getElementById('ppNextMonthBtn');
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', nextPropagandaMonth);

    const ppTodayBtn = document.getElementById('ppTodayBtn');
    if (ppTodayBtn) ppTodayBtn.addEventListener('click', goToPropagandaToday);

    const ppTimelineBtn = document.getElementById('ppViewTimelineBtn');
    if (ppTimelineBtn) ppTimelineBtn.addEventListener('click', () => setPropagandaViewMode('timeline'));

    const ppGridBtn = document.getElementById('ppViewGridBtn');
    if (ppGridBtn) ppGridBtn.addEventListener('click', () => setPropagandaViewMode('grid'));

    const expPpBtn = document.getElementById('exportPropagandaBtn');
    if (expPpBtn) expPpBtn.addEventListener('click', handleExportPropaganda);

    const ppMonthSelect = document.getElementById('ppMonthSelect');
    const ppYearInput = document.getElementById('ppYearInput');
    if (ppMonthSelect) ppMonthSelect.addEventListener('change', onMonthModeSelectChange);
    if (ppYearInput) ppYearInput.addEventListener('input', onMonthModeSelectChange);

    // Nút Thêm chỉ đạo tại mục Biên bản họp giao ban
    const addMeetingDirBtn = document.getElementById('addMeetingDirectiveBtn');
    if (addMeetingDirBtn) {
        addMeetingDirBtn.addEventListener('click', () => {
            if (cachedMeetings && cachedMeetings.length > 0) {
                openDirectiveModal(cachedMeetings[0].MeetingID);
            } else {
                openStandaloneDirectiveModal();
            }
        });
    }

    // Standalone Directive (Chỉ đạo ngoài họp)
    const addStandDirBtn = document.getElementById('addStandaloneDirectiveBtn');
    if (addStandDirBtn) addStandDirBtn.addEventListener('click', () => openStandaloneDirectiveModal());
    document.getElementById('standaloneDirectiveFormSubmit').addEventListener('click', handleStandaloneDirectiveSubmit);
    const sdAddDeptBtn = document.getElementById('sdAddDeptBtn');
    if (sdAddDeptBtn) sdAddDeptBtn.addEventListener('click', () => addAssignedUnitRow('sdAssignedList', 'sd-assigned-select'));

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
    
    const heroMonthPrevBtn = document.getElementById('heroMonthPrevBtn');
    if (heroMonthPrevBtn) heroMonthPrevBtn.addEventListener('click', prevHeroMonth);
    const heroMonthNextBtn = document.getElementById('heroMonthNextBtn');
    if (heroMonthNextBtn) heroMonthNextBtn.addEventListener('click', nextHeroMonth);
    const heroFilterMonthBtn = document.getElementById('heroFilterMonthBtn');
    if (heroFilterMonthBtn) heroFilterMonthBtn.addEventListener('click', () => setHeroDirectiveFilter('month'));
    
    document.getElementById('heroFilterDate').addEventListener('change', (e) => {
        if (e.target.value) {
            setHeroDirectiveFilter('custom_date', e.target.value);
        }
    });

    document.getElementById('heroFilterDept').addEventListener('change', (e) => {
        heroDirectiveFilter.department = e.target.value;
        heroDirectivePage = 1;
        loadHeroDirectives();
    });

    document.getElementById('heroResetFilterBtn').addEventListener('click', resetHeroDirectiveFilter);

    // Banner (Ticker) Events
    const bannerCreateBtn = document.getElementById('bannerCreateBtn');
    if (bannerCreateBtn) bannerCreateBtn.addEventListener('click', () => openBannerCreateModal());
    const bannerListBtn = document.getElementById('bannerListBtn');
    if (bannerListBtn) bannerListBtn.addEventListener('click', () => openBannerListModal());
    const tickerMarqueeWrapper = document.getElementById('tickerMarqueeWrapper');
    if (tickerMarqueeWrapper) {
        tickerMarqueeWrapper.addEventListener('click', (e) => {
            const item = e.target.closest('.ticker-item');
            if (item && item.dataset.id) {
                openBannerDetail(parseInt(item.dataset.id));
            } else if (activeBanners && activeBanners.length > 0) {
                openBannerDetail(activeBanners[0].BannerID);
            }
        });
    }

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
function updateHeroMonthLabel() {
    const el = document.getElementById('heroMonthLabel');
    if (el) {
        const mm = heroMonthDate.getMonth() + 1;
        const yyyy = heroMonthDate.getFullYear();
        el.textContent = `Tháng ${mm}/${yyyy}`;
    }
}

function prevHeroMonth() {
    heroMonthDate.setMonth(heroMonthDate.getMonth() - 1);
    updateHeroMonthLabel();
    setHeroDirectiveFilter('month');
}

function nextHeroMonth() {
    heroMonthDate.setMonth(heroMonthDate.getMonth() + 1);
    updateHeroMonthLabel();
    setHeroDirectiveFilter('month');
}

function setHeroDirectiveFilter(mode, dateVal = '') {
    heroDirectiveFilter.mode = mode;
    heroDirectiveFilter.date = dateVal;
    heroDirectivePage = 1; // Reset trang về 1 khi đổi bộ lọc

    // Cập nhật trạng thái nút bấm
    const btn2Days = document.getElementById('heroFilter2DaysBtn');
    const btn7Days = document.getElementById('heroFilter7DaysBtn');
    const monthSelector = document.getElementById('heroMonthSelector');
    const btnMonth = document.getElementById('heroFilterMonthBtn');
    const dateInput = document.getElementById('heroFilterDate');

    if (btn2Days) btn2Days.className = mode === '2days' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';
    if (btn7Days) btn7Days.className = mode === '7days' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';
    if (monthSelector) {
        if (mode === 'month') {
            monthSelector.classList.add('active');
            if (btnMonth) btnMonth.className = 'month-label-btn active';
        } else {
            monthSelector.classList.remove('active');
            if (btnMonth) btnMonth.className = 'month-label-btn';
        }
    }

    if (mode !== 'custom_date' && dateInput) {
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
    heroDirectivePage = 1;
    document.getElementById('heroFilterDept').value = '';
    document.getElementById('heroFilterDate').value = '';
    heroMonthDate = new Date();
    updateHeroMonthLabel();
    setHeroDirectiveFilter('2days');
}

async function loadHeroDirectives() {
    const listContainer = document.getElementById('heroDirectiveList');
    const paginationContainer = document.getElementById('heroDirectivePagination');
    if (paginationContainer) paginationContainer.style.display = 'none';

    listContainer.innerHTML = `<li class="empty-state"><div class="loading-spinner">Đang tải dữ liệu chỉ đạo...</div></li>`;

    try {
        let url = '/api/directives?';
        const params = new URLSearchParams();

        if (heroDirectiveFilter.mode === '2days') {
            params.append('mode', 'default');
        } else if (heroDirectiveFilter.mode === '7days') {
            params.append('days', '7');
        } else if (heroDirectiveFilter.mode === 'month') {
            const y = heroMonthDate.getFullYear();
            const m = heroMonthDate.getMonth();
            const startDate = toDbDate(new Date(y, m, 1));
            const endDate = toDbDate(new Date(y, m + 1, 0));
            params.append('start_date', startDate);
            params.append('end_date', endDate);
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
            cachedHeroDirectives = [];
            renderHeroDirectives([]);
            return;
        }
        cachedHeroDirectives = directives;
        renderHeroDirectives(directives);
    } catch (e) {
        console.error('Error loading directives:', e);
        listContainer.innerHTML = `<li class="empty-state"><div class="icon">⚠️</div><p>Lỗi khi tải dữ liệu chỉ đạo. Vui lòng kiểm tra kết nối server.</p></li>`;
    }
}

function changeHeroDirectivePage(page) {
    heroDirectivePage = page;
    renderHeroDirectives(cachedHeroDirectives);
    const heroSection = document.getElementById('heroDirectives');
    if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderDirectivePagination(totalPages, totalDates, totalItems) {
    const container = document.getElementById('heroDirectivePagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';

    const startItem = (heroDirectivePage - 1) * HERO_DIRECTIVES_PER_PAGE + 1;
    const endItem = Math.min(heroDirectivePage * HERO_DIRECTIVES_PER_PAGE, totalDates);

    let pagesHtml = '';
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= heroDirectivePage - 1 && p <= heroDirectivePage + 1)) {
            pagesHtml += `<button type="button" class="pagination-page ${p === heroDirectivePage ? 'active' : ''}" onclick="changeHeroDirectivePage(${p})">${p}</button>`;
        } else if (p === heroDirectivePage - 2 || p === heroDirectivePage + 2) {
            pagesHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    container.innerHTML = `
        <div class="pagination-info">
            Hiển thị ngày <strong>${startItem} - ${endItem}</strong> trong tổng số <strong>${totalDates} ngày</strong> (${totalItems} chỉ đạo / kết luận)
        </div>
        <div class="pagination-controls">
            <button type="button" class="pagination-btn" ${heroDirectivePage <= 1 ? 'disabled' : ''} onclick="changeHeroDirectivePage(${heroDirectivePage - 1})">
                ◀ Trước
            </button>
            <div class="pagination-pages">
                ${pagesHtml}
            </div>
            <button type="button" class="pagination-btn" ${heroDirectivePage >= totalPages ? 'disabled' : ''} onclick="changeHeroDirectivePage(${heroDirectivePage + 1})">
                Sau ▶
            </button>
        </div>
    `;
}

function renderDirectiveBadges(assignedTo, cooperatingUnit) {
    let badges = '';
    
    // Giao cho các đơn vị (Màu cam)
    if (assignedTo && assignedTo.trim()) {
        const units = assignedTo.split(',').map(u => u.trim()).filter(Boolean);
        units.forEach(u => {
            badges += `<span class="assigned-unit-badge">🏢 Giao: ${escapeHtml(u)}</span>`;
        });
    }
    
    // Đơn vị phối hợp (Màu tím)
    if (cooperatingUnit && cooperatingUnit.trim()) {
        const coops = cooperatingUnit.split(',').map(u => u.trim()).filter(Boolean);
        coops.forEach(c => {
            badges += `<span class="coop-unit-badge">🤝 Phối hợp: ${escapeHtml(c)}</span>`;
        });
    }
    
    if (!badges) return '';
    return `<div class="directive-badges-line">${badges}</div>`;
}

function renderHeroDirectives(directives) {
    const listContainer = document.getElementById('heroDirectiveList');
    const badge = document.getElementById('directiveDateBadge');
    const paginationContainer = document.getElementById('heroDirectivePagination');

    // Cập nhật text badge mô tả bộ lọc hiện tại
    if (heroDirectiveFilter.mode === '2days') {
        badge.textContent = 'Hôm nay & Hôm qua';
    } else if (heroDirectiveFilter.mode === '7days') {
        badge.textContent = '7 ngày gần nhất';
    } else if (heroDirectiveFilter.mode === 'month') {
        badge.textContent = `Tháng ${heroMonthDate.getMonth() + 1}/${heroMonthDate.getFullYear()}`;
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
        if (paginationContainer) paginationContainer.style.display = 'none';
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
    const totalDates = sortedDates.length;
    const totalPages = Math.ceil(totalDates / HERO_DIRECTIVES_PER_PAGE);

    if (heroDirectivePage > totalPages) {
        heroDirectivePage = Math.max(1, totalPages);
    }


    // Phân trang danh sách các ngày
    const startIndex = (heroDirectivePage - 1) * HERO_DIRECTIVES_PER_PAGE;
    const endIndex = Math.min(startIndex + HERO_DIRECTIVES_PER_PAGE, totalDates);
    const pagedDates = sortedDates.slice(startIndex, endIndex);

    let html = '';
    pagedDates.forEach(dateStr => {
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
                : '<span class="directive-tag" style="background:var(--accent-cyan-light);color:var(--accent-cyan);font-size:0.7rem;">Họp giao ban tuyên truyền hằng ngày</span>';
            const canEditStandalone = isStandalone && isVpdUser();
            const badgesHtml = renderDirectiveBadges(d.AssignedTo, d.CooperatingUnit);

            html += `
            <li class="directive-item" style="animation-delay: ${i * 0.05}s">
                <div class="directive-bullet"></div>
                <div class="directive-content">
                    ${badgesHtml}
                    <div>${formatContent(d.Content)}</div>
                    <div class="directive-meta" style="margin-top:6px;">
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
    renderDirectivePagination(totalPages, totalDates, directives.length);
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
            reportsHtml += renderReportItem(r, m.MeetingID, m.Status);
        });
    } else {
        reportsHtml += `<p class="text-muted" style="padding:8px 16px;font-size:0.84rem">Chưa có báo cáo nào</p>`;
    }

    // II.2 Điều hành chung
    reportsHtml += `<div class="content-section-title mt-4"><span class="num">II.2</span> Báo cáo công tác điều hành chung</div>`;
    if (dieuHanhReports.length > 0) {
        dieuHanhReports.forEach(r => {
            reportsHtml += renderReportItem(r, m.MeetingID, m.Status);
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
        const vt = (currentUser.vai_tro || '').toLowerCase();
        const role = (currentUser.role || '');
        // BPT của bất kỳ ban nào được thêm báo cáo (nếu chưa Published)
        const isBPT = ['truong_ban','pho_ban','truong_phong','pho_phong'].includes(vt)
                   || role === 'BPT' || role === 'BanTGD' || currentUser.vai_tro === 'BanTGD';
        const canAddReport = isAdminUser() || isBPT;
        const isPublished  = m.Status === 'Published';
        // Sau khi công bố chỉ VPD/Admin mới được thêm
        const canAddNow = canAddReport && (!isPublished || isVpdUser() || isAdminUser());

        actionsHtml = `<div class="flex gap-2 mt-4" style="padding-top:12px;border-top:1px solid var(--border-color);flex-wrap:wrap;align-items:center;">`;
        if (canAddNow) {
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
        if (isAdminUser()) {
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

function renderReportItem(r, meetingId, meetingStatus) {
    const canEdit = canEditReport(r.Department, r.CreatedBy);
    // Ẩn nút sửa/xóa nếu cuộc họp đã Published và user không phải VPD/Admin
    const isPublished = meetingStatus === 'Published';
    const canEditNow = canEdit && (!isPublished || isVpdUser() || isAdminUser());

    // Không hiển thị tiêu đề nếu Department là "Không đơn vị" hoặc rỗng
    const hasDept = r.Department && r.Department.trim() && r.Department.trim().toLowerCase() !== 'không đơn vị';
    const deptHtml = hasDept ? `<span class="report-dept">${escapeHtml(r.Department)}</span>` : `<span></span>`;

    return `
    <div class="report-item">
        <div class="flex justify-between items-center" style="${!hasDept ? 'margin-bottom: 4px;' : ''}">
            ${deptHtml}
            ${canEditNow ? `
            <div class="report-actions">
                <button class="btn-icon btn-xs" onclick="editReport(${meetingId}, ${r.ReportID})" title="Sửa báo cáo">✎</button>
                <button class="btn-icon btn-xs" onclick="deleteReport(${meetingId}, ${r.ReportID})" title="Xóa báo cáo">✕</button>
            </div>` : (isPublished && canEdit ? `<span style="font-size:0.7rem;color:var(--text-muted);">🔒 Đã công bố</span>` : '')}
        </div>
        <div class="report-content">${formatContent(r.Content)}</div>
        ${r.CreatedBy ? `<p style="font-size:0.72rem;color:var(--text-muted);margin-top:6px">Người nhập: ${escapeHtml(r.CreatedBy)}</p>` : ''}
    </div>`;
}

// BỎ hoàn toàn badge "Chưa thực hiện/Đã hoàn thành" và nút "✓ Hoàn thành"
function renderDirectiveItem(d, meetingId) {
    const canManage = isVpdUser();
    const badgesHtml = renderDirectiveBadges(d.AssignedTo, d.CooperatingUnit);

    return `
    <div class="report-item">
        <div class="directive-content">
            ${badgesHtml}
            <div>${formatContent(d.Content)}</div>
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
    if (!meetingId && (!directive || !directive.MeetingID)) {
        openStandaloneDirectiveModal(directive);
        return;
    }
    const mId = meetingId || (directive ? directive.MeetingID : '');
    document.getElementById('dfMeetingId').value = mId;
    document.getElementById('dfDirectiveId').value = directive ? directive.DirectiveID : '';
    document.getElementById('dfCategory').value = directive ? directive.Category : 'ket_luan';
    document.getElementById('dfContent').value = directive ? directive.Content : '';
    
    // Gán danh sách đơn vị được giao (hỗ trợ nhiều đơn vị cách nhau bởi dấu phẩy)
    const listContainer = document.getElementById('dfAssignedList');
    if (listContainer) {
        listContainer.innerHTML = '';
        const rawAssigned = directive ? (directive.AssignedTo || '') : '';
        if (rawAssigned) {
            const units = rawAssigned.split(',').map(u => u.trim()).filter(Boolean);
            if (units.length > 0) {
                units.forEach(u => addAssignedUnitRow('dfAssignedList', 'df-assigned-select', u));
            } else {
                addAssignedUnitRow('dfAssignedList', 'df-assigned-select', '');
            }
        } else {
            addAssignedUnitRow('dfAssignedList', 'df-assigned-select', '');
        }
    }

    // Gán đơn vị phối hợp (hỗ trợ nhiều đơn vị cách nhau bởi dấu phẩy)
    const coopContainer = document.getElementById('dfCoopList');
    if (coopContainer) {
        coopContainer.innerHTML = '';
        const rawCoop = directive ? (directive.CooperatingUnit || '') : '';
        if (rawCoop) {
            const units = rawCoop.split(',').map(u => u.trim()).filter(Boolean);
            if (units.length > 0) {
                units.forEach(u => addCoopUnitRow('dfCoopList', 'df-coop-select', u));
            } else {
                addCoopUnitRow('dfCoopList', 'df-coop-select', '');
            }
        } else {
            addCoopUnitRow('dfCoopList', 'df-coop-select', '');
        }
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
    const category = document.getElementById('dfCategory').value;
    const content = document.getElementById('dfContent').value.trim();
    const deadline = document.getElementById('dfDeadline').value || null;
    const priority = parseInt(document.getElementById('dfPriority').value) || 0;

    if (!content) {
        showToast('Vui lòng nhập nội dung chỉ đạo', 'warning');
        return;
    }

    // Thu thập danh sách các đơn vị được chọn
    const assignedSelects = document.querySelectorAll('#dfAssignedList .df-assigned-select');
    const assignedUnits = [];
    assignedSelects.forEach(s => {
        const val = s.value.trim();
        if (val && !assignedUnits.includes(val)) {
            assignedUnits.push(val);
        }
    });
    const assignedTo = assignedUnits.length > 0 ? assignedUnits.join(', ') : null;

    // Thu thập tất cả các đơn vị phối hợp đã chọn
    const coopSelects = document.querySelectorAll('#dfCoopList .df-coop-select');
    const coopUnits = [];
    coopSelects.forEach(s => {
        const val = s.value.trim();
        if (val && !coopUnits.includes(val)) {
            coopUnits.push(val);
        }
    });
    const cooperatingUnit = coopUnits.length > 0 ? coopUnits.join(', ') : null;

    try {
        const data = {
            category,
            content,
            assignedTo,
            cooperatingUnit,
            deadline,
            priority
        };

        if (directiveId) {
            const resp = await fetch(`/api/meetings/${meetingId}/directives/${directiveId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (!resp.ok) { showToast(result.detail || 'Lỗi cập nhật', 'error'); return; }
            showToast(result.message || 'Cập nhật chỉ đạo thành công!', 'success');
        } else {
            const resp = await fetch(`/api/meetings/${meetingId}/directives`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (!resp.ok) { showToast(result.detail || 'Lỗi thêm chỉ đạo', 'error'); return; }
            showToast('Thêm chỉ đạo thành công!', 'success');
        }

        closeModal('directiveModal');
        loadHeroDirectives();
        const card = document.getElementById(`meeting-${meetingId}`);
        if (card && card.classList.contains('expanded')) {
            card.classList.remove('expanded');
            toggleMeeting(meetingId);
        }
    } catch (e) {
        showToast('Lỗi kết nối máy chủ', 'error');
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
    
    // Gán danh sách đơn vị được giao (hỗ trợ nhiều đơn vị cách nhau bởi dấu phẩy)
    const listContainer = document.getElementById('sdAssignedList');
    if (listContainer) {
        listContainer.innerHTML = '';
        const rawAssigned = directive ? (directive.AssignedTo || '') : '';
        if (rawAssigned) {
            const units = rawAssigned.split(',').map(u => u.trim()).filter(Boolean);
            if (units.length > 0) {
                units.forEach(u => addAssignedUnitRow('sdAssignedList', 'sd-assigned-select', u));
            } else {
                addAssignedUnitRow('sdAssignedList', 'sd-assigned-select', '');
            }
        } else {
            addAssignedUnitRow('sdAssignedList', 'sd-assigned-select', '');
        }
    }

    // Gán đơn vị phối hợp (hỗ trợ nhiều đơn vị cách nhau bởi dấu phẩy)
    const coopContainer = document.getElementById('sdCoopList');
    if (coopContainer) {
        coopContainer.innerHTML = '';
        const rawCoop = directive ? (directive.CooperatingUnit || '') : '';
        if (rawCoop) {
            const units = rawCoop.split(',').map(u => u.trim()).filter(Boolean);
            if (units.length > 0) {
                units.forEach(u => addCoopUnitRow('sdCoopList', 'sd-coop-select', u));
            } else {
                addCoopUnitRow('sdCoopList', 'sd-coop-select', '');
            }
        } else {
            addCoopUnitRow('sdCoopList', 'sd-coop-select', '');
        }
    }

    document.getElementById('standaloneDirectiveModalTitle').textContent = directive ? 'Sửa chỉ đạo ngoài họp' : 'Thêm chỉ đạo ngoài họp';
    openModal('standaloneDirectiveModal');
}

async function editStandaloneDirective(directiveId) {
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
    const category = document.getElementById('sdCategory').value;
    const content = document.getElementById('sdContent').value.trim();
    const directiveDate = document.getElementById('sdDirectiveDate').value;
    const deadline = document.getElementById('sdDeadline').value || null;
    const priority = parseInt(document.getElementById('sdPriority').value) || 0;

    if (!content) {
        showToast('Vui lòng nhập nội dung chỉ đạo', 'warning');
        return;
    }
    if (!directiveDate) {
        showToast('Vui lòng chọn ngày chỉ đạo', 'warning');
        return;
    }

    // Thu thập danh sách các đơn vị được chọn
    const assignedSelects = document.querySelectorAll('#sdAssignedList .sd-assigned-select');
    const assignedUnits = [];
    assignedSelects.forEach(s => {
        const val = s.value.trim();
        if (val && !assignedUnits.includes(val)) {
            assignedUnits.push(val);
        }
    });
    const assignedTo = assignedUnits.length > 0 ? assignedUnits.join(', ') : null;

    // Thu thập tất cả đơn vị phối hợp đã chọn
    const sdCoopSelects = document.querySelectorAll('#sdCoopList .sd-coop-select');
    const coopUnits = [];
    sdCoopSelects.forEach(s => {
        const val = s.value.trim();
        if (val && !coopUnits.includes(val)) {
            coopUnits.push(val);
        }
    });
    const cooperatingUnit = coopUnits.length > 0 ? coopUnits.join(', ') : null;

    try {
        const data = {
            category,
            content,
            assignedTo,
            cooperatingUnit,
            directiveDate,
            deadline,
            priority
        };

        if (directiveId) {
            const resp = await fetch(`/api/directives/${directiveId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
            showToast(result.message || 'Cập nhật chỉ đạo thành công!', 'success');
        } else {
            const resp = await fetch('/api/directives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
            showToast('Thêm chỉ đạo thành công!', 'success');
        }

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

// ===================== PROPAGANDA PLANS (Kế hoạch tuyên truyền) =====================

let propagandaYear = new Date().getFullYear();
let propagandaMonth = new Date().getMonth(); // 0-indexed (0: Tháng 1, ..., 7: Tháng 8)
let propagandaViewMode = 'timeline'; // 'timeline' (mặc định) | 'grid'
let cachedPropagandaPlans = [];

function updatePropagandaMonthDisplay() {
    const label = document.getElementById('ppMonthLabel');
    if (label) {
        label.textContent = `Tháng ${propagandaMonth + 1}/${propagandaYear}`;
    }
}

function prevPropagandaMonth() {
    propagandaMonth--;
    if (propagandaMonth < 0) {
        propagandaMonth = 11;
        propagandaYear--;
    }
    updatePropagandaMonthDisplay();
    loadPropagandaPlans(false);
}

function nextPropagandaMonth() {
    propagandaMonth++;
    if (propagandaMonth > 11) {
        propagandaMonth = 0;
        propagandaYear++;
    }
    updatePropagandaMonthDisplay();
    loadPropagandaPlans(false);
}

function goToPropagandaToday() {
    const now = new Date();
    propagandaYear = now.getFullYear();
    propagandaMonth = now.getMonth();
    updatePropagandaMonthDisplay();
    loadPropagandaPlans(true);
}

function setPropagandaViewMode(mode) {
    propagandaViewMode = mode;
    const btnTimeline = document.getElementById('ppViewTimelineBtn');
    const btnGrid = document.getElementById('ppViewGridBtn');
    const timelineWrap = document.getElementById('propagandaTimelineWrapper');
    const gridWrap = document.getElementById('propagandaGridWrapper');

    if (btnTimeline) btnTimeline.className = mode === 'timeline' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';
    if (btnGrid) btnGrid.className = mode === 'grid' ? 'btn btn-sm btn-secondary active' : 'btn btn-sm btn-ghost';

    if (timelineWrap) timelineWrap.style.display = mode === 'timeline' ? 'block' : 'none';
    if (gridWrap) gridWrap.style.display = mode === 'grid' ? 'block' : 'none';

    renderPropagandaView(mode === 'timeline');
}

function getPropagandaDateRange() {
    const start = new Date(propagandaYear, propagandaMonth, 1);
    const end = new Date(propagandaYear, propagandaMonth + 1, 0);
    return { start: toDbDate(start), end: toDbDate(end) };
}

async function loadPropagandaPlans(scrollToToday = false) {
    updatePropagandaMonthDisplay();
    const container = document.getElementById('propagandaTimelineContainer');
    const grid = document.getElementById('propagandaGrid');
    
    if (container) container.innerHTML = '<div class="empty-state"><div class="loading-spinner">Đang tải timeline kế hoạch...</div></div>';
    if (grid) grid.innerHTML = '<div class="empty-state"><div class="loading-spinner">Đang tải kế hoạch...</div></div>';

    try {
        const { start, end } = getPropagandaDateRange();
        const url = `/api/propaganda-plans?start_date=${start}&end_date=${end}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Network error');
        cachedPropagandaPlans = await resp.json();
        renderPropagandaView(scrollToToday);
    } catch (e) {
        console.error('Error loading propaganda plans:', e);
        if (container) container.innerHTML = '<div class="empty-state"><p class="text-muted">Lỗi tải kế hoạch tuyên truyền</p></div>';
        if (grid) grid.innerHTML = '<div class="empty-state"><p class="text-muted">Lỗi tải kế hoạch tuyên truyền</p></div>';
    }
}

function renderPropagandaView(scrollToToday = false) {
    if (propagandaViewMode === 'timeline') {
        renderPropagandaTimeline(cachedPropagandaPlans, scrollToToday);
    } else {
        renderPropagandaGrid(cachedPropagandaPlans);
    }
}

function isMonthlyPlan(p) {
    if (!p || !p.PlanDate) return false;
    const timeText = (p.EventTime || '').toLowerCase();
    if (timeText.includes('dự kiến tháng') || timeText.includes('du kien thang') || timeText.includes('theo tháng')) {
        return true;
    }
    const pStart = p.PlanDate;
    const pEnd = p.PlanEndDate;
    if (!pEnd) return false;
    const startD = parseDbDate(pStart);
    const endD = parseDbDate(pEnd);
    if (!startD || !endD) return false;
    const isFirstDay = startD.getDate() === 1;
    const lastDayOfMonth = new Date(startD.getFullYear(), startD.getMonth() + 1, 0).getDate();
    const isLastDay = (endD.getDate() === lastDayOfMonth) && (endD.getMonth() === startD.getMonth()) && (endD.getFullYear() === startD.getFullYear());
    return isFirstDay && isLastDay;
}

function renderPropagandaTimeline(plans, scrollToToday = false) {
    const container = document.getElementById('propagandaTimelineContainer');
    if (!container) return;

    const daysInMonth = new Date(propagandaYear, propagandaMonth + 1, 0).getDate();
    const now = new Date();
    const todayStr = toDbDate(now);
    const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const canEdit = isVpdUser();

    // Tách kế hoạch dự kiến theo tháng và kế hoạch ngày cụ thể
    const monthlyPlans = (plans || []).filter(isMonthlyPlan);
    const dailyPlans = (plans || []).filter(p => !isMonthlyPlan(p));

    let html = '';

    // 1. Khởi tạo Bảng Timeline
    html += `
    <table class="pp-timeline-table">
        <thead>
            <tr>
                <th class="pp-th-date">Ngày</th>
                <th class="pp-th-content">Kế hoạch tuyên truyền</th>
            </tr>
        </thead>
        <tbody>`;

    // 2. Kế hoạch dự kiến theo tháng: hiển thị thành dòng ở đầu bảng với chiều dài ngang đầy đủ giống các ngày khác
    if (monthlyPlans.length > 0) {
        html += `
        <tr class="pp-timeline-row pp-row-monthly">
            <td class="pp-day-cell">
                <div class="pp-day-text pp-day-monthly">
                    <span style="font-weight: 700; color: var(--accent-amber);">Dự kiến</span>
                    <span class="days-badge upcoming" style="font-size: 0.65rem; padding: 0 5px; background: var(--accent-amber-light); color: var(--accent-amber);">Tháng ${propagandaMonth + 1}/${propagandaYear}</span>
                </div>
            </td>
            <td class="pp-content-cell">`;

        monthlyPlans.forEach(p => {
            const subParts = [];
            if (p.AssignedUnit) subParts.push(`📺 ${escapeHtml(p.AssignedUnit)}`);
            if (p.ExecutingUnit) subParts.push(`🏢 ${escapeHtml(p.ExecutingUnit)}`);
            if (p.CooperatingUnit) subParts.push(`🤝 ${escapeHtml(p.CooperatingUnit)}`);
            if (p.Location) subParts.push(`📍 ${escapeHtml(p.Location)}`);

            html += `
            <div class="pp-timeline-card pp-timeline-card-monthly" onclick="showPropagandaDetail(${p.PlanID})" title="Nhấp để xem chi tiết đầy đủ">
                <div class="pp-card-main">
                    <div class="pp-card-title">
                        ${escapeHtml(p.ActivityName)}
                        ${p.EventTime ? `<span class="pp-card-time">(${escapeHtml(p.EventTime)})</span>` : ''}
                    </div>
                    <div class="pp-card-sub">
                        ${subParts.map(s => `<span>${s}</span>`).join('')}
                        <span class="pp-card-tag" style="background:var(--accent-amber-light);color:var(--accent-amber);font-weight:600;">🗓️ Dự kiến trong tháng</span>
                    </div>
                </div>
                ${canEdit ? `
                <div class="pp-card-actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="editPropagandaPlan(${p.PlanID})" title="Sửa">✎</button>
                    <button class="btn-icon btn-danger" onclick="deletePropagandaPlan(${p.PlanID})" title="Xóa">✕</button>
                </div>` : ''}
            </div>`;
        });

        html += `</td></tr>`;
    }

    let hasTodayRow = false;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(propagandaYear, propagandaMonth, d);
        const dayOfWeek = dateObj.getDay();
        const mmStr = String(propagandaMonth + 1).padStart(2, '0');
        const ddStr = String(d).padStart(2, '0');
        const dateStr = `${propagandaYear}-${mmStr}-${ddStr}`;
        const isToday = (todayStr === dateStr);
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const dayLabel = `${dayNames[dayOfWeek]}, ${ddStr}/${mmStr}`;

        if (isToday) hasTodayRow = true;

        // Lọc các kế hoạch ngày cụ thể diễn ra trong ngày này
        const matchedPlans = dailyPlans.filter(p => {
            const start = p.PlanDate;
            const end = p.PlanEndDate || p.PlanDate;
            return dateStr >= start && dateStr <= end;
        });

        const rowClass = isToday ? 'pp-timeline-row pp-row-today' : 'pp-timeline-row';
        const rowId = isToday ? 'id="pp-timeline-today"' : '';

        html += `<tr class="${rowClass}" ${rowId}>`;
        
        // Cột Ngày
        html += `<td class="pp-day-cell">`;
        if (isToday) {
            html += `<div class="pp-day-text pp-day-today">
                <span>${escapeHtml(dayLabel)}</span>
                <span class="days-badge today" style="font-size:0.65rem;padding:0 5px;">Hôm nay</span>
            </div>`;
        } else {
            html += `<div class="pp-day-text ${isWeekend ? 'pp-day-weekend' : ''}">${escapeHtml(dayLabel)}</div>`;
        }
        html += `</td>`;

        // Cột Nội dung / Kế hoạch
        html += `<td class="pp-content-cell">`;
        if (matchedPlans.length === 0) {
            html += `<div class="pp-empty-cell"></div>`;
        } else {
            matchedPlans.forEach(p => {
                const subParts = [];
                if (p.AssignedUnit) subParts.push(`📺 ${escapeHtml(p.AssignedUnit)}`);
                if (p.ExecutingUnit) subParts.push(`🏢 ${escapeHtml(p.ExecutingUnit)}`);
                if (p.CooperatingUnit) subParts.push(`🤝 ${escapeHtml(p.CooperatingUnit)}`);
                if (p.Location) subParts.push(`📍 ${escapeHtml(p.Location)}`);

                // Kiểm tra sự kiện nhiều ngày
                let multiDayTag = '';
                if (p.PlanEndDate && p.PlanEndDate !== p.PlanDate) {
                    multiDayTag = `<span class="pp-card-tag">📅 ${formatDbDateVi(p.PlanDate)} → ${formatDbDateVi(p.PlanEndDate)}</span>`;
                }

                html += `
                <div class="pp-timeline-card" onclick="showPropagandaDetail(${p.PlanID})" title="Nhấp để xem chi tiết đầy đủ">
                    <div class="pp-card-main">
                        <div class="pp-card-title">
                            ${escapeHtml(p.ActivityName)}
                            ${p.EventTime ? `<span class="pp-card-time">(${escapeHtml(p.EventTime)})</span>` : ''}
                        </div>
                        <div class="pp-card-sub">
                            ${subParts.map(s => `<span>${s}</span>`).join('')}
                            ${multiDayTag}
                        </div>
                    </div>
                    ${canEdit ? `
                    <div class="pp-card-actions" onclick="event.stopPropagation()">
                        <button class="btn-icon" onclick="editPropagandaPlan(${p.PlanID})" title="Sửa">✎</button>
                        <button class="btn-icon btn-danger" onclick="deletePropagandaPlan(${p.PlanID})" title="Xóa">✕</button>
                    </div>` : ''}
                </div>`;
            });
        }
        html += `</td>`;
        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Cuộn tới ngày hôm nay nếu người dùng yêu cầu hoặc ở tháng hiện tại
    if (scrollToToday && hasTodayRow) {
        setTimeout(() => {
            const todayEl = document.getElementById('pp-timeline-today');
            if (todayEl) {
                todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 120);
    }
}

function truncateWords(str, maxWords = 10) {
    if (!str) return '';
    const words = str.trim().split(/\s+/);
    if (words.length <= maxWords) return str;
    return words.slice(0, maxWords).join(' ') + '...';
}

function renderPropagandaGrid(plans) {
    const grid = document.getElementById('propagandaGrid');
    if (!grid) return;
    if (!plans || plans.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p class="text-muted">Không có kế hoạch tuyên truyền nào trong Tháng ${propagandaMonth + 1}/${propagandaYear}</p></div>`;
        return;
    }

    const canEdit = isVpdUser();
    let html = '';
    plans.forEach(p => {
        const isMonthly = isMonthlyPlan(p);
        let dateRange = '';
        let daysLabel = '';

        if (isMonthly) {
            const startD = parseDbDate(p.PlanDate);
            const mNum = startD ? (startD.getMonth() + 1) : (propagandaMonth + 1);
            const yNum = startD ? startD.getFullYear() : propagandaYear;
            dateRange = `Dự kiến Tháng ${mNum}/${yNum}`;
            daysLabel = `<span class="days-badge upcoming" style="background:var(--accent-amber-light);color:var(--accent-amber);">Dự kiến</span>`;
        } else {
            const dateStr = formatDbDateVi(p.PlanDate);
            const endStr = p.PlanEndDate ? formatDbDateVi(p.PlanEndDate) : '';
            dateRange = endStr && endStr !== dateStr ? `${dateStr} → ${endStr}` : dateStr;

            // Tính ngày còn lại
            const today = new Date(); today.setHours(0,0,0,0);
            const planD = parseDbDate(p.PlanDate);
            const diffDays = planD ? Math.ceil((planD - today) / 86400000) : null;
            if (diffDays !== null) {
                if (diffDays === 0) daysLabel = '<span class="days-badge today">Hôm nay</span>';
                else if (diffDays === 1) daysLabel = '<span class="days-badge soon">Ngày mai</span>';
                else if (diffDays > 0) daysLabel = `<span class="days-badge upcoming">Còn ${diffDays} ngày</span>`;
            }
        }

        const shortLocation = truncateWords(p.Location, 10);

        html += `
        <div class="propaganda-card" onclick="showPropagandaDetail(${p.PlanID})" title="Nhấp để xem chi tiết đầy đủ">
            <!-- Thanh bar ngang trên cùng: Ngày tháng năm + Badge ngày + Nút thao tác -->
            <div class="propaganda-card-topbar">
                <div class="propaganda-date-info">
                    <span class="propaganda-cal-icon">📅</span>
                    <span class="propaganda-date-text">${escapeHtml(dateRange)}</span>
                    ${daysLabel}
                </div>
                ${canEdit ? `
                <div class="propaganda-card-actions" onclick="event.stopPropagation()">
                    <button class="btn-icon btn-xs" onclick="editPropagandaPlan(${p.PlanID})" title="Sửa">✎</button>
                    <button class="btn-icon btn-xs btn-danger" onclick="deletePropagandaPlan(${p.PlanID})" title="Xóa">✕</button>
                </div>` : ''}
            </div>

            <!-- Thân Card: Tên hoạt động + Metadata + Địa điểm rút gọn tối đa 10 từ -->
            <div class="propaganda-card-body">
                <div class="propaganda-card-title">${escapeHtml(p.ActivityName)}</div>
                
                <div class="propaganda-meta-row">
                    ${p.AssignedUnit ? `<span class="propaganda-tag unit">📺 ${escapeHtml(p.AssignedUnit)}</span>` : ''}
                    ${p.CooperatingUnit ? `<span class="propaganda-tag coop">🤝 ${escapeHtml(p.CooperatingUnit)}</span>` : ''}
                    ${isMonthly ? `<span class="propaganda-tag" style="background:var(--accent-amber-light);color:var(--accent-amber);font-weight:600;">Dự kiến theo tháng</span>` : ''}
                </div>

                ${p.EventTime ? `<div class="propaganda-meta-item"><span class="icon">⏰</span><span class="text">${escapeHtml(p.EventTime)}</span></div>` : ''}
                ${p.Location ? `<div class="propaganda-meta-item"><span class="icon">📍</span><span class="text">${escapeHtml(shortLocation)}</span></div>` : ''}
            </div>
        </div>`;
    });
    grid.innerHTML = html;
}

function handleExportPropaganda() {
    const { start, end } = getPropagandaDateRange();
    let url = '/api/propaganda-plans/export';
    if (start && end) {
        url += `?start_date=${start}&end_date=${end}`;
    }
    showToast('Đang tạo file Excel...', 'info');
    window.location.href = url;
}

async function showPropagandaDetail(planId) {
    try {
        const resp = await fetch(`/api/propaganda-plans/${planId}`);
        if (!resp.ok) { showToast('Không tìm thấy kế hoạch', 'error'); return; }
        const p = await resp.json();
        const isMonthly = isMonthlyPlan(p);

        let dateDisplay = '';
        if (isMonthly) {
            const startD = parseDbDate(p.PlanDate);
            const mNum = startD ? (startD.getMonth() + 1) : '';
            const yNum = startD ? startD.getFullYear() : '';
            dateDisplay = `Dự kiến Tháng ${mNum}/${yNum}`;
        } else {
            dateDisplay = p.PlanEndDate ? `${formatDbDateVi(p.PlanDate)} → ${formatDbDateVi(p.PlanEndDate)}` : formatDbDateVi(p.PlanDate);
        }

        const rows = [
            ['📅 Thời gian thực hiện', dateDisplay],
            ['⏰ Chi tiết thời gian', p.EventTime],
            ['🏛️ Danh nghĩa tổ chức', p.Organizer],
            ['🏢 Đơn vị thực hiện', p.ExecutingUnit],
            ['📍 Địa điểm', p.Location],
            ['📺 Phân công đơn vị HTV', p.AssignedUnit],
            ['🤝 Đơn vị phối hợp', p.CooperatingUnit],
            ['📝 Ghi chú', p.Notes],
        ].filter(([, v]) => v);

        document.getElementById('ppDetailTitle').textContent = '📣 ' + (p.ActivityName || 'Kế hoạch tuyên truyền');
        document.getElementById('ppDetailBody').innerHTML = `
            <table style="width:100%;border-collapse:collapse;">
                ${rows.map(([label, val]) => `
                <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:10px 12px;color:var(--text-muted);white-space:nowrap;width:35%;font-size:0.85rem;font-weight:600;">${label}</td>
                    <td style="padding:10px 12px;font-size:0.9rem;line-height:1.5;">${escapeHtml(val)}</td>
                </tr>`).join('')}
            </table>`;

        const footer = document.getElementById('ppDetailFooter');
        const canEdit = isVpdUser();
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('propagandaDetailModal')">Đóng</button>
            ${canEdit ? `
            <button class="btn btn-primary" onclick="closeModal('propagandaDetailModal'); editPropagandaPlan(${p.PlanID})">✏️ Sửa</button>
            <button class="btn" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;" onclick="closeModal('propagandaDetailModal'); deletePropagandaPlan(${p.PlanID})">🗑️ Xóa</button>
            ` : ''}`;

        openModal('propagandaDetailModal');
    } catch (e) {
        showToast('Lỗi tải chi tiết', 'error');
    }
}

function setPropagandaDateModeUI(mode) {
    const hiddenInput = document.getElementById('ppDateModeHidden');
    const tabExact = document.getElementById('ppTabExact');
    const tabMonth = document.getElementById('ppTabMonth');
    const exactGroup = document.getElementById('ppExactDateGroup');
    const monthGroup = document.getElementById('ppMonthDateGroup');
    const eventTimeInput = document.getElementById('ppEventTime');

    if (mode === 'month') {
        if (hiddenInput) hiddenInput.value = 'month';
        if (tabMonth) tabMonth.className = 'btn btn-sm btn-secondary active';
        if (tabExact) tabExact.className = 'btn btn-sm btn-ghost';
        if (exactGroup) exactGroup.style.display = 'none';
        if (monthGroup) monthGroup.style.display = 'flex';

        const m = document.getElementById('ppMonthSelect') ? document.getElementById('ppMonthSelect').value : (propagandaMonth + 1);
        const y = document.getElementById('ppYearInput') ? document.getElementById('ppYearInput').value : propagandaYear;
        if (eventTimeInput && (!eventTimeInput.value || eventTimeInput.value.startsWith('Dự kiến tháng') || eventTimeInput.value.startsWith('Dự kiến Tháng'))) {
            eventTimeInput.value = `Dự kiến tháng ${m} năm ${y}`;
        }
    } else {
        if (hiddenInput) hiddenInput.value = 'exact';
        if (tabExact) tabExact.className = 'btn btn-sm btn-secondary active';
        if (tabMonth) tabMonth.className = 'btn btn-sm btn-ghost';
        if (exactGroup) exactGroup.style.display = 'flex';
        if (monthGroup) monthGroup.style.display = 'none';
    }
}

function onMonthModeSelectChange() {
    const hiddenInput = document.getElementById('ppDateModeHidden');
    if (!hiddenInput || hiddenInput.value !== 'month') return;
    const m = document.getElementById('ppMonthSelect').value;
    const y = document.getElementById('ppYearInput').value;
    const eventTimeInput = document.getElementById('ppEventTime');
    if (eventTimeInput && (!eventTimeInput.value || eventTimeInput.value.startsWith('Dự kiến tháng') || eventTimeInput.value.startsWith('Dự kiến Tháng'))) {
        eventTimeInput.value = `Dự kiến tháng ${m} năm ${y}`;
    }
}

function openPropagandaModal(plan) {
    document.getElementById('ppPlanId').value = plan ? plan.PlanID : '';
    document.getElementById('ppActivityName').value = plan ? plan.ActivityName : '';
    document.getElementById('ppEventTime').value = plan ? (plan.EventTime || '') : '';
    document.getElementById('ppOrganizer').value = plan ? (plan.Organizer || '') : '';
    document.getElementById('ppExecutingUnit').value = plan ? (plan.ExecutingUnit || '') : '';
    document.getElementById('ppLocation').value = plan ? (plan.Location || '') : '';
    document.getElementById('ppAssignedUnit').value = plan ? (plan.AssignedUnit || '') : '';
    document.getElementById('ppCooperatingUnit').value = plan ? (plan.CooperatingUnit || '') : '';
    document.getElementById('ppNotes').value = plan ? (plan.Notes || '') : '';

    if (plan) {
        document.getElementById('propagandaModalTitle').textContent = 'Sửa kế hoạch tuyên truyền';
        if (isMonthlyPlan(plan)) {
            const startD = parseDbDate(plan.PlanDate);
            if (startD) {
                document.getElementById('ppMonthSelect').value = String(startD.getMonth() + 1);
                document.getElementById('ppYearInput').value = String(startD.getFullYear());
            }
            setPropagandaDateModeUI('month');
        } else {
            document.getElementById('ppPlanDate').value = plan.PlanDate || '';
            document.getElementById('ppPlanEndDate').value = plan.PlanEndDate || '';
            setPropagandaDateModeUI('exact');
        }
    } else {
        document.getElementById('propagandaModalTitle').textContent = 'Thêm kế hoạch tuyên truyền';
        document.getElementById('ppPlanDate').value = toDbDate(new Date());
        document.getElementById('ppPlanEndDate').value = '';
        document.getElementById('ppMonthSelect').value = String(propagandaMonth + 1);
        document.getElementById('ppYearInput').value = String(propagandaYear);
        setPropagandaDateModeUI('exact');
    }

    openModal('propagandaModal');
}

async function editPropagandaPlan(planId) {
    try {
        const resp = await fetch(`/api/propaganda-plans/${planId}`);
        if (!resp.ok) { showToast('Không tìm thấy kế hoạch', 'error'); return; }
        const plan = await resp.json();
        openPropagandaModal(plan);
    } catch (e) { showToast('Lỗi tải kế hoạch', 'error'); }
}

async function handlePropagandaSubmit() {
    const planId = document.getElementById('ppPlanId').value;
    const activityName = document.getElementById('ppActivityName').value.trim();
    const isMonthMode = document.getElementById('ppDateModeHidden') && (document.getElementById('ppDateModeHidden').value === 'month');

    if (!activityName) {
        showToast('Vui lòng nhập tên hoạt động', 'warning');
        return;
    }

    let planDate = '';
    let planEndDate = null;
    let eventTime = document.getElementById('ppEventTime').value.trim() || null;
    let monthNum = null;
    let yearNum = null;

    if (isMonthMode) {
        const m = parseInt(document.getElementById('ppMonthSelect').value);
        const y = parseInt(document.getElementById('ppYearInput').value);
        if (!y || isNaN(y)) {
            showToast('Vui lòng nhập năm hợp lệ', 'warning');
            return;
        }
        monthNum = m;
        yearNum = y;
        const lastDay = new Date(y, m, 0).getDate();
        planDate = `${y}-${String(m).padStart(2, '0')}-01`;
        planEndDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        if (!eventTime) {
            eventTime = `Dự kiến tháng ${m} năm ${y}`;
        }
    } else {
        planDate = document.getElementById('ppPlanDate').value;
        planEndDate = document.getElementById('ppPlanEndDate').value || null;
        if (!planDate) {
            showToast('Vui lòng chọn ngày bắt đầu', 'warning');
            return;
        }
    }

    const data = {
        activityName,
        planDate,
        planEndDate,
        month: monthNum,
        year: yearNum,
        eventTime,
        organizer: document.getElementById('ppOrganizer').value.trim() || null,
        executingUnit: document.getElementById('ppExecutingUnit').value.trim() || null,
        location: document.getElementById('ppLocation').value.trim() || null,
        assignedUnit: document.getElementById('ppAssignedUnit').value.trim() || null,
        cooperatingUnit: document.getElementById('ppCooperatingUnit').value.trim() || null,
        notes: document.getElementById('ppNotes').value.trim() || null,
    };

    try {
        const url = planId ? `/api/propaganda-plans/${planId}` : '/api/propaganda-plans';
        const method = planId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        closeModal('propagandaModal');

        // Tự động chuyển timeline đến đúng tháng của kế hoạch mới tạo/sửa
        if (data.planDate) {
            const d = parseDbDate(data.planDate);
            if (d) {
                propagandaYear = d.getFullYear();
                propagandaMonth = d.getMonth();
            }
        }

        loadPropagandaPlans();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deletePropagandaPlan(planId) {
    if (!confirm('Bạn có chắc muốn xóa kế hoạch tuyên truyền này?')) return;
    try {
        const resp = await fetch(`/api/propaganda-plans/${planId}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadPropagandaPlans();
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

// ===================== COMMENTS =====================

async function loadComments() {
    const container = document.getElementById('commentsList');
    if (!container) return;
    try {
        const params = commentFilter ? `?filter=${commentFilter}` : '';
        const resp = await fetch(`/api/comments${params}`);
        const comments = await resp.json();
        renderComments(comments);
    } catch (e) {
        console.error('Error loading comments:', e);
    }
}

function setCommentFilter(filter) {
    commentFilter = filter;
    ['commentFilterAllBtn', 'commentFilterWeekBtn', 'commentFilterMonthBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'btn btn-sm btn-ghost';
    });
    const activeMap = { '': 'commentFilterAllBtn', 'week': 'commentFilterWeekBtn', 'month': 'commentFilterMonthBtn' };
    const activeEl = document.getElementById(activeMap[filter]);
    if (activeEl) activeEl.className = 'btn btn-sm btn-secondary active';
    loadComments();
}

function truncateWords(text, limit = 50) {
    if (!text) return '';
    const words = text.split(/\s+/);
    if (words.length <= limit) return text;
    return words.slice(0, limit).join(' ') + '...';
}

function formatCommentDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${min}, ${dd}/${mm}/${yyyy}`;
    } catch (e) { return dateStr; }
}

function renderComments(comments) {
    const container = document.getElementById('commentsList');
    if (!container) return;

    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Chưa có bình luận nào</p></div>';
        return;
    }

    const currentUsername = currentUser ? (currentUser.username || '').toLowerCase() : '';
    let html = '';
    comments.forEach(c => {
        const isPending = c.Status === 'pending';
        const isAuthor = (c.AuthorUsername || '').toLowerCase() === currentUsername;
        const canApprove = currentUser && canApproveCommentClient(c);
        const words = (c.CommentText || '').split(/\s+/);
        const isTruncated = words.length > 50;
        const displayText = isTruncated ? truncateWords(c.CommentText) : c.CommentText;

        html += `
        <div class="comment-card ${isPending ? 'pending' : ''}" id="comment-${c.CommentID}">
            <div class="comment-header">
                <span class="comment-author">👤 ${escapeHtml(c.AuthorName || c.AuthorUsername)}</span>
                ${c.Department ? `<span class="comment-dept">${escapeHtml(c.Department)}</span>` : ''}
                <span class="comment-status-badge ${isPending ? 'pending' : 'approved'}">
                    ${isPending ? '⏳ Chờ duyệt' : '✓ Đã duyệt'}
                </span>
                <span class="comment-time">${formatCommentDate(c.CreatedAt)}</span>
            </div>
            <div class="comment-body">
                ${formatContent(displayText)}
                ${isTruncated ? `<button class="btn btn-xs btn-ghost" onclick="expandComment(${c.CommentID}, ${JSON.stringify(escapeHtml(c.CommentText))})">▼ Xem đầy đủ</button>` : ''}
            </div>
            <div class="comment-actions">
                ${canApprove && isPending ? `<button class="btn btn-xs btn-primary" onclick="approveComment(${c.CommentID})">✓ Duyệt</button>` : ''}
                ${isAuthor || canApprove ? `<button class="btn btn-xs btn-secondary" onclick="deleteCommentAction(${c.CommentID})">✕ Xóa</button>` : ''}
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function canApproveCommentClient(comment) {
    if (!currentUser) return false;
    if (isAdminUser() || isBanTgdUser()) return true;
    const vt = (currentUser.vai_tro || '').toLowerCase();
    const role = (currentUser.role || '');
    const isBPT = ['truong_ban','pho_ban','truong_phong','pho_phong','bpt'].includes(vt)
               || role === 'BPT' || currentUser.vai_tro === 'BanTGD' || role === 'BanTGD';
    if (!isBPT) return false;

    const dept = (currentUser.department || '').toLowerCase();
    const isVpd = ['văn phòng đài','van phong dai','vpd','vpđ','văn phòng'].some(k => dept.includes(k));
    if (isVpd) return true;
    
    if (!comment || !comment.Department) return true;
    const cd = (comment.Department || '').toLowerCase().trim();
    return dept === cd || dept.includes(cd) || cd.includes(dept);
}

async function submitComment() {
    if (!currentUser || !currentUser.logged_in) {
        showToast('Vui lòng đăng nhập để bình luận', 'warning');
        return;
    }
    const text = (document.getElementById('commentInput').value || '').trim();
    if (!text) {
        showToast('Vui lòng nhập nội dung bình luận', 'warning');
        return;
    }
    try {
        const resp = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentText: text })
        });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        document.getElementById('commentInput').value = '';
        loadComments();
        checkPendingComments();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function approveComment(commentId) {
    try {
        const resp = await fetch(`/api/comments/${commentId}/approve`, { method: 'PUT' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadComments();
        checkPendingComments();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function deleteCommentAction(commentId) {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
        const resp = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast(result.message, 'success');
        loadComments();
        checkPendingComments();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

function expandComment(commentId, htmlText) {
    document.getElementById('commentExpandTitle').textContent = 'Nội dung bình luận';
    document.getElementById('commentExpandBody').innerHTML = `<p style="line-height:1.8;">${htmlText}</p>`;
    openModal('commentExpandModal');
}

async function checkPendingComments() {
    try {
        const resp = await fetch('/api/comments/pending-count');
        const data = await resp.json();
        
        // Header badge (kế bên nút chế độ tối)
        const headerBadge = document.getElementById('headerPendingCommentBadge');
        const headerText = document.getElementById('headerPendingCountText');
        if (headerBadge) {
            if (data.count > 0) {
                if (headerText) headerText.textContent = data.count;
                headerBadge.style.display = 'inline-flex';
                headerBadge.onclick = openPendingCommentsModal;
            } else {
                headerBadge.style.display = 'none';
            }
        }

        // Section badge (ở tiêu đề Bình luận)
        const badge = document.getElementById('pendingCommentBadge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = `${data.count} chờ duyệt`;
                badge.style.display = 'inline-flex';
                badge.onclick = openPendingCommentsModal;
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        // Ignore - user may not be logged in
    }
}

// ===================== PENDING COMMENTS MODAL =====================
async function openPendingCommentsModal() {
    const modalBody = document.getElementById('pendingCommentsModalBody');
    const modalCount = document.getElementById('pendingModalCount');
    if (!modalBody) return;
    
    openModal('pendingCommentsModal');
    modalBody.innerHTML = '<div class="loading-spinner">Đang tải danh sách bình luận chờ duyệt...</div>';

    try {
        const resp = await fetch('/api/comments/pending');
        const pendingComments = await resp.json();

        if (modalCount) modalCount.textContent = pendingComments.length;

        if (!pendingComments || pendingComments.length === 0) {
            modalBody.innerHTML = `
            <div class="empty-state" style="padding: 24px 0;">
                <div class="icon" style="font-size: 2.2rem; margin-bottom: 8px;">🎉</div>
                <p class="text-muted" style="font-weight: 500;">Không có bình luận nào đang chờ duyệt!</p>
            </div>`;
            return;
        }

        let html = '';
        pendingComments.forEach(c => {
            html += `
            <div class="pending-modal-item" id="pending-item-${c.CommentID}">
                <div class="pending-modal-header">
                    <span class="pending-modal-author">👤 ${escapeHtml(c.AuthorName || c.AuthorUsername)}</span>
                    ${c.Department ? `<span class="pending-modal-dept">${escapeHtml(c.Department)}</span>` : ''}
                    <span class="pending-modal-time">${formatCommentDate(c.CreatedAt)}</span>
                </div>
                <div class="pending-modal-body">${formatContent(c.CommentText)}</div>
                <div class="pending-modal-actions">
                    <button class="btn btn-sm btn-primary" onclick="approvePendingComment(${c.CommentID})">✓ Duyệt</button>
                    <button class="btn btn-sm btn-secondary" style="color:var(--accent-red);border-color:var(--accent-red-light);" onclick="rejectPendingComment(${c.CommentID})">✕ Không duyệt</button>
                </div>
            </div>`;
        });
        modalBody.innerHTML = html;
    } catch (e) {
        modalBody.innerHTML = '<p class="text-muted text-center">Lỗi khi tải bình luận chờ duyệt</p>';
    }
}

async function approvePendingComment(commentId) {
    try {
        const resp = await fetch(`/api/comments/${commentId}/approve`, { method: 'PUT' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi duyệt', 'error'); return; }
        showToast('Đã duyệt bình luận!', 'success');
        openPendingCommentsModal();
        loadComments();
        checkPendingComments();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

async function rejectPendingComment(commentId) {
    if (!confirm('Bạn có chắc muốn từ chối (không duyệt) bình luận này?')) return;
    try {
        const resp = await fetch(`/api/comments/${commentId}/reject`, { method: 'PUT' });
        const result = await resp.json();
        if (!resp.ok) { showToast(result.detail || 'Lỗi', 'error'); return; }
        showToast('Đã từ chối bình luận!', 'success');
        openPendingCommentsModal();
        loadComments();
        checkPendingComments();
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}


// ===================== BANNERS (CHỮ CHẠY NGANG / TICKER) =====================
let activeBanners = [];
let cachedBanners = [];
let currentViewingBanner = null;

async function loadActiveBanners() {
    const track = document.getElementById('tickerMarqueeContent');
    if (!track) return;

    try {
        const resp = await fetch('/api/banners/active');
        const data = await resp.json();
        activeBanners = data.banners || [];

        if (activeBanners.length === 0) {
            track.innerHTML = '<span class="ticker-item ticker-placeholder">Chào mừng đến với Hệ thống Giao ban Đài Phát thanh và Truyền hình Thành phố Hồ Chí Minh (HTV)</span>';
            track.style.animationDuration = '25s';
            return;
        }

        let itemsHtml = '';
        activeBanners.forEach((b, index) => {
            const deptBadge = b.Department ? `<span class="ticker-item-dept">${escapeHtml(b.Department)}</span>` : '';
            itemsHtml += `
                <span class="ticker-item" data-id="${b.BannerID}" title="Nhấn để xem chi tiết & sao chép">
                    ${deptBadge}
                    <span>${escapeHtml(b.Content)}</span>
                </span>
            `;
            if (index < activeBanners.length - 1 || activeBanners.length > 1) {
                itemsHtml += `<span class="ticker-separator">✦</span>`;
            }
        });

        track.innerHTML = itemsHtml;

        // Tự động tính toán tốc độ chạy mượt mà theo độ dài chữ
        const textLength = activeBanners.reduce((acc, b) => acc + (b.Content || '').length + (b.Department || '').length, 0);
        const duration = Math.max(22, Math.min(150, Math.round(textLength / 4.5)));
        track.style.animationDuration = `${duration}s`;

    } catch (e) {
        console.error('Error loading active banners:', e);
        track.innerHTML = '<span class="ticker-item ticker-placeholder">Hệ thống Giao ban HTV</span>';
    }
}

function openBannerCreateModal(editBanner = null) {
    const titleEl = document.getElementById('bannerFormModalTitle');
    const editIdEl = document.getElementById('bannerEditId');
    const contentEl = document.getElementById('bannerFormContent');
    const startEl = document.getElementById('bannerFormStartDate');
    const endEl = document.getElementById('bannerFormEndDate');
    const draftBtn = document.getElementById('bannerSaveDraftBtn');
    const publishBtn = document.getElementById('bannerPublishBtn');

    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    if (editBanner) {
        titleEl.textContent = 'Chỉnh sửa thông báo Banner';
        editIdEl.value = editBanner.BannerID;
        contentEl.value = editBanner.Content || '';
        startEl.value = (editBanner.StartDate || todayStr).substring(0, 10);
        endEl.value = (editBanner.EndDate || nextWeekStr).substring(0, 10);
        if (draftBtn) draftBtn.textContent = 'Lưu thay đổi';
        if (publishBtn) publishBtn.textContent = editBanner.Status === 'Published' ? 'Cập nhật & Công bố' : '🚀 Công bố ngay';
    } else {
        titleEl.textContent = 'Tạo thông báo Banner';
        editIdEl.value = '';
        contentEl.value = '';
        startEl.value = todayStr;
        endEl.value = nextWeekStr;
        if (draftBtn) draftBtn.textContent = 'Lưu bản nháp';
        if (publishBtn) publishBtn.textContent = '🚀 Công bố ngay';
    }

    openModal('bannerFormModal');
}

async function submitBannerForm(publishNow) {
    const editId = document.getElementById('bannerEditId').value;
    const content = (document.getElementById('bannerFormContent').value || '').trim();
    const startDate = document.getElementById('bannerFormStartDate').value;
    const endDate = document.getElementById('bannerFormEndDate').value;

    if (!content) {
        showToast('Vui lòng nhập nội dung thông báo banner', 'warning');
        return;
    }
    if (!startDate) {
        showToast('Vui lòng chọn ngày bắt đầu chạy', 'warning');
        return;
    }
    if (!endDate) {
        showToast('Vui lòng chọn ngày kết thúc chạy', 'warning');
        return;
    }
    if (startDate > endDate) {
        showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc', 'warning');
        return;
    }

    const payload = {
        content: content,
        startDate: startDate,
        endDate: endDate,
        status: publishNow ? 'Published' : 'Draft'
    };

    try {
        let resp;
        if (editId) {
            resp = await fetch(`/api/banners/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            resp = await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await resp.json();
        if (!resp.ok) {
            showToast(data.detail || 'Lỗi lưu banner', 'error');
            return;
        }

        showToast(data.message || (publishNow ? 'Đã công bố banner!' : 'Đã lưu bản nháp!'), 'success');
        closeModal('bannerFormModal');
        loadActiveBanners();
        const listModal = document.getElementById('bannerListModal');
        if (listModal && listModal.classList.contains('active')) {
            loadBannerList();
        }
    } catch (e) {
        console.error(e);
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

async function openBannerDetail(bannerId) {
    let banner = (activeBanners || []).find(b => b.BannerID === bannerId);
    if (!banner) {
        banner = (cachedBanners || []).find(b => b.BannerID === bannerId);
    }
    if (!banner) {
        try {
            const resp = await fetch(`/api/banners/${bannerId}`);
            if (resp.ok) {
                banner = await resp.json();
            }
        } catch (e) {}
    }

    if (!banner) {
        showToast('Không tìm thấy thông tin banner', 'error');
        return;
    }

    currentViewingBanner = banner;

    const deptEl = document.getElementById('bannerDetailDept');
    const datesEl = document.getElementById('bannerDetailDates');
    const authorEl = document.getElementById('bannerDetailAuthor');
    const contentEl = document.getElementById('bannerDetailContent');
    const copyBtnText = document.getElementById('bannerCopyBtnText');
    const copyBtn = document.getElementById('bannerCopyBtn');

    if (deptEl) deptEl.textContent = banner.Department ? `🏢 ${banner.Department}` : '🏢 Toàn Đài';
    if (datesEl) datesEl.textContent = `📅 Hiệu lực: ${banner.StartDate} → ${banner.EndDate}`;
    if (authorEl) authorEl.textContent = `👤 ${banner.CreatedByName || banner.CreatedBy || 'Ban Biên tập'}`;
    if (contentEl) contentEl.textContent = banner.Content || '';

    if (copyBtn) copyBtn.classList.remove('copied');
    if (copyBtnText) copyBtnText.textContent = 'Sao chép nội dung';

    openModal('bannerDetailModal');
}

async function copyBannerDetailText() {
    if (!currentViewingBanner || !currentViewingBanner.Content) {
        showToast('Không có nội dung để sao chép', 'warning');
        return;
    }

    try {
        await navigator.clipboard.writeText(currentViewingBanner.Content);
        const copyBtn = document.getElementById('bannerCopyBtn');
        const copyBtnText = document.getElementById('bannerCopyBtnText');
        if (copyBtn) copyBtn.classList.add('copied');
        if (copyBtnText) copyBtnText.textContent = '✓ Đã sao chép!';
        showToast('Đã sao chép nội dung vào bộ nhớ đệm!', 'success');

        setTimeout(() => {
            if (copyBtn) copyBtn.classList.remove('copied');
            if (copyBtnText) copyBtnText.textContent = 'Sao chép nội dung';
        }, 2000);
    } catch (e) {
        // Fallback copy
        const temp = document.createElement('textarea');
        temp.value = currentViewingBanner.Content;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast('Đã sao chép nội dung!', 'success');
    }
}

function openBannerListModal() {
    openModal('bannerListModal');
    loadBannerList();
}

function resetBannerListFilter() {
    document.getElementById('bannerFilterStartDate').value = '';
    document.getElementById('bannerFilterEndDate').value = '';
    document.getElementById('bannerFilterStatus').value = '';
    loadBannerList();
}

async function loadBannerList() {
    const container = document.getElementById('bannerTableContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Đang tải danh sách banner...</div>';

    const startDate = document.getElementById('bannerFilterStartDate').value;
    const endDate = document.getElementById('bannerFilterEndDate').value;
    const status = document.getElementById('bannerFilterStatus').value;

    let url = '/api/banners?';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (status) params.append('status', status);
    url += params.toString();

    try {
        const resp = await fetch(url);
        const data = await resp.json();
        cachedBanners = data.banners || [];

        if (cachedBanners.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="text-muted">Không có thông báo banner nào phù hợp</p></div>';
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const isAdmin = isAdminUser();
        const currentUsername = currentUser ? (currentUser.username || '').toLowerCase() : '';

        let html = `
            <table class="banner-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">STT</th>
                        <th style="width: 140px;">Đơn vị</th>
                        <th>Nội dung thông báo</th>
                        <th style="width: 170px;">Thời gian chạy</th>
                        <th style="width: 130px;">Trạng thái</th>
                        <th style="width: 160px; text-align: right;">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cachedBanners.forEach((b, idx) => {
            const isPublished = b.Status === 'Published';
            const isDraft = !isPublished;
            const isAuthor = (b.CreatedBy || '').toLowerCase() === currentUsername;
            const canEdit = isDraft && (isAuthor || isAdmin);
            const canPublish = isDraft && (isAuthor || isAdmin);
            // Quy tắc: Khi đã công bố, Trưởng ban KHÔNG được xóa. Chỉ Quản trị viên Admin mới có quyền xóa!
            const canDelete = isPublished ? isAdmin : (isAuthor || isAdmin);

            let statusBadge = '';
            if (isDraft) {
                statusBadge = '<span class="banner-status-badge banner-status-draft">🟡 Bản nháp</span>';
            } else if (todayStr >= b.StartDate && todayStr <= b.EndDate) {
                statusBadge = '<span class="banner-status-badge banner-status-active">🟢 Đang chạy</span>';
            } else if (todayStr > b.EndDate) {
                statusBadge = '<span class="banner-status-badge banner-status-expired">⚪ Đã kết thúc</span>';
            } else {
                statusBadge = '<span class="banner-status-badge banner-status-published">🔵 Chờ đến ngày</span>';
            }

            html += `
                <tr>
                    <td style="font-weight: 600; color: var(--text-muted);">${idx + 1}</td>
                    <td><span class="badge badge-primary">${escapeHtml(b.Department || 'Toàn Đài')}</span></td>
                    <td>
                        <div class="banner-content-preview" onclick="openBannerDetail(${b.BannerID})" title="Nhấn để xem toàn bộ & copy">
                            ${escapeHtml(b.Content)}
                        </div>
                        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
                            Người tạo: ${escapeHtml(b.CreatedByName || b.CreatedBy || '--')}
                        </div>
                    </td>
                    <td style="font-size: 0.82rem;">
                        <div><strong>Từ:</strong> ${b.StartDate}</div>
                        <div><strong>Đến:</strong> ${b.EndDate}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="banner-action-cell">
                            <button class="btn btn-sm btn-ghost" title="Xem chi tiết & Sao chép" onclick="openBannerDetail(${b.BannerID})">👁️</button>
                            ${canPublish ? `<button class="btn btn-sm btn-primary" title="Công bố ngay" onclick="publishBannerAction(${b.BannerID})">🚀</button>` : ''}
                            ${canEdit ? `<button class="btn btn-sm btn-secondary" title="Chỉnh sửa" onclick="editBannerAction(${b.BannerID})">✏️</button>` : ''}
                            ${canDelete ? `<button class="btn btn-sm btn-secondary" style="color: var(--accent-red); border-color: var(--accent-red-light);" title="Xóa banner" onclick="deleteBannerAction(${b.BannerID}, ${isPublished})">🗑️</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Lỗi khi tải danh sách banner</p></div>';
    }
}

function editBannerAction(bannerId) {
    const b = (cachedBanners || []).find(x => x.BannerID === bannerId);
    if (b) {
        openBannerCreateModal(b);
    }
}

async function publishBannerAction(bannerId) {
    if (!confirm('Bạn có chắc muốn công bố banner này? Banner sẽ bắt đầu hiển thị theo ngày hiệu lực.')) return;

    try {
        const resp = await fetch(`/api/banners/${bannerId}/publish`, { method: 'POST' });
        const data = await resp.json();
        if (!resp.ok) {
            showToast(data.detail || 'Lỗi công bố banner', 'error');
            return;
        }
        showToast('Công bố banner thành công!', 'success');
        loadActiveBanners();
        loadBannerList();
    } catch (e) {
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

async function deleteBannerAction(bannerId, isPublished) {
    if (isPublished && !isAdminUser()) {
        showToast('Banner đã công bố! Trưởng ban không được phép xóa, chỉ Quản trị viên (Admin) mới có quyền xóa.', 'error');
        return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa thông báo banner này? Hành động này không thể hoàn tác.')) return;

    try {
        const resp = await fetch(`/api/banners/${bannerId}`, { method: 'DELETE' });
        const data = await resp.json();
        if (!resp.ok) {
            showToast(data.detail || 'Lỗi xóa banner', 'error');
            return;
        }
        showToast('Đã xóa banner thành công!', 'success');
        loadActiveBanners();
        loadBannerList();
    } catch (e) {
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

