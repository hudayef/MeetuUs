/**
 * Laporan Bulanan Content Writer
 * Main Application Logic - Modular & Optimized with Supabase
 */

// =========================================
// SUPABASE CONFIGURATION
// =========================================
// GANTI VALUE DI BAWAH INI DENGAN PROJECT URL & ANON KEY DARI SUPABASE ANDA
const SUPABASE_URL = 'https://qkrftwehwwzwxajuurpk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ELyphZsBinKDKyH6hD5ORg_YARPwtO7';

// Initialize Supabase Client
let supabaseClient = null;
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase SDK is not loaded.");
    }
} catch (e) {
    console.error("Supabase initialization error:", e);
}

const Storage = {
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
    }
};

const Utils = {
    withTimeout(promise, ms = 10000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error("Request timeout (terlalu lama)"));
            }, ms);
            promise.then(value => {
                clearTimeout(timer);
                resolve(value);
            }).catch(reason => {
                clearTimeout(timer);
                reject(reason);
            });
        });
    },
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
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
            if (toast) toast.style.animation = 'slideOut 0.4s var(--transition-bounce) forwards';
            setTimeout(() => { if (toast) toast.remove(); }, 400);
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
        let targetId = 'view-dashboard';
        if (view === 'form') targetId = 'view-form';
        if (view === 'admin') targetId = 'view-admin';
        if (view === 'requests') targetId = 'view-requests';

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

        const pt = document.getElementById('page-title');
        if (view === 'dashboard') {
            const navDash = document.getElementById('nav-dashboard');
            if(navDash) navDash.classList.add('active');
            if(pt) pt.textContent = 'Dashboard';
            const btnCreate = document.getElementById('btn-header-create');
            if(btnCreate) btnCreate.style.display = 'inline-flex';
        } else if (view === 'form') {
            const navCreate = document.getElementById('nav-create');
            if(navCreate) navCreate.classList.add('active');
            const rid = document.getElementById('report-id');
            const isEdit = rid ? rid.value !== '' : false;
            if(pt) pt.textContent = isEdit ? 'Edit Laporan' : 'Buat Laporan Baru';
            const btnCreate = document.getElementById('btn-header-create');
            if(btnCreate) btnCreate.style.display = 'none';
        } else if (view === 'admin') {
            const navAdmin = document.getElementById('nav-admin');
            if(navAdmin) navAdmin.classList.add('active');
            if(pt) pt.textContent = 'Admin Dashboard';
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

        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized.");

            // Check Auth Session
            const { data: { session } } = await Utils.withTimeout(supabaseClient.auth.getSession(), 10000);
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
        } catch (error) {
            console.error("Supabase initialization error:", error);
            this.showAuth();
            UI.showToast('Gagal terhubung ke server', 'error');
        }
    },

    setupListeners() {
        const form = document.getElementById('report-form');
        if (form) {
            form.addEventListener('input', this.debounce(() => this.autoSaveDraft(), 500));
        }
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
        const overlay = document.getElementById('auth-overlay');
        const container = document.getElementById('app-main-container');
        if (overlay) overlay.style.display = 'flex';
        if (container) container.style.display = 'none';
    },

    hideAuth() {
        const overlay = document.getElementById('auth-overlay');
        const container = document.getElementById('app-main-container');
        if (overlay) overlay.style.display = 'none';
        if (container) container.style.display = 'flex';
    },

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        const grp = document.getElementById('group-fullname');
        if (grp) grp.style.display = this.isLoginMode ? 'none' : 'flex';
        document.getElementById('btn-auth-submit').textContent = this.isLoginMode ? 'Login' : 'Daftar';
        document.getElementById('auth-subtitle').textContent = this.isLoginMode ? 'Login untuk mengakses dashboard Anda' : 'Buat akun baru untuk mulai membuat laporan';
        document.getElementById('auth-toggle-text').innerHTML = this.isLoginMode ?
            'Belum punya akun? <a href="#" onclick="app.toggleAuthMode()">Daftar di sini</a>' :
            'Sudah punya akun? <a href="#" onclick="app.toggleAuthMode()">Login di sini</a>';
    },

    async handleAuth(e) {
        e.preventDefault();

        const emailEl = document.getElementById('auth-email');
        const passwordEl = document.getElementById('auth-password');
        const fullNameEl = document.getElementById('auth-fullname');
        const btn = document.getElementById('btn-auth-submit');

        if (!emailEl || !passwordEl) return;

        const email = emailEl.value;
        const password = passwordEl.value;
        const fullName = fullNameEl ? fullNameEl.value || email.split('@')[0] : email.split('@')[0];

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Memproses...';
        }

        try {
            if (!supabaseClient) throw new Error("Supabase SDK is not initialized");
            if (this.isLoginMode) {
                const { data, error } = await Utils.withTimeout(supabaseClient.auth.signInWithPassword({ email, password }), 15000);
                if (error) throw error;
                UI.showToast('Login berhasil', 'success');
                // handleUserLogin will be called by onAuthStateChange
            } else {
                const { data, error } = await Utils.withTimeout(supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                }), 15000);
                if (error) throw error;

                if (data?.user?.identities?.length === 0) {
                     UI.showToast('Email sudah terdaftar. Silakan login.', 'error');
                     btn.disabled = false;
                     btn.textContent = 'Daftar';
                     return;
                }

                UI.showToast('Pendaftaran berhasil. Silakan login.', 'success');
                if(!data.session) {
                    this.toggleAuthMode(); // Wait for email confirmation if enabled
                    btn.disabled = false;
                    btn.textContent = 'Login';
                }
                // If data.session exists, handleUserLogin will be called by onAuthStateChange
            }
        } catch (error) {
            UI.showToast(error.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = this.isLoginMode ? 'Login' : 'Daftar';
            }
        }
    },

    async handleUserLogin(user) {
        this.user = user;
        this.hideAuth();

        // Fetch User Profile (Role)
        let profile = null;
        try {
            const { data, error } = await supabaseClient.from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            profile = data;
        } catch (error) {
            console.warn("Could not fetch profile, falling back locally", error);
            profile = { full_name: user.email || 'Local Mode', role: 'admin' };
        }

        if (profile) {
            this.profile = profile;
            document.getElementById('display-user-name').textContent = profile.full_name || user.email;
            document.getElementById('display-user-role').textContent = profile.role;

            // Show Admin Menu if admin
            const navAdmin = document.getElementById('nav-admin');
            const navReq = document.getElementById('nav-requests');
            if (profile.role === 'admin') {
                if (navAdmin) navAdmin.style.display = 'flex';
                if (navReq) navReq.style.display = 'none';
            } else {
                if (navAdmin) navAdmin.style.display = 'none';
                if (navReq) navReq.style.display = 'flex';
            }
        }

        await this.loadReports();
        this.navigate('dashboard');
    },

    async logout() {
        try {
            if (supabaseClient) await supabaseClient.auth.signOut();
        } catch (error) {
            console.error("Logout error", error);
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
            const idEl = document.getElementById('report-id');
            const isEdit = idEl ? idEl.value !== '' : false;
            if (!isEdit) {
                this.loadDraft();
                const tableTarget = document.getElementById('table-target');
                if(tableTarget && tableTarget.querySelector('tbody').children.length === 0) {
                     this.addTargetRow();
                }
                const tableKendala = document.getElementById('table-kendala');
                if(tableKendala && tableKendala.querySelector('tbody').children.length === 0) {
                     this.addKendalaRow();
                }
            }
        }
        UI.navigate(view);
        if(view === 'dashboard'){
            this.renderDashboard();
        } else if (view === 'admin' && this.profile && this.profile.role === 'admin') {
            this.loadAdminData();
            if (this.loadAdminRequests) this.loadAdminRequests();
        } else if (view === 'requests') {
            if (this.loadRequests) this.loadRequests();
        }
    },

    // =========================================
    // CRUD LOGIC WITH SUPABASE / FALLBACK
    // =========================================
    async loadReports() {
        try {
            if (!this.user || !this.user.id || !supabaseClient) {
                 this.reports = [];
                 this.renderDashboard();
                 return;
            }
            const { data, error } = await Utils.withTimeout(supabaseClient.from('reports')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false }), 10000);

            if (error) throw error;
            this.reports = data || [];
            this.renderDashboard();
        } catch (error) {
            this.reports = [];
            this.renderDashboard();
            UI.showToast('Gagal memuat laporan', 'error');
            console.error(error);
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

        const originalUserId = document.getElementById('report-user-id') ? document.getElementById('report-user-id').value : null;

        return {
            id: document.getElementById('report-id').value || null,
            user_id: originalUserId || (this.user ? this.user.id : null),
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
        if (document.getElementById('report-user-id')) {
            document.getElementById('report-user-id').value = data.user_id || '';
        }
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

    startNewReport() {
        this.resetForm();
        this.navigate('form');
    },

    resetForm() {
        const rf = document.getElementById('report-form');
        if(rf) rf.reset();
        const ri = document.getElementById('report-id');
        if(ri) ri.value = '';
        const tbTarget = document.querySelector('#table-target tbody');
        if(tbTarget) tbTarget.innerHTML = '';
        const tbKendala = document.querySelector('#table-kendala tbody');
        if(tbKendala) tbKendala.innerHTML = '';
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
        const submitBtn = event.submitter || (event.target && event.target.querySelector ? event.target.querySelector('button[type="submit"]') : document.querySelector('#report-form button[type="submit"]'));
        if(submitBtn) submitBtn.disabled = true;

        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");

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

            Storage.clearDraft();
            this.resetForm();
            await this.loadReports();
            this.navigate('dashboard');
        } catch (error) {
            UI.showToast('Gagal menyimpan laporan: ' + error.message, 'error');
        } finally {
            if(submitBtn) submitBtn.disabled = false;
        }
    },

    editReport(id) {
        const report = this.reports.find(r => r.id === id) || this.allReports.find(r => r.id === id);
        if (report) {
            this.fillForm(report);
            this.navigate('form');
        }
    },

    viewReportDetail(id) {
        const report = this.reports.find(r => r.id === id) || this.allReports.find(r => r.id === id);
        if (!report) return;

        document.getElementById('detail-report-nama').textContent = report.nama ? ` - ${report.nama.split(' ')[0]}` : '';
        document.getElementById('detail-report-posisi').textContent = report.posisi || '-';
        document.getElementById('detail-report-divisi').textContent = report.divisi || '-';
        document.getElementById('detail-report-periode').textContent = report.periode ? Utils.formatMonth(report.periode) : '-';

        document.getElementById('detail-report-ringkasan').textContent = report.ringkasan || 'Tidak ada ringkasan.';
        document.getElementById('detail-report-tugas').textContent = report.tugas_utama || 'Tidak ada uraian tugas.';
        document.getElementById('detail-report-kelebihan').textContent = report.eval_kelebihan || '-';
        document.getElementById('detail-report-peningkatan').textContent = report.eval_peningkatan || '-';

        const modal = document.getElementById('report-detail-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeReportDetailModal() {
        const modal = document.getElementById('report-detail-modal');
        if (modal) modal.style.display = 'none';
    },

    async deleteReport(id) {
        if (confirm('Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                if (!supabaseClient) throw new Error("Supabase is not initialized");
                const { error } = await supabaseClient.from('reports').delete().eq('id', id);
                if (error) throw error;

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
            const safeNama = (report.nama || '').toLowerCase();
            const safePeriode = report.periode || '';
            const matchesSearch = safeNama.includes(searchQuery) ||
                                  Utils.formatMonth(safePeriode).toLowerCase().includes(searchQuery);
            const reportMonth = safePeriode ? safePeriode.split('-')[1] : '';
            const matchesMonth = !filterMonth || reportMonth === filterMonth;

            return matchesSearch && matchesMonth;
        });

        if (filtered.length === 0) {
            if (list) list.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (list) list.style.display = 'grid'; // Maintain grid layout defined in CSS
            filtered.forEach((report, index) => {
                const card = document.createElement('div');
                card.className = 'report-card';
                card.style.animationDelay = `${index * 0.05}s`;

                const safeNamaDisplay = report.nama ? Utils.escapeHTML(report.nama.split(' ')[0]) : 'Tanpa Nama';
                const safePeriodeDisplay = report.periode ? Utils.formatMonth(report.periode) : '-';
                const safeRingkasan = report.ringkasan ? Utils.escapeHTML(report.ringkasan) : '';

                card.innerHTML = `
                    <div class="report-header">
                        <div class="report-title">Laporan ${safeNamaDisplay}</div>
                        <div class="report-period">${safePeriodeDisplay}</div>
                    </div>
                    <div class="report-summary">${safeRingkasan}</div>
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
        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");
            // Fetch Users
            const { data: users, error: errUser } = await Utils.withTimeout(supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }), 10000);
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
            const { data: reports, error: errRep } = await Utils.withTimeout(supabaseClient.from('reports').select('*').order('created_at', { ascending: false }), 10000);
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
                         <button class="btn-icon" style="display:inline-flex; padding: 4px;" title="Lihat Detail" onclick="app.viewReportDetail('${r.id}')"><i class="ph ph-eye"></i></button>
                    </td>
                `;
                repBody.appendChild(tr);
            });

        } catch (error) {
            this.allUsers = [];
            this.allReports = [];
            console.error(error);
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

// =========================================
// REQUEST LOGIC (ADMIN & WRITER)
// =========================================

Object.assign(app, {
    async saveRequest(event) {
        event.preventDefault();
        const btn = event.submitter || document.querySelector('#request-form button[type="submit"]');
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = 'Menyimpan...';
        }

        const id = document.getElementById('req-id') ? document.getElementById('req-id').value : '';
        const form = document.getElementById('request-form');

        const newRequest = {
            judul: document.getElementById('req-judul').value,
            tujuan: document.getElementById('req-tujuan').value,
            batas_waktu: document.getElementById('req-batas').value,
            deskripsi: document.getElementById('req-deskripsi').value,
            status: 'Pending', // default status matching SQL CHECK constraint
            admin_id: (this.profile && this.profile.id) ? this.profile.id : (this.user ? this.user.id : null)
        };

        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");

            if (id) {
                const { error } = await supabaseClient.from('requests').update(newRequest).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('requests').insert([newRequest]);
                if (error) throw error;
            }
            UI.showToast('Request berhasil disimpan', 'success');

            form.reset();
            if(document.getElementById('req-id')) {
                document.getElementById('req-id').value = '';
            }

            // Reload requests
            this.loadAdminRequests();
            this.loadRequests();

        } catch (error) {
            UI.showToast('Gagal menyimpan request', 'error');
            console.error(error);
        } finally {
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Kirim Request';
            }
        }
    },

    async loadAdminRequests() {
        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");
            const { data, error } = await supabaseClient.from('requests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            this.renderAdminRequests(data);
        } catch (error) {
            console.error('Error loading admin requests:', error);
        }
    },

    renderAdminRequests(requests) {
        const container = document.getElementById('admin-request-list');
        if (!container) return;

        container.innerHTML = '';
        if (!requests || requests.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada request.</div>';
            return;
        }

        requests.forEach(req => {
            const el = document.createElement('div');
            el.className = 'report-card';
            const statusColor = req.status === 'Accepted' ? 'var(--success-color)' : req.status === 'Rejected' ? 'var(--error-color)' : 'var(--warning-color)';
            el.innerHTML = `
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                    <div>
                        <h4 style="margin-bottom: 4px;">${Utils.escapeHTML(req.judul)}</h4>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
                            Tujuan: ${Utils.escapeHTML(req.tujuan)} | Deadline: ${Utils.formatDate(req.batas_waktu)}
                        </div>
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; border: 1px solid ${statusColor}; color: ${statusColor};">${req.status.toUpperCase()}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon" title="Lihat" onclick="app.openRequestModal('${req.id}', true)"><i class="ph ph-eye"></i></button>
                        <button class="btn-icon" style="color: var(--error-color)" title="Hapus" onclick="app.deleteRequest('${req.id}')"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    },

    async loadRequests() {
        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");
            const { data, error } = await supabaseClient.from('requests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            this.renderRequests(data);
        } catch(error) {
            console.error('Error loading requests:', error);
        }
    },

    renderRequests(requests) {
        const container = document.getElementById('request-list');
        if (!container) return;

        container.innerHTML = '';
        if (!requests || requests.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada request tugas.</div>';
            return;
        }

        requests.forEach(req => {
            const el = document.createElement('div');
            el.className = 'report-card';
            const statusColor = req.status === 'Accepted' ? 'var(--success-color)' : req.status === 'Rejected' ? 'var(--error-color)' : 'var(--warning-color)';
            el.innerHTML = `
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                    <div>
                        <h4 style="margin-bottom: 4px;">${Utils.escapeHTML(req.judul)}</h4>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
                            Tujuan: ${Utils.escapeHTML(req.tujuan)} | Deadline: ${Utils.formatDate(req.batas_waktu)}
                        </div>
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; border: 1px solid ${statusColor}; color: ${statusColor};">${req.status.toUpperCase()}</span>
                    </div>
                    <button class="btn-primary" style="padding: 8px 16px; font-size: 0.9rem;" onclick="app.openRequestModal('${req.id}', false)">Lihat Detail</button>
                </div>
            `;
            container.appendChild(el);
        });
    },

    async openRequestModal(id, isAdminView = false) {
        if (!supabaseClient) return;
        let req;
        const { data } = await supabaseClient.from('requests').select('*').eq('id', id).single();
        req = data;

        if(!req) return;

        document.getElementById('modal-req-judul').textContent = req.judul;
        document.getElementById('modal-req-tujuan').textContent = req.tujuan;
        document.getElementById('modal-req-batas').textContent = Utils.formatDate(req.batas_waktu);
        document.getElementById('modal-req-deskripsi').textContent = req.deskripsi;

        // Removed status logic from modal since it isn't defined in the HTML structure
        const actionArea = document.getElementById('modal-req-actions');
        if (actionArea) {
            if (isAdminView) {
                actionArea.style.display = 'none'; // Admins don't accept/reject their own requests in this view
            } else {
                actionArea.style.display = req.status === 'Pending' ? 'flex' : 'none';
                if (req.status === 'Pending') {
                actionArea.innerHTML = `
                    <button class="btn-secondary" style="color: var(--error-color); border-color: var(--error-color);" onclick="app.updateRequestStatus('${req.id}', 'Rejected')">Tolak Tugas</button>
                    <button class="btn-primary" onclick="app.updateRequestStatus('${req.id}', 'Accepted')">Terima Tugas</button>
                `;
                }
            }
        }

        const modal = document.getElementById('request-modal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    },

    closeRequestModal() {
        const modal = document.getElementById('request-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    async updateRequestStatus(id, newStatus) {
        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");
            const { error } = await supabaseClient.from('requests').update({ status: newStatus }).eq('id', id);
            if (error) throw error;

            UI.showToast(`Request ${newStatus === 'Accepted' ? 'diterima' : 'ditolak'}`, 'success');
            this.closeRequestModal();
            this.loadRequests(); // Update writer view
        } catch(error) {
            UI.showToast('Gagal update status request', 'error');
        }
    },

    async deleteRequest(id) {
        if (!confirm('Hapus request ini?')) return;
        try {
            if (!supabaseClient) throw new Error("Supabase is not initialized");
            const { error } = await supabaseClient.from('requests').delete().eq('id', id);
            if (error) throw error;

            UI.showToast('Request dihapus', 'success');
            this.loadAdminRequests();
        } catch(error) {
            UI.showToast('Gagal menghapus request', 'error');
        }
    }
});
