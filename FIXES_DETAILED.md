# 🔧 KODE PERBAIKAN DETAIL

## PERBAIKAN #1: Fix `handleAuth()` - Undefined Variables

### ❌ SEBELUM (Line ~265-295):
```javascript
async handleAuth(e) {
    e.preventDefault();

    const emailEl = document.getElementById('auth-email');
    const passwordEl = document.getElementById('auth-password');
    const fullNameEl = document.getElementById('auth-fullname');
    const btn = document.getElementById('btn-auth-submit');

    if (!emailEl || !passwordEl) return;

    if (!isSupabaseConfigured) {  // ❌ UNDEFINED!
        // Fallback Local Mode logic
        setTimeout(async () => {
            UI.showToast(this.isLoginMode ? 'Login Local berhasil' : 'Pendaftaran Local berhasil', 'success');
            this.hideAuth();
            this.user = { id: 'local_user_' + Date.now() };
            this.profile = { full_name: fullName, role: 'admin' };  // ❌ fullName UNDEFINED!
            // ...
        }, 100);
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memproses...';
    }

    try {
        if (!supabaseClient) throw new Error("Supabase SDK is not initialized");
        if (this.isLoginMode) {
            const { data, error } = await Utils.withTimeout(
                supabaseClient.auth.signInWithPassword({ email, password }),  // ❌ email, password UNDEFINED!
                15000
            );
```

### ✅ SESUDAH (PERBAIKAN):
```javascript
async handleAuth(e) {
    e.preventDefault();

    const emailEl = document.getElementById('auth-email');
    const passwordEl = document.getElementById('auth-password');
    const fullNameEl = document.getElementById('auth-fullname');
    const btn = document.getElementById('btn-auth-submit');

    if (!emailEl || !passwordEl) return;

    // ✅ FIX: Extract nilai dari DOM elements SEBELUM menggunakannya
    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();
    const fullName = fullNameEl ? fullNameEl.value.trim() : 'User';

    if (!email || !password) {
        UI.showToast('Email dan password harus diisi', 'error');
        return;
    }

    // ✅ FIX: Declare isSupabaseConfigured di awal file (lihat perbaikan #2)
    const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);

    if (!isSupabaseConfigured) {
        // Fallback Local Mode logic
        setTimeout(async () => {
            UI.showToast(
                this.isLoginMode ? 'Login Local berhasil' : 'Pendaftaran Local berhasil',
                'success'
            );
            this.hideAuth();
            this.user = { id: 'local_user_' + Date.now() };
            // ✅ FIX: Tambahkan id ke profile
            this.profile = {
                id: this.user.id,
                full_name: fullName,
                email: email,
                role: 'admin'
            };
            document.getElementById('display-user-name').textContent = fullName;
            document.getElementById('display-user-role').textContent = 'admin';
            document.getElementById('nav-admin').style.display = 'flex';
            const navRequests = document.getElementById('nav-requests');
            if(navRequests) navRequests.style.display = 'none';
            await this.loadReports();
            this.navigate('dashboard');
        }, 100);
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memproses...';
    }

    try {
        if (!supabaseClient) throw new Error("Supabase SDK is not initialized");
        if (this.isLoginMode) {
            // ✅ FIX: Gunakan email & password dari extracted values
            const { data, error } = await Utils.withTimeout(
                supabaseClient.auth.signInWithPassword({ email, password }),
                15000
            );
            if (error) throw error;
            UI.showToast('Login berhasil', 'success');
            // handleUserLogin will be called by onAuthStateChange
        } else {
            const { data, error } = await Utils.withTimeout(
                supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                }),
                15000
            );
            if (error) throw error;

            if (data?.user?.identities?.length === 0) {
                 UI.showToast('Email sudah terdaftar. Silakan login.', 'error');
                 if (btn) {
                     btn.disabled = false;
                     btn.textContent = 'Daftar';
                 }
                 return;
            }

            UI.showToast('Pendaftaran berhasil. Silakan login.', 'success');
            if(!data.session) {
                this.toggleAuthMode();
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Login';
                }
            }
        }
    } catch (error) {
        UI.showToast(error.message || 'Terjadi kesalahan', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = this.isLoginMode ? 'Login' : 'Daftar';
        }
    }
}
```

---

## PERBAIKAN #2: Declare `isSupabaseConfigured` di Awal File

### ✅ TAMBAHKAN setelah SUPABASE_ANON_KEY (Line ~10-15):

```javascript
// =========================================
// SUPABASE CONFIGURATION
// =========================================
const SUPABASE_URL = 'https://qkrftwehwwzwxajuurpk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ELyphZsBinKDKyH6hD5ORg_YARPwtO7';

// ✅ FIX: Declare isSupabaseConfigured
const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);

// Initialize Supabase Client
let supabaseClient = null;
try {
    if (window.supabase && isSupabaseConfigured) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase SDK is not loaded.");
    }
} catch (e) {
    console.error("Supabase initialization error:", e);
}
```

---

## PERBAIKAN #3: Remove Duplicate Auth Listener

### ❌ SEBELUM (Line ~225-245):
```javascript
async init() {
    this.currentTheme = Storage.getTheme();
    UI.setTheme(this.currentTheme);
    this.setupListeners();

    try {
        if (!supabaseClient) throw new Error("Supabase is not initialized.");

        const { data: { session } } = await Utils.withTimeout(
            supabaseClient.auth.getSession(), 10000
        );
        if (session) {
            await this.handleUserLogin(session.user);
        } else {
            this.showAuth();
        }

        // ❌ LISTENER PERTAMA
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

    // ❌ LISTENER KEDUA (DUPLICATE!)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            await this.handleUserLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
            this.handleUserLogout();
        }
    });
}
```

### ✅ SESUDAH:
```javascript
async init() {
    this.currentTheme = Storage.getTheme();
    UI.setTheme(this.currentTheme);
    this.setupListeners();

    try {
        if (!supabaseClient) throw new Error("Supabase is not initialized.");

        const { data: { session } } = await Utils.withTimeout(
            supabaseClient.auth.getSession(), 10000
        );
        if (session) {
            await this.handleUserLogin(session.user);
        } else {
            this.showAuth();
        }

        // ✅ FIX: HANYA 1 LISTENER (hapus duplicate di bawah)
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

    // ❌ HAPUS BAGIAN INI (duplicate listener)
    // supabaseClient.auth.onAuthStateChange(async (event, session) => {
    //     if (event === 'SIGNED_IN') {
    //         await this.handleUserLogin(session.user);
    //     } else if (event === 'SIGNED_OUT') {
    //         this.handleUserLogout();
    //     }
    // });
}
```

---

## PERBAIKAN #4: Fix `saveRequest()` - Wrong admin_id Logic

### ❌ SEBELUM (Line ~1080-1100):
```javascript
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
        status: 'Pending',
        // ❌ SALAH: this.profile tidak punya id
        admin_id: (this.profile && this.profile.id) ? this.profile.id : (this.user ? this.user.id : null)
    };
```

### ✅ SESUDAH:
```javascript
async saveRequest(event) {
    event.preventDefault();
    const btn = event.submitter || document.querySelector('#request-form button[type="submit"]');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = 'Menyimpan...';
    }

    const id = document.getElementById('req-id') ? document.getElementById('req-id').value : '';
    const form = document.getElementById('request-form');

    // ✅ FIX: Validasi input
    const judul = document.getElementById('req-judul').value.trim();
    const tujuan = document.getElementById('req-tujuan').value.trim();
    const batas_waktu = document.getElementById('req-batas').value;
    const deskripsi = document.getElementById('req-deskripsi').value.trim();

    if (!judul || !tujuan || !batas_waktu || !deskripsi) {
        UI.showToast('Semua field harus diisi', 'error');
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Kirim Request';
        }
        return;
    }

    const newRequest = {
        judul,
        tujuan,
        batas_waktu,
        deskripsi,
        status: 'Pending',
        // ✅ FIX: Gunakan this.user.id, bukan this.profile.id
        admin_id: this.user ? this.user.id : null
    };

    // ... rest of code
}
```

---

## PERBAIKAN #5: Race Condition di `loadReports()`

### ❌ SEBELUM:
```javascript
async loadReports() {
    try {
        if (!this.user || !this.user.id || !supabaseClient) {
             this.reports = [];
             this.renderDashboard();
             return;
        }
        const { data, error } = await Utils.withTimeout(
            supabaseClient.from('reports')
                .select('*')
                .eq('user_id', this.user.id)  // ❌ this.user bisa berubah saat await
                .order('created_at', { ascending: false }),
            10000
        );

        if (error) throw error;
        this.reports = data || [];  // ❌ tidak verify user_id sama
        this.renderDashboard();
    } catch (error) {
        this.reports = [];
        this.renderDashboard();
        UI.showToast('Gagal memuat laporan', 'error');
        console.error(error);
    }
}
```

### ✅ SESUDAH:
```javascript
async loadReports() {
    // ✅ FIX: Capture user_id di awal
    const userId = this.user?.id;
    
    if (!userId) {
        this.reports = [];
        this.renderDashboard();
        return;
    }
    
    try {
        if (!supabaseClient) throw new Error("Supabase is not initialized");
        
        const { data, error } = await Utils.withTimeout(
            supabaseClient.from('reports')
                .select('*')
                .eq('user_id', userId)  // ✅ Gunakan captured userId
                .order('created_at', { ascending: false }),
            10000
        );

        if (error) throw error;
        
        // ✅ FIX: Verify user masih sama sebelum update state
        if (this.user?.id !== userId) {
            console.warn('User changed during loadReports, skipping update');
            return;
        }
        
        this.reports = data || [];
        this.renderDashboard();
    } catch (error) {
        // ✅ FIX: Hanya update jika user masih sama
        if (this.user?.id === userId) {
            this.reports = [];
            this.renderDashboard();
            UI.showToast('Gagal memuat laporan', 'error');
        }
        console.error(error);
    }
}
```

---

## PERBAIKAN #6: Add Validation di `changeUserRole()`

### ❌ SEBELUM:
```javascript
async changeUserRole(userId, newRole) {
    if(userId === this.user.id) {
        UI.showToast('Tidak bisa mengubah role Anda sendiri', 'error');
        this.loadAdminData();
        return;
    }

    try {
        const { error } = await supabaseClient.from('profiles')
            .update({ role: newRole })  // ❌ tidak validate newRole
            .eq('id', userId);
        if(error) throw error;
        UI.showToast('Role berhasil diubah', 'success');
        this.loadAdminData();
    } catch(error) {
        UI.showToast('Gagal mengubah role', 'error');
    }
}
```

### ✅ SESUDAH:
```javascript
async changeUserRole(userId, newRole) {
    // ✅ FIX: Validasi input
    if (!userId || !newRole) return;
    
    const validRoles = ['writer', 'admin'];
    if (!validRoles.includes(newRole)) {
        UI.showToast('Role tidak valid', 'error');
        await this.loadAdminData();  // Reset dropdown
        return;
    }
    
    if(userId === this.user?.id) {
        UI.showToast('Tidak bisa mengubah role Anda sendiri', 'error');
        await this.loadAdminData();
        return;
    }

    try {
        if (!supabaseClient) throw new Error("Supabase not initialized");
        
        const { error } = await supabaseClient.from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        if(error) throw error;
        
        UI.showToast('Role berhasil diubah', 'success');
        await this.loadAdminData();
    } catch(error) {
        UI.showToast('Gagal mengubah role: ' + error.message, 'error');
        await this.loadAdminData();
    }
}
```

---

## PERBAIKAN #7: Add Null Check di `editReport()`

### ❌ SEBELUM:
```javascript
editReport(id) {
    const report = this.reports.find(r => r.id === id) || 
                   this.allReports.find(r => r.id === id);
    if (report) {
        this.fillForm(report);  // ❌ Bisa crash jika fillForm tidak handle null
        this.navigate('form');
    }
}
```

### ✅ SESUDAH:
```javascript
editReport(id) {
    if (!id) return;  // ✅ FIX: Early return untuk invalid id
    
    const report = this.reports.find(r => r.id === id) || 
                   this.allReports.find(r => r.id === id);
    
    if (!report) {
        UI.showToast('Laporan tidak ditemukan', 'error');
        return;
    }
    
    this.fillForm(report);
    this.navigate('form');
}
```

---

## PERBAIKAN #8: Add Input Validation di `getFormData()`

### ✅ TAMBAHKAN di awal getFormData():

```javascript
getFormData() {
    // ✅ FIX: Validasi DOM elements exist
    try {
        const targets = Array.from(
            document.querySelectorAll('#table-target tbody tr')
        ).map(row => {
            const targetInput = row.querySelector('.target-input');
            const pencapaianInput = row.querySelector('.pencapaian-input');
            const statusInput = row.querySelector('.status-input');
            
            if (!targetInput || !pencapaianInput || !statusInput) {
                throw new Error('Form structure error: missing input elements in target row');
            }
            
            return {
                target: targetInput.value.trim(),
                pencapaian: pencapaianInput.value.trim(),
                status: statusInput.value
            };
        });

        const kendalas = Array.from(
            document.querySelectorAll('#table-kendala tbody tr')
        ).map(row => {
            const kendalaInput = row.querySelector('.kendala-input');
            const dampakInput = row.querySelector('.dampak-input');
            const solusiInput = row.querySelector('.solusi-input');
            
            if (!kendalaInput || !dampakInput || !solusiInput) {
                throw new Error('Form structure error: missing input elements in kendala row');
            }
            
            return {
                kendala: kendalaInput.value.trim(),
                dampak: dampakInput.value.trim(),
                solusi: solusiInput.value.trim()
            };
        });

        // ✅ FIX: Cek minimal 1 target dan 1 kendala
        if (targets.length === 0) {
            throw new Error('Minimal harus ada 1 target');
        }
        if (kendalas.length === 0) {
            throw new Error('Minimal harus ada 1 kendala');
        }

        // ... rest of getFormData code
    } catch (error) {
        UI.showToast('Error dalam form: ' + error.message, 'error');
        throw error;
    }
}
```

---

## PERBAIKAN #9: Escape HTML di openRequestModal()

### ✅ UPDATE (Line ~1055-1070):
```javascript
async openRequestModal(id, isAdminView = false) {
    if (!supabaseClient) return;
    let req;
    const { data } = await supabaseClient.from('requests')
        .select('*')
        .eq('id', id)
        .single();
    req = data;

    if(!req) {
        UI.showToast('Request tidak ditemukan', 'error');
        return;
    }

    // ✅ FIX: Escape HTML untuk safety
    document.getElementById('modal-req-judul').textContent = Utils.escapeHTML(req.judul);
    document.getElementById('modal-req-tujuan').textContent = Utils.escapeHTML(req.tujuan);
    document.getElementById('modal-req-batas').textContent = Utils.formatDate(req.batas_waktu);
    document.getElementById('modal-req-deskripsi').textContent = Utils.escapeHTML(req.deskripsi);

    // ... rest of code
}
```

