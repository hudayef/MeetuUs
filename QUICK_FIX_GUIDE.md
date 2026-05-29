# ⚡ QUICK FIX CHECKLIST

## 🔴 CRITICAL FIXES (Implementasikan SEGERA - App akan crash tanpa ini)

### Fix #1: Extract Variables di `handleAuth()`
- **File:** app.js
- **Line:** ~275
- **Action:** Tambahkan 3 baris setelah `const fullNameEl = ...`:
```javascript
const email = emailEl.value.trim();
const password = passwordEl.value.trim();
const fullName = fullNameEl ? fullNameEl.value.trim() : 'User';
```
- **Why:** Prevent ReferenceError saat login

---

### Fix #2: Declare `isSupabaseConfigured`
- **File:** app.js
- **Line:** ~15 (setelah SUPABASE_ANON_KEY)
- **Action:** Tambahkan:
```javascript
const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
```
- **Why:** Fallback mode tidak bekerja tanpa ini

---

### Fix #3: Remove Duplicate Auth Listener
- **File:** app.js
- **Line:** ~240-250
- **Action:** HAPUS listener kedua yang duplicate (setelah try-catch berakhir)
- **Why:** Prevent double callback yang membuat app loading 2x

---

### Fix #4: Fix admin_id di `saveRequest()`
- **File:** app.js
- **Line:** ~1095
- **Change From:**
```javascript
admin_id: (this.profile && this.profile.id) ? this.profile.id : (this.user ? this.user.id : null)
```
- **Change To:**
```javascript
admin_id: this.user ? this.user.id : null
```
- **Why:** this.profile tidak punya field id, akan undefined

---

## 🟡 HIGH PRIORITY (Implementasikan dalam 1-2 hari)

### Fix #5: Add Race Condition Protection di `loadReports()`
- **File:** app.js
- **Line:** ~450
- **Action:** Capture userId di awal dan verify sebelum update
- **Reference:** Lihat FIXES_DETAILED.md - "PERBAIKAN #5"
- **Why:** Prevent data mixing jika user logout/login cepat

---

### Fix #6: Add Validation di `changeUserRole()`
- **File:** app.js
- **Line:** ~925
- **Action:** Validate newRole sebelum diupdate ke database
- **Reference:** Lihat FIXES_DETAILED.md - "PERBAIKAN #6"
- **Why:** Security - prevent invalid role values

---

## 🟢 MEDIUM PRIORITY (Implementasikan minggu ini)

### Fix #7: Null Check di `editReport()`
- **File:** app.js
- **Line:** ~677
- **Action:** Add early return untuk invalid id
- **Reference:** Lihat FIXES_DETAILED.md - "PERBAIKAN #7"

---

### Fix #8: Input Validation di `getFormData()`
- **File:** app.js
- **Line:** ~468
- **Action:** Add try-catch dan validate DOM elements
- **Reference:** Lihat FIXES_DETAILED.md - "PERBAIKAN #8"

---

### Fix #9: Escape HTML di `openRequestModal()`
- **File:** app.js
- **Line:** ~1055
- **Action:** Gunakan Utils.escapeHTML() untuk semua user input
- **Reference:** Lihat FIXES_DETAILED.md - "PERBAIKAN #9"

---

## 📋 IMPLEMENTATION ORDER

1. **Step 1:** Fix #1, #2 (5 min) - Prevent app crash
2. **Step 2:** Fix #3, #4 (5 min) - Fix logic bugs
3. **Step 3:** Fix #5, #6 (15 min) - Security & robustness
4. **Step 4:** Fix #7, #8, #9 (15 min) - Polish

**Total Time:** ~40 minutes untuk semua fixes

---

## TESTING CHECKLIST

Setelah implementasi, test:

- [ ] Login dengan email/password (Fix #1, #2)
- [ ] Logout & login kembali cepat (Fix #5)
- [ ] Create new report (Fix #8)
- [ ] Edit existing report (Fix #7)
- [ ] Create new request as admin (Fix #4)
- [ ] Change user role as admin (Fix #6)
- [ ] View request detail (Fix #9)
- [ ] Check browser console - no errors
- [ ] Check Supabase logs - no failed queries

---

## FILES TO UPDATE

- `app.js` - Main file dengan 9 fixes

No changes needed untuk:
- index.html ✓
- style.css ✓
- supabase_schema.sql ✓

