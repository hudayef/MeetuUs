/**
 * Laporan Bulanan Content Writer
 * Main Application Logic - Modular & Optimized (2026 SaaS Standard)
 */

const Storage = {
    REPORTS_KEY: 'cw_reports_v2',
    DRAFT_KEY: 'cw_draft_v2',
    THEME_KEY: 'cw_theme_v2',

    getReports() {
        try {
            const data = localStorage.getItem(this.REPORTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to parse reports from localStorage", e);
            return [];
        }
    },

    saveReports(reports) {
        localStorage.setItem(this.REPORTS_KEY, JSON.stringify(reports));
    },

    saveDraft(data) {
        localStorage.setItem(this.DRAFT_KEY, JSON.stringify(data));
    },

    getDraft() {
        try {
            const draft = localStorage.getItem(this.DRAFT_KEY);
            return draft ? JSON.parse(draft) : null;
        } catch (e) {
            console.error("Failed to parse draft from localStorage", e);
            return null;
        }
    },

    clearDraft() {
        localStorage.removeItem(this.DRAFT_KEY);
    },

    getTheme() {
        return localStorage.getItem(this.THEME_KEY) || 'light';
    },

    setTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
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
        const toggleBtn = document.getElementById('theme-toggle');
        if(theme === 'dark') {
            toggleBtn.innerHTML = '<i class="ph ph-sun"></i><span>Light Mode</span>';
        } else {
            toggleBtn.innerHTML = '<i class="ph ph-moon"></i><span>Dark Mode</span>';
        }
    },

    navigate(view) {
        const targetId = view === 'dashboard' ? 'view-dashboard' : 'view-form';

        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => {
            if (el.id !== targetId) {
                el.classList.remove('active');
                setTimeout(() => el.style.display = 'none', 300); // Wait for fade out
            }
        });

        // Update nav links
        document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));

        setTimeout(() => {
            if (view === 'dashboard') {
                const dashboardView = document.getElementById('view-dashboard');
                dashboardView.style.display = 'block';
                // Trigger reflow for animation
                void dashboardView.offsetWidth;
                dashboardView.classList.add('active');

                document.getElementById('nav-dashboard').classList.add('active');
                document.getElementById('page-title').textContent = 'Dashboard';
                document.getElementById('btn-header-create').style.display = 'inline-flex';
            } else if (view === 'form') {
                const formView = document.getElementById('view-form');
                formView.style.display = 'block';
                // Trigger reflow for animation
                void formView.offsetWidth;
                formView.classList.add('active');

                document.getElementById('nav-create').classList.add('active');

                const isEdit = document.getElementById('report-id').value !== '';
                document.getElementById('page-title').textContent = isEdit ? 'Edit Laporan' : 'Buat Laporan Baru';
                document.getElementById('btn-header-create').style.display = 'none';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 30);
    }
};

const app = {
    reports: [],
    currentTheme: 'light',

    init() {
        this.reports = Storage.getReports();
        this.currentTheme = Storage.getTheme();

        UI.setTheme(this.currentTheme);
        this.renderDashboard();
        UI.navigate('dashboard');

        // Setup Event Listeners
        this.setupListeners();
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
        }
    },

    // =========================================
    // Dynamic Form Logic
    // =========================================
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
            id: document.getElementById('report-id').value,
            nama: document.getElementById('nama').value,
            posisi: document.getElementById('posisi').value,
            divisi: document.getElementById('divisi').value,
            periode: document.getElementById('periode').value,
            atasan: document.getElementById('atasan').value,
            ringkasan: document.getElementById('ringkasan').value,
            targets,
            detail_website: document.getElementById('detail_website').value,
            detail_socmed: document.getElementById('detail_socmed').value,
            detail_riset: document.getElementById('detail_riset').value,
            pencapaian_utama: document.getElementById('pencapaian_utama').value,
            kendalas,
            eval_kelebihan: document.getElementById('eval_kelebihan').value,
            eval_peningkatan: document.getElementById('eval_peningkatan').value,
            rencana: document.getElementById('rencana').value,
            penutup: document.getElementById('penutup').value,
            timestamp: new Date().toISOString()
        };
    },

    fillForm(data) {
        if(!data) return;

        const fields = ['report-id', 'nama', 'posisi', 'divisi', 'periode', 'atasan', 'ringkasan',
                       'detail_website', 'detail_socmed', 'detail_riset', 'pencapaian_utama',
                       'eval_kelebihan', 'eval_peningkatan', 'rencana', 'penutup'];

        fields.forEach(field => {
            const el = document.getElementById(field);
            if(el) {
                // map report-id to id
                const dataKey = field === 'report-id' ? 'id' : field;
                el.value = data[dataKey] || '';
            }
        });

        // Fill Tables
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
        // Don't auto-save if editing an existing report
        if (document.getElementById('report-id').value) return;

        const data = this.getFormData();
        // Check if there's actual data to save
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

    saveReport(event) {
        event.preventDefault();
        const data = this.getFormData();

        if (data.id) {
            // Update
            const index = this.reports.findIndex(r => r.id === data.id);
            if (index !== -1) {
                this.reports[index] = data;
                UI.showToast('Laporan berhasil diperbarui', 'success');
            }
        } else {
            // Create
            data.id = Utils.generateId();
            this.reports.unshift(data);
            UI.showToast('Laporan baru berhasil disimpan', 'success');
        }

        Storage.saveReports(this.reports);
        Storage.clearDraft();
        this.resetForm();
        this.navigate('dashboard');
    },

    editReport(id) {
        const report = this.reports.find(r => r.id === id);
        if (report) {
            this.fillForm(report);
            this.navigate('form');
        }
    },

    deleteReport(id) {
        if (confirm('Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) {
            this.reports = this.reports.filter(r => r.id !== id);
            Storage.saveReports(this.reports);
            this.renderDashboard();
            UI.showToast('Laporan berhasil dihapus', 'success');
        }
    },

    // =========================================
    // Dashboard Rendering
    // =========================================
    renderDashboard() {
        // Update Stats
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

    // =========================================
    // Export and Print
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

                <h2>4. Detail Pekerjaan</h2>
                <p><strong>Content Website:</strong><br>${Utils.formatTextForHTML(report.detail_website)}</p>
                <p><strong>Media Sosial:</strong><br>${Utils.formatTextForHTML(report.detail_socmed)}</p>
                <p><strong>Riset dan Analisis:</strong><br>${Utils.formatTextForHTML(report.detail_riset)}</p>

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
        const report = this.reports.find(r => r.id === id);
        if (!report) return;

        const printTemplate = document.getElementById('print-template');
        printTemplate.innerHTML = this.generateHTMLContent(report);

        window.print();
        setTimeout(() => printTemplate.innerHTML = '', 1000);
    },

    exportWord(id) {
        const report = this.reports.find(r => r.id === id);
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

            // Using FileSaver.js which is included in index.html
            saveAs(blob, fileName);
            UI.showToast('Laporan berhasil di-export ke DOC', 'success');
        } catch (e) {
            console.error("Export failed", e);
            UI.showToast('Gagal melakukan export dokumen', 'error');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
