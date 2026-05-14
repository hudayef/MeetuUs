/**
 * Laporan Bulanan Content Writer
 * Main Application Logic
 */

const app = {
    reports: [],
    currentTheme: 'light',

    init() {
        this.loadTheme();
        this.loadReports();
        this.renderDashboard();
        this.navigate('dashboard');

        // Auto-save listener
        const form = document.getElementById('report-form');
        form.addEventListener('input', () => this.autoSaveDraft());
    },

    // =========================================
    // State Management (LocalStorage)
    // =========================================
    loadReports() {
        const data = localStorage.getItem('cw_reports');
        if (data) {
            this.reports = JSON.parse(data);
        }
    },

    saveReports() {
        localStorage.setItem('cw_reports', JSON.stringify(this.reports));
        this.renderDashboard();
    },

    autoSaveDraft() {
        const formData = this.getFormData();
        localStorage.setItem('cw_draft', JSON.stringify(formData));
    },

    loadDraft() {
        const draft = localStorage.getItem('cw_draft');
        if (draft) {
            this.fillForm(JSON.parse(draft));
            this.showToast('Draft dimuat otomatis', 'success');
        } else {
            this.resetForm();
        }
    },

    clearDraft() {
        localStorage.removeItem('cw_draft');
    },

    // =========================================
    // Theming
    // =========================================
    loadTheme() {
        const theme = localStorage.getItem('cw_theme') || 'light';
        this.setTheme(theme);
    },

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('cw_theme', theme);

        const toggleBtn = document.getElementById('theme-toggle');
        if(theme === 'dark') {
            toggleBtn.innerHTML = '<i class="ph ph-sun"></i><span>Light Mode</span>';
        } else {
            toggleBtn.innerHTML = '<i class="ph ph-moon"></i><span>Dark Mode</span>';
        }
    },

    // =========================================
    // UI Routing
    // =========================================
    navigate(view) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

        // Update nav links
        document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));

        if (view === 'dashboard') {
            document.getElementById('view-dashboard').classList.add('active');
            document.getElementById('nav-dashboard').classList.add('active');
            document.getElementById('page-title').textContent = 'Dashboard';
            document.getElementById('btn-header-create').style.display = 'inline-flex';
            this.renderDashboard();
        } else if (view === 'form') {
            document.getElementById('view-form').classList.add('active');
            document.getElementById('nav-create').classList.add('active');

            const isEdit = document.getElementById('report-id').value !== '';
            document.getElementById('page-title').textContent = isEdit ? 'Edit Laporan' : 'Buat Laporan Baru';
            document.getElementById('btn-header-create').style.display = 'none';

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
    },

    // =========================================
    // Dynamic Form Logic
    // =========================================
    addTargetRow(data = { target: '', pencapaian: '', status: 'Tercapai' }) {
        const tbody = document.querySelector('#table-target tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="target-input" value="${data.target}" placeholder="Target pekerjaan" required></td>
            <td><input type="text" class="pencapaian-input" value="${data.pencapaian}" placeholder="Hasil/Pencapaian" required></td>
            <td>
                <select class="status-input">
                    <option value="Tercapai" ${data.status === 'Tercapai' ? 'selected' : ''}>Tercapai</option>
                    <option value="Sebagian" ${data.status === 'Sebagian' ? 'selected' : ''}>Sebagian</option>
                    <option value="Tidak Tercapai" ${data.status === 'Tidak Tercapai' ? 'selected' : ''}>Tidak Tercapai</option>
                </select>
            </td>
            <td class="action-col">
                <button type="button" class="btn-icon danger" onclick="this.closest('tr').remove(); app.autoSaveDraft();">
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
            <td><input type="text" class="kendala-input" value="${data.kendala}" placeholder="Kendala/Masalah" required></td>
            <td><input type="text" class="dampak-input" value="${data.dampak}" placeholder="Dampak" required></td>
            <td><input type="text" class="solusi-input" value="${data.solusi}" placeholder="Solusi/Tindakan" required></td>
            <td class="action-col">
                <button type="button" class="btn-icon danger" onclick="this.closest('tr').remove(); app.autoSaveDraft();">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    getFormData() {
        // Collect Target Data
        const targets = [];
        document.querySelectorAll('#table-target tbody tr').forEach(row => {
            targets.push({
                target: row.querySelector('.target-input').value,
                pencapaian: row.querySelector('.pencapaian-input').value,
                status: row.querySelector('.status-input').value
            });
        });

        // Collect Kendala Data
        const kendalas = [];
        document.querySelectorAll('#table-kendala tbody tr').forEach(row => {
            kendalas.push({
                kendala: row.querySelector('.kendala-input').value,
                dampak: row.querySelector('.dampak-input').value,
                solusi: row.querySelector('.solusi-input').value
            });
        });

        return {
            id: document.getElementById('report-id').value,
            nama: document.getElementById('nama').value,
            posisi: document.getElementById('posisi').value,
            divisi: document.getElementById('divisi').value,
            periode: document.getElementById('periode').value, // YYYY-MM
            atasan: document.getElementById('atasan').value,
            ringkasan: document.getElementById('ringkasan').value,
            targets: targets,
            detail_website: document.getElementById('detail_website').value,
            detail_socmed: document.getElementById('detail_socmed').value,
            detail_riset: document.getElementById('detail_riset').value,
            pencapaian_utama: document.getElementById('pencapaian_utama').value,
            kendalas: kendalas,
            eval_kelebihan: document.getElementById('eval_kelebihan').value,
            eval_peningkatan: document.getElementById('eval_peningkatan').value,
            rencana: document.getElementById('rencana').value,
            penutup: document.getElementById('penutup').value,
            timestamp: new Date().toISOString()
        };
    },

    fillForm(data) {
        if(!data) return;

        document.getElementById('report-id').value = data.id || '';
        document.getElementById('nama').value = data.nama || '';
        document.getElementById('posisi').value = data.posisi || '';
        document.getElementById('divisi').value = data.divisi || '';
        document.getElementById('periode').value = data.periode || '';
        document.getElementById('atasan').value = data.atasan || '';
        document.getElementById('ringkasan').value = data.ringkasan || '';

        // Fill Targets
        const targetBody = document.querySelector('#table-target tbody');
        targetBody.innerHTML = '';
        if (data.targets && data.targets.length > 0) {
            data.targets.forEach(t => this.addTargetRow(t));
        } else {
            this.addTargetRow();
        }

        document.getElementById('detail_website').value = data.detail_website || '';
        document.getElementById('detail_socmed').value = data.detail_socmed || '';
        document.getElementById('detail_riset').value = data.detail_riset || '';
        document.getElementById('pencapaian_utama').value = data.pencapaian_utama || '';

        // Fill Kendala
        const kendalaBody = document.querySelector('#table-kendala tbody');
        kendalaBody.innerHTML = '';
        if (data.kendalas && data.kendalas.length > 0) {
            data.kendalas.forEach(k => this.addKendalaRow(k));
        } else {
            this.addKendalaRow();
        }

        document.getElementById('eval_kelebihan').value = data.eval_kelebihan || '';
        document.getElementById('eval_peningkatan').value = data.eval_peningkatan || '';
        document.getElementById('rencana').value = data.rencana || '';
        document.getElementById('penutup').value = data.penutup || '';
    },

    resetForm() {
        document.getElementById('report-form').reset();
        document.getElementById('report-id').value = '';
        document.querySelector('#table-target tbody').innerHTML = '';
        document.querySelector('#table-kendala tbody').innerHTML = '';
        this.addTargetRow();
        this.addKendalaRow();
    },

    saveReport(event) {
        event.preventDefault();
        const data = this.getFormData();

        if (data.id) {
            // Update
            const index = this.reports.findIndex(r => r.id === data.id);
            if (index !== -1) {
                this.reports[index] = data;
                this.showToast('Laporan berhasil diperbarui', 'success');
            }
        } else {
            // Create new
            data.id = this.generateId();
            this.reports.unshift(data); // Add to beginning
            this.showToast('Laporan baru berhasil disimpan', 'success');
        }

        this.saveReports();
        this.clearDraft();
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
            this.saveReports();
            this.showToast('Laporan berhasil dihapus', 'success');
        }
    },

    // =========================================
    // Dashboard Rendering & Filtering
    // =========================================
    formatMonth(monthStr) {
        if (!monthStr) return '-';
        const [year, month] = monthStr.split('-');
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${months[parseInt(month) - 1]} ${year}`;
    },

    renderDashboard() {
        const list = document.getElementById('report-list');
        const emptyState = document.getElementById('empty-state');

        // Update Stats
        document.getElementById('stat-total-reports').textContent = this.reports.length;
        if (this.reports.length > 0) {
            document.getElementById('stat-latest-report').textContent = this.formatMonth(this.reports[0].periode);
        } else {
            document.getElementById('stat-latest-report').textContent = '-';
        }

        this.filterReports(); // This will handle rendering the list
    },

    filterReports() {
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        const filterMonth = document.getElementById('filter-month').value;
        const list = document.getElementById('report-list');
        const emptyState = document.getElementById('empty-state');

        list.innerHTML = '';

        const filtered = this.reports.filter(report => {
            const matchesSearch = report.nama.toLowerCase().includes(searchQuery) ||
                                  this.formatMonth(report.periode).toLowerCase().includes(searchQuery);
            let matchesMonth = true;
            if (filterMonth) {
                const reportMonth = report.periode.split('-')[1];
                matchesMonth = reportMonth === filterMonth;
            }
            return matchesSearch && matchesMonth;
        });

        if (filtered.length === 0) {
            list.appendChild(emptyState);
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            filtered.forEach(report => {
                const card = document.createElement('div');
                card.className = 'report-card';
                card.innerHTML = `
                    <div class="report-header">
                        <div class="report-title">Laporan ${report.nama.split(' ')[0]}</div>
                        <div class="report-period">${this.formatMonth(report.periode)}</div>
                    </div>
                    <div class="report-summary">${report.ringkasan}</div>
                    <div class="report-actions">
                        <button class="btn-icon" title="Edit" onclick="app.editReport('${report.id}')">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn-icon" title="Print to PDF" onclick="app.printReport('${report.id}')">
                            <i class="ph ph-printer"></i>
                        </button>
                        <button class="btn-icon" title="Export DOCX" onclick="app.exportWord('${report.id}')">
                            <i class="ph ph-file-doc"></i>
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn-icon danger" title="Hapus" onclick="app.deleteReport('${report.id}')">
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
        let targetsHTML = '';
        report.targets.forEach(t => {
            targetsHTML += `<tr><td>${t.target}</td><td>${t.pencapaian}</td><td>${t.status}</td></tr>`;
        });

        let kendalaHTML = '';
        report.kendalas.forEach(k => {
            kendalaHTML += `<tr><td>${k.kendala}</td><td>${k.dampak}</td><td>${k.solusi}</td></tr>`;
        });

        return `
            <div class="print-doc">
                <h1>Laporan Bulanan Kinerja</h1>

                <h2>1. Identitas</h2>
                <table>
                    <tr><td width="30%"><strong>Nama</strong></td><td>${report.nama}</td></tr>
                    <tr><td><strong>Posisi</strong></td><td>${report.posisi}</td></tr>
                    <tr><td><strong>Divisi</strong></td><td>${report.divisi}</td></tr>
                    <tr><td><strong>Periode</strong></td><td>${this.formatMonth(report.periode)}</td></tr>
                    <tr><td><strong>Atasan</strong></td><td>${report.atasan}</td></tr>
                </table>

                <h2>2. Ringkasan Pekerjaan</h2>
                <p>${report.ringkasan.replace(/\n/g, '<br>')}</p>

                <h2>3. Target dan Pencapaian</h2>
                <table>
                    <thead>
                        <tr><th>Target</th><th>Pencapaian</th><th>Status</th></tr>
                    </thead>
                    <tbody>${targetsHTML}</tbody>
                </table>

                <h2>4. Detail Pekerjaan</h2>
                <p><strong>Content Website:</strong><br>${report.detail_website.replace(/\n/g, '<br>')}</p>
                <p><strong>Media Sosial:</strong><br>${report.detail_socmed.replace(/\n/g, '<br>')}</p>
                <p><strong>Riset dan Analisis:</strong><br>${report.detail_riset.replace(/\n/g, '<br>')}</p>

                <h2>5. Pencapaian Utama</h2>
                <p>${report.pencapaian_utama.replace(/\n/g, '<br>')}</p>

                <h2>6. Kendala dan Solusi</h2>
                <table>
                    <thead>
                        <tr><th>Kendala</th><th>Dampak</th><th>Solusi</th></tr>
                    </thead>
                    <tbody>${kendalaHTML}</tbody>
                </table>

                <h2>7. Evaluasi Diri</h2>
                <p><strong>Kelebihan / Hal baik:</strong><br>${report.eval_kelebihan.replace(/\n/g, '<br>')}</p>
                <p><strong>Hal yang perlu ditingkatkan:</strong><br>${report.eval_peningkatan.replace(/\n/g, '<br>')}</p>

                <h2>8. Rencana Pengembangan</h2>
                <p>${report.rencana.replace(/\n/g, '<br>')}</p>

                <h2>9. Penutup</h2>
                <p>${report.penutup.replace(/\n/g, '<br>')}</p>
            </div>
        `;
    },

    printReport(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report) return;

        const printTemplate = document.getElementById('print-template');
        printTemplate.innerHTML = this.generateHTMLContent(report);

        // Trigger browser print
        window.print();

        // Hide after print dialogue
        setTimeout(() => {
            printTemplate.innerHTML = '';
        }, 1000);
    },

    exportWord(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report) return;

        // Create a simple MS Word compatible HTML structure
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Export HTML to Word</title>
        <style>
            body { font-family: 'Times New Roman', serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            h1 { text-align: center; font-size: 18pt; }
            h2 { font-size: 14pt; border-bottom: 1px solid black; margin-top: 20px; }
        </style>
        </head><body>`;
        const footer = "</body></html>";
        const content = this.generateHTMLContent(report);
        const sourceHTML = header + content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `Laporan_Bulanan_${report.nama.replace(/\s+/g, '_')}_${report.periode}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);

        this.showToast('Laporan berhasil di-export ke DOC', 'success');
    },

    // Utilities
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check-circle' : 'warning-circle';
        toast.innerHTML = `
            <i class="ph ph-${icon}" style="font-size: 1.5rem;"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());