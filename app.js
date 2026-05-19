/**
 * Laporan Bulanan Content Writer
 * Main Application Logic - Modular & Optimized with Supabase
 */

// =========================================
// SUPABASE CONFIGURATION
// =========================================
// GANTI VALUE DI BAWAH INI DENGAN PROJECT URL & ANON KEY DARI SUPABASE ANDA
const SUPABASE_URL = 'https://pvuortefdvpseedroctw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6OLuITMEiE5u0TSqIQGlqw_LO_tvSg_';

const isSupabaseConfigured = SUPABASE_URL !== 'https://pvuortefdvpseedroctw.supabase.co';

// Initialize Supabase Client ONLY if configured
let supabaseClient = null;
if (isSupabaseConfigured) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const Storage = {
    REPORTS_KEY: 'cw_reports',
    THEME_KEY: 'cw_theme_v2',
    DRAFT_KEY: 'cw_draft_v2',

    getTheme() {
        return localStorage.getItem(this.THEME_KEY) || 'light';
    },

    setTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
    },

    saveDraft(data) {
        localStorage.setItem(this.DRAFT_KEY, JSON.stringify(data));
    },

    getDraft() {
        try {
            const draft = localStorage.getItem(this.DRAFT_KEY);
            return draft ? JSON.parse(draft) : null;
        } catch (e) {
            return null;
        }
    },

    clearDraft() {
        localStorage.removeItem(this.DRAFT_KEY);
    },

    // Fallback LocalStorage CRUD when Supabase is not configured
    getReportsFallback() {
        try {
            const data = localStorage.getItem(this.REPORTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    saveReportsFallback(reports) {
        localStorage.setItem(this.REPORTS_KEY, JSON.stringify(reports));
    }
};

const Utils = {
    generateId() {
        return 'rep_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },
    formatMonth(monthStr) {
        if (!monthStr) return '-';
        const [year, month] = monthStr.split('-');
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${months[parseInt(month, 10) - 1]} ${year}`;
    },

    escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    },

    formatTextForHTML(str) {
        if (!str) return '';
        return this.escapeHTML(str).replace(/\n/g, '<br>');
    }
};

const UI = {
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check-circle' : 'warning-circle';
        toast.innerHTML = `
            <i class="ph ph-${icon}"></i>
            <span>${Utils.escapeHTML(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.4s var(--transition-bounce) forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const toggleBtns = document.querySelectorAll('.theme-toggle');
        toggleBtns.forEach(toggleBtn => {
            if (!toggleBtn.hasAttribute('aria-label') || toggleBtn.getAttribute('aria-label') !== 'Logout') {
                if(theme === 'dark') {
                    toggleBtn.innerHTML = '<i class="ph ph-sun"></i><span>Light Mode</span>';
                } else {
                    toggleBtn.innerHTML = '<i class="ph ph-moon"></i><span>Dark Mode</span>';
                }
            }
        });
    },

    navigate(view) {
        const targetId = view === 'dashboard' ? 'view-dashboard' : (view === 'form' ? 'view-form' : 'view-admin');

        // Ensure the target is fully visible immediately
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.style.display = 'block';
            void targetView.offsetWidth; // trigger reflow
            targetView.classList.add('active');
        }

        // Hide all OTHER views
        document.querySelectorAll('.view-section').forEach(el => {
            if (el.id !== targetId) {
                el.classList.remove('active');
                el.style.display = 'none'; // Set display none immediately to avoid layout issues during playwright test
            }
        });

        // Update nav links
        document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));

        if (view === 'dashboard') {
            const navDash = document.getElementById('nav-dashboard');
            if(navDash) navDash.classList.add('active');
            document.getElementById('page-title').textContent = 'Dashboard';
            const btnCreate = document.getElementById('btn-header-create');
            if(btnCreate) btnCreate.style.display = 'inline-flex';
        } else if (view === 'form') {
            const navCreate = document.getElementById('nav-create');
            if(navCreate) navCreate.classList.add('active');
            const isEdit = document.getElementById('report-id').value !== '';
            document.getElementById('page-title').textContent = isEdit ? 'Edit Laporan' : 'Buat Laporan Baru';
            const btnCreate = document.getElementById('btn-header-create');
            if(btnCreate) btnCreate.style.display = 'none';
        } else if (view === 'admin') {
            const navAdmin = document.getElementById('nav-admin');
            if(navAdmin) navAdmin.classList.add('active');
            document.getElementById('page-title').textContent = 'Admin Dashboard';
            const btnCreate = document.getElementById('btn-header-create');
            if(btnCreate) btnCreate.style.display = 'none';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

const app = {
    reports: [],
    allReports: [], // for admin
    allUsers: [], // for admin
    currentTheme: 'light',
    user: null,
    profile: null,
    isLoginMode: true,

    async init() {
        this.currentTheme = Storage.getTheme();
        UI.setTheme(this.currentTheme);
        this.setupListeners();

        if (isSupabaseConfigured) {
            // Check Auth Session
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                await this.handleUserLogin(session.user);
            } else {
                this.showAuth();
            }

            // Listen for auth changes
            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN') {
                    await this.handleUserLogin(session.user);
                } else if (event === 'SIGNED_OUT') {
                    this.handleUserLogout();
                }
            });
        } else {
            // Fallback Mode: Skip Auth, grant pseudo-admin
            console.warn("Supabase not configured. Falling back to LocalStorage mode.");
            this.hideAuth();
            this.user = { id: 'local_user' };
            this.profile = { full_name: 'Local User', role: 'admin' };
            document.getElementById('display-user-name').textContent = 'Local Mode';
            document.getElementById('display-user-role').textContent = 'admin';
            document.getElementById('nav-admin').style.display = 'flex';

            await this.loadReports();
            this.navigate('dashboard');
        }
    },

    setupListeners() {
        const form = document.getElementById('report-form');
        form.addEventListener('input', this.debounce(() => this.autoSaveDraft(), 500));
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // =========================================
    // AUTHENTICATION LOGIC
    // =========================================
    showAuth() {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('app-main-container').style.display = 'none';
    },

    hideAuth() {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('app-main-container').style.display = 'flex';
    },

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        document.getElementById('group-fullname').style.display = this.isLoginMode ? 'none' : 'flex';
        document.getElementById('btn-auth-submit').textContent = this.isLoginMode ? 'Login' : 'Daftar';
        document.getElementById('auth-subtitle').textContent = this.isLoginMode ? 'Login untuk mengakses dashboard Anda' : 'Buat akun baru untuk mulai membuat laporan';
        document.getElementById('auth-toggle-text').innerHTML = this.isLoginMode ?
            'Belum punya akun? <a href="#" onclick="app.toggleAuthMode()">Daftar di sini</a>' :
            'Sudah punya akun? <a href="#" onclick="app.toggleAuthMode()">Login di sini</a>';
    },

    async handleAuth(e) {
        e.preventDefault();

        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const fullName = document.getElementById('auth-fullname').value || email.split('@')[0];
        const btn = document.getElementById('btn-auth-submit');

        btn.disabled = true;
        btn.textContent = 'Memproses...';

        if (!isSupabaseConfigured) {
            // Fallback Local Mode logic
            setTimeout(async () => {
                UI.showToast(this.isLoginMode ? 'Login Local berhasil' : 'Pendaftaran Local berhasil', 'success');
                this.hideAuth();
                this.user = { id: 'local_user_' + Date.now() };
                this.profile = { full_name: fullName, role: 'admin' };
                document.getElementById('display-user-name').textContent = fullName;
                document.getElementById('display-user-role').textContent = 'admin';
                document.getElementById('nav-admin').style.display = 'flex';

                await this.loadReports();
                this.navigate('dashboard');
            }, 800);
            return;
        }

        try {
            if (this.isLoginMode) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                UI.showToast('Login berhasil', 'success');
            } else {
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });
                if (error) throw error;

                if (data?.user?.identities?.length === 0) {
                     UI.showToast('Email sudah terdaftar. Silakan login.', 'error');
                     btn.disabled = false;
                     btn.textContent = 'Daftar';
                     return;
                }

                UI.showToast('Pendaftaran berhasil. Silakan login.', 'success');
                if(!data.session) this.toggleAuthMode(); // Wait for email confirmation if enabled
            }
        } catch (error) {
            UI.showToast(error.message, 'error');
            btn.disabled = false;
            btn.textContent = this.isLoginMode ? 'Login' : 'Daftar';
        }
    },

    async handleUserLogin(user) {
        this.user = user;
        this.hideAuth();

        // Fetch User Profile (Role)
        const { data: profile, error } = await supabaseClient.from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            this.profile = profile;
            document.getElementById('display-user-name').textContent = profile.full_name || user.email;
            document.getElementById('display-user-role').textContent = profile.role;

            // Show Admin Menu if admin
            if (profile.role === 'admin') {
                document.getElementById('nav-admin').style.display = 'flex';
            } else {
                document.getElementById('nav-admin').style.display = 'none';
            }
        }

        await this.loadReports();
        this.navigate('dashboard');
    },

    async logout() {
        if (isSupabaseConfigured) {
            await supabaseClient.auth.signOut();
        } else {
            UI.showToast('Fungsi logout dinonaktifkan di mode LocalStorage', 'warning');
        }
    },

    handleUserLogout() {
        this.user = null;
        this.profile = null;
        this.reports = [];
        this.showAuth();
        document.getElementById('auth-form').reset();
        document.getElementById('btn-auth-submit').disabled = false;
        document.getElementById('btn-auth-submit').textContent = 'Login';
    },

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        UI.setTheme(this.currentTheme);
        Storage.setTheme(this.currentTheme);
    },

    navigate(view) {
        if (view === 'form') {
            const isEdit = document.getElementById('report-id').value !== '';
            if (!isEdit) {
                this.loadDraft();
                if(document.getElementById('table-target').querySelector('tbody').children.length === 0) {
                     this.addTargetRow();
                }
                if(document.getElementById('table-kendala').querySelector('tbody').children.length === 0) {
                     this.addKendalaRow();
                }
            }
        }
        UI.navigate(view);
        if(view === 'dashboard'){
            this.renderDashboard();
        } else if (view === 'admin' && this.profile && this.profile.role === 'admin') {
            this.loadAdminData();
        }
    },

    // =========================================
    // CRUD LOGIC WITH SUPABASE / FALLBACK
    // =========================================
    async loadReports() {
        if (isSupabaseConfigured) {
            try {
                const { data, error } = await supabaseClient.from('reports')
                    .select('*')
                    .eq('user_id', this.user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.reports = data || [];
                this.renderDashboard();
            } catch (error) {
                UI.showToast('Gagal memuat laporan', 'error');
                console.error(error);
            }
        } else {
            this.reports = Storage.getReportsFallback();
            this.renderDashboard();
        }
    },

    addTargetRow(data = { target: '', pencapaian: '', status: 'Tercapai' }) {
        const tbody = document.querySelector('#table-target tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="target-input" value="${Utils.escapeHTML(data.target)}" placeholder="Target pekerjaan" required aria-label="Target"></td>
            <td><input type="text" class="pencapaian-input" value="${Utils.escapeHTML(data.pencapaian)}" placeholder="Hasil/Pencapaian" required aria-label="Pencapaian"></td>
            <td>
                <select class="status-input" aria-label="Status">
                    <option value="Tercapai" ${data.status === 'Tercapai' ? 'selected' : ''}>Tercapai</option>
                    <option value="Sebagian" ${data.status === 'Sebagian' ? 'selected' : ''}>Sebagian</option>
                    <option value="Tidak Tercapai" ${data.status === 'Tidak Tercapai' ? 'selected' : ''}>Tidak Tercapai</option>
                </select>
            </td>
            <td class="action-col">
                <button type="button" class="btn-icon danger" onclick="this.closest('tr').remove(); app.autoSaveDraft();" aria-label="Hapus Baris">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    addKendalaRow(data = { kendala: '', dampak: '', solusi: '' }) {
        const tbody = document.querySelector('#table-kendala tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="kendala-input" value="${Utils.escapeHTML(data.kendala)}" placeholder="Kendala/Masalah" required aria-label="Kendala"></td>
            <td><input type="text" class="dampak-input" value="${Utils.escapeHTML(data.dampak)}" placeholder="Dampak" required aria-label="Dampak"></td>
            <td><input type="text" class="solusi-input" value="${Utils.escapeHTML(data.solusi)}" placeholder="Solusi/Tindakan" required aria-label="Solusi"></td>
            <td class="action-col">
                <button type="button" class="btn-icon danger" onclick="this.closest('tr').remove(); app.autoSaveDraft();" aria-label="Hapus Baris">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    getFormData() {
        const targets = Array.from(document.querySelectorAll('#table-target tbody tr')).map(row => ({
            target: row.querySelector('.target-input').value,
            pencapaian: row.querySelector('.pencapaian-input').value,
            status: row.querySelector('.status-input').value
        }));

        const kendalas = Array.from(document.querySelectorAll('#table-kendala tbody tr')).map(row => ({
            kendala: row.querySelector('.kendala-input').value,
            dampak: row.querySelector('.dampak-input').value,
            solusi: row.querySelector('.solusi-input').value
        }));

        return {
            id: document.getElementById('report-id').value || null,
            user_id: this.user.id,
            nama: document.getElementById('nama').value,
            posisi: document.getElementById('posisi').value,
            divisi: document.getElementById('divisi').value,
            periode: document.getElementById('periode').value,
            atasan: document.getElementById('atasan').value,
            ringkasan: document.getElementById('ringkasan').value,
            targets,
            tugas_utama: document.getElementById('tugas_utama').value,
            tugas_tambahan: document.getElementById('tugas_tambahan').value,
            keterangan_lain: document.getElementById('keterangan_lain').value,
            pencapaian_utama: document.getElementById('pencapaian_utama').value,
            kendalas,
            eval_kelebihan: document.getElementById('eval_kelebihan').value,
            eval_peningkatan: document.getElementById('eval_peningkatan').value,
            rencana: document.getElementById('rencana').value,
            penutup: document.getElementById('penutup').value
        };
    },

    fillForm(data) {
        if(!data) return;

        const fields = ['nama', 'posisi', 'divisi', 'periode', 'atasan', 'ringkasan',
                       'tugas_utama', 'tugas_tambahan', 'keterangan_lain', 'pencapaian_utama',
                       'eval_kelebihan', 'eval_peningkatan', 'rencana', 'penutup'];

        document.getElementById('report-id').value = data.id || '';
        fields.forEach(field => {
            const el = document.getElementById(field);
            if(el) el.value = data[field] || '';
        });

        const targetBody = document.querySelector('#table-target tbody');
        targetBody.innerHTML = '';
        if (data.targets && data.targets.length > 0) {
            data.targets.forEach(t => this.addTargetRow(t));
        } else {
            this.addTargetRow();
        }

        const kendalaBody = document.querySelector('#table-kendala tbody');
        kendalaBody.innerHTML = '';
        if (data.kendalas && data.kendalas.length > 0) {
            data.kendalas.forEach(k => this.addKendalaRow(k));
        } else {
            this.addKendalaRow();
        }
    },

    resetForm() {
        document.getElementById('report-form').reset();
        document.getElementById('report-id').value = '';
        document.querySelector('#table-target tbody').innerHTML = '';
        document.querySelector('#table-kendala tbody').innerHTML = '';
        this.addTargetRow();
        this.addKendalaRow();
    },

    autoSaveDraft() {
        if (document.getElementById('report-id').value) return;
        const data = this.getFormData();
        if(data.nama || data.periode || data.ringkasan) {
            Storage.saveDraft(data);
        }
    },

    loadDraft() {
        const draft = Storage.getDraft();
        if (draft) {
            this.fillForm(draft);
            UI.showToast('Draft dimuat otomatis', 'success');
        } else {
            this.resetForm();
        }
    },

    async saveReport(event) {
        event.preventDefault();
        const data = this.getFormData();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            if (isSupabaseConfigured) {
                if (data.id) {
                    // Update
                    const { error } = await supabaseClient.from('reports').update(data).eq('id', data.id);
                    if (error) throw error;
                    UI.showToast('Laporan berhasil diperbarui', 'success');
                } else {
                    // Insert
                    delete data.id; // supabase auto generates UUID
                    const { error } = await supabaseClient.from('reports').insert([data]);
                    if (error) throw error;
                    UI.showToast('Laporan baru berhasil disimpan', 'success');
                }
            } else {
                // Fallback LocalStorage
                if (data.id) {
                    const index = this.reports.findIndex(r => r.id === data.id);
                    if (index !== -1) {
                        this.reports[index] = data;
                        UI.showToast('Laporan berhasil diperbarui', 'success');
                    }
                } else {
                    data.id = Utils.generateId();
                    this.reports.unshift(data);
                    UI.showToast('Laporan baru berhasil disimpan', 'success');
                }
                Storage.saveReportsFallback(this.reports);
            }

            Storage.clearDraft();
            this.resetForm();
            await this.loadReports();
            this.navigate('dashboard');
        } catch (error) {
            UI.showToast('Gagal menyimpan laporan: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    },

    editReport(id) {
        const report = this.reports.find(r => r.id === id) || this.allReports.find(r => r.id === id);
        if (report) {
            this.fillForm(report);
            this.navigate('form');
        }
    },

    async deleteReport(id) {
        if (confirm('Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                if (isSupabaseConfigured) {
                    const { error } = await supabaseClient.from('reports').delete().eq('id', id);
                    if (error) throw error;
                } else {
                    this.reports = this.reports.filter(r => r.id !== id);
                    Storage.saveReportsFallback(this.reports);
                }

                UI.showToast('Laporan berhasil dihapus', 'success');
                await this.loadReports();

                // If in admin view, refresh admin data too
                if (document.getElementById('view-admin').classList.contains('active')) {
                    this.loadAdminData();
                }
            } catch (error) {
                UI.showToast('Gagal menghapus laporan', 'error');
            }
        }
    },

    // =========================================
    // DASHBOARD & ADMIN RENDER LOGIC
    // =========================================
    renderDashboard() {
        document.getElementById('stat-total-reports').textContent = this.reports.length;
        document.getElementById('stat-latest-report').textContent =
            this.reports.length > 0 ? Utils.formatMonth(this.reports[0].periode) : '-';

        this.filterReports();
    },

    filterReports() {
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        const filterMonth = document.getElementById('filter-month').value;
        const list = document.getElementById('report-list');
        const emptyState = document.getElementById('empty-state');

        list.innerHTML = '';

        const filtered = this.reports.filter(report => {
            const matchesSearch = report.nama.toLowerCase().includes(searchQuery) ||
                                  Utils.formatMonth(report.periode).toLowerCase().includes(searchQuery);
            const reportMonth = report.periode.split('-')[1];
            const matchesMonth = !filterMonth || reportMonth === filterMonth;

            return matchesSearch && matchesMonth;
        });

        if (filtered.length === 0) {
            list.appendChild(emptyState);
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            filtered.forEach((report, index) => {
                const card = document.createElement('div');
                card.className = 'report-card';
                card.style.animationDelay = `${index * 0.05}s`;
                card.innerHTML = `
                    <div class="report-header">
                        <div class="report-title">Laporan ${Utils.escapeHTML(report.nama.split(' ')[0])}</div>
                        <div class="report-period">${Utils.formatMonth(report.periode)}</div>
                    </div>
                    <div class="report-summary">${Utils.escapeHTML(report.ringkasan)}</div>
                    <div class="report-actions">
                        <button class="btn-icon" title="Edit" onclick="app.editReport('${report.id}')" aria-label="Edit Laporan">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn-icon" title="Print to PDF" onclick="app.printReport('${report.id}')" aria-label="Print Laporan">
                            <i class="ph ph-printer"></i>
                        </button>
                        <button class="btn-icon" title="Export DOCX" onclick="app.exportWord('${report.id}')" aria-label="Export DOCX">
                            <i class="ph ph-file-doc"></i>
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn-icon danger" title="Hapus" onclick="app.deleteReport('${report.id}')" aria-label="Hapus Laporan">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                `;
                list.appendChild(card);
            });
        }
    },

    async loadAdminData() {
        if (!isSupabaseConfigured) {
            // Mock data for fallback mode
            document.getElementById('admin-total-users').textContent = "1";
            const userBody = document.querySelector('#table-users tbody');
            userBody.innerHTML = `<tr><td>Local User</td><td>local@example.com</td><td><span style="padding: 4px 8px; border-radius: 4px; background: var(--primary-light); color: var(--primary-color); font-size: 0.8rem; font-weight: 600;">admin</span></td><td>-</td></tr>`;

            document.getElementById('admin-total-reports').textContent = this.reports.length;
            this.allReports = this.reports;
            const repBody = document.querySelector('#table-all-reports tbody');
            repBody.innerHTML = '';
            this.reports.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${Utils.escapeHTML(r.nama)}</td>
                    <td>${Utils.formatMonth(r.periode)}</td>
                    <td><div style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHTML(r.ringkasan)}</div></td>
                    <td class="action-col">
                         <button class="btn-icon" style="display:inline-flex; padding: 4px;" title="Lihat/Edit" onclick="app.editReport('${r.id}')"><i class="ph ph-eye"></i></button>
                    </td>
                `;
                repBody.appendChild(tr);
            });
            return;
        }

        try {
            // Fetch Users
            const { data: users, error: errUser } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
            if (errUser) throw errUser;
            this.allUsers = users;
            document.getElementById('admin-total-users').textContent = users.length;

            const userBody = document.querySelector('#table-users tbody');
            userBody.innerHTML = '';
            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${Utils.escapeHTML(u.full_name || '-')}</td>
                    <td>${Utils.escapeHTML(u.email || '-')}</td>
                    <td><span style="padding: 4px 8px; border-radius: 4px; background: ${u.role === 'admin' ? 'var(--primary-light)' : 'var(--bg-element)'}; color: ${u.role === 'admin' ? 'var(--primary-color)' : 'var(--text-secondary)'}; font-size: 0.8rem; font-weight: 600;">${u.role}</span></td>
                    <td class="action-col">
                        <select onchange="app.changeUserRole('${u.id}', this.value)" style="padding: 4px; border-radius: 4px;">
                            <option value="writer" ${u.role === 'writer' ? 'selected' : ''}>Writer</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                `;
                userBody.appendChild(tr);
            });

            // Fetch All Reports
            const { data: reports, error: errRep } = await supabaseClient.from('reports').select('*, profiles(full_name)').order('created_at', { ascending: false });
            if (errRep) throw errRep;
            this.allReports = reports;
            document.getElementById('admin-total-reports').textContent = reports.length;

            const repBody = document.querySelector('#table-all-reports tbody');
            repBody.innerHTML = '';
            reports.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${Utils.escapeHTML(r.nama)}</td>
                    <td>${Utils.formatMonth(r.periode)}</td>
                    <td><div style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHTML(r.ringkasan)}</div></td>
                    <td class="action-col">
                         <button class="btn-icon" style="display:inline-flex; padding: 4px;" title="Lihat/Edit" onclick="app.editReport('${r.id}')"><i class="ph ph-eye"></i></button>
                    </td>
                `;
                repBody.appendChild(tr);
            });

        } catch (error) {
            UI.showToast('Gagal memuat data admin', 'error');
        }
    },

    async changeUserRole(userId, newRole) {
        if(userId === this.user.id) {
            UI.showToast('Tidak bisa mengubah role Anda sendiri', 'error');
            this.loadAdminData(); // reset select
            return;
        }

        try {
            const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
            if(error) throw error;
            UI.showToast('Role berhasil diubah', 'success');
            this.loadAdminData();
        } catch(error) {
            UI.showToast('Gagal mengubah role', 'error');
        }
    },

    // =========================================
    // EXPORT AND PRINT LOGIC
    // =========================================
    generateHTMLContent(report) {
        const buildRows = (items, cols) => items.map(item =>
            `<tr>${cols.map(col => `<td>${Utils.escapeHTML(item[col] || '')}</td>`).join('')}</tr>`
        ).join('');

        const targetsHTML = buildRows(report.targets, ['target', 'pencapaian', 'status']);
        const kendalaHTML = buildRows(report.kendalas, ['kendala', 'dampak', 'solusi']);

        return `
            <div class="print-doc">
                <h1>Laporan Bulanan Kinerja</h1>
                <h2>1. Identitas</h2>
                <table>
                    <tr><th width="30%">Nama</th><td>${Utils.escapeHTML(report.nama)}</td></tr>
                    <tr><th>Posisi</th><td>${Utils.escapeHTML(report.posisi)}</td></tr>
                    <tr><th>Divisi</th><td>${Utils.escapeHTML(report.divisi)}</td></tr>
                    <tr><th>Periode</th><td>${Utils.formatMonth(report.periode)}</td></tr>
                    <tr><th>Atasan</th><td>${Utils.escapeHTML(report.atasan)}</td></tr>
                </table>

                <h2>2. Ringkasan Pekerjaan</h2>
                <p>${Utils.formatTextForHTML(report.ringkasan)}</p>

                <h2>3. Target dan Pencapaian</h2>
                <table>
                    <thead><tr><th>Target</th><th>Pencapaian</th><th>Status</th></tr></thead>
                    <tbody>${targetsHTML}</tbody>
                </table>

                <h2>4. Uraian Tugas & Kegiatan</h2>
                <p><strong>Pelaksanaan Tugas Utama:</strong><br>${Utils.formatTextForHTML(report.tugas_utama)}</p>
                <p><strong>Pelaksanaan Tugas Tambahan / Khusus:</strong><br>${Utils.formatTextForHTML(report.tugas_tambahan)}</p>
                <p><strong>Keterangan / Laporan Tambahan:</strong><br>${Utils.formatTextForHTML(report.keterangan_lain)}</p>

                <h2>5. Pencapaian Utama</h2>
                <p>${Utils.formatTextForHTML(report.pencapaian_utama)}</p>

                <h2>6. Kendala dan Solusi</h2>
                <table>
                    <thead><tr><th>Kendala</th><th>Dampak</th><th>Solusi</th></tr></thead>
                    <tbody>${kendalaHTML}</tbody>
                </table>

                <h2>7. Evaluasi Diri</h2>
                <p><strong>Kelebihan / Hal baik:</strong><br>${Utils.formatTextForHTML(report.eval_kelebihan)}</p>
                <p><strong>Hal yang perlu ditingkatkan:</strong><br>${Utils.formatTextForHTML(report.eval_peningkatan)}</p>

                <h2>8. Rencana Pengembangan</h2>
                <p>${Utils.formatTextForHTML(report.rencana)}</p>

                <h2>9. Penutup</h2>
                <p>${Utils.formatTextForHTML(report.penutup)}</p>
            </div>
        `;
    },

    printReport(id) {
        const report = this.reports.find(r => r.id === id) || this.allReports.find(r => r.id === id);
        if (!report) return;

        const printTemplate = document.getElementById('print-template');
        printTemplate.innerHTML = this.generateHTMLContent(report);

        window.print();
        setTimeout(() => printTemplate.innerHTML = '', 1000);
    },

    exportWord(id) {
        const report = this.reports.find(r => r.id === id) || this.allReports.find(r => r.id === id);
        if (!report) return;

        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Export HTML to Word</title>
        <style>
            body { font-family: 'Times New Roman', serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            h1 { text-align: center; font-size: 18pt; margin-bottom: 24px; }
            h2 { font-size: 14pt; border-bottom: 1px solid black; margin-top: 20px; padding-bottom: 4px; }
            p { margin-bottom: 12px; line-height: 1.5; }
        </style>
        </head><body>`;
        const footer = "</body></html>";
        const content = this.generateHTMLContent(report);
        const sourceHTML = header + content + footer;

        try {
            const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
            const fileName = `Laporan_Bulanan_${report.nama.replace(/\s+/g, '_')}_${report.periode}.doc`;

            saveAs(blob, fileName);
            UI.showToast('Laporan berhasil di-export ke DOC', 'success');
        } catch (e) {
            console.error("Export failed", e);
            UI.showToast('Gagal melakukan export dokumen', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
