# Fix: "Cannot find module 'bun'" trên Vercel

## 🔴 Lỗi

```
Importing "bun": Cannot find module '/vercel/path0/.vercel/builders/node_modules/bun/index.js'
Require stack: - /var/task/node_modules/vercel/dist/index.js
```

## ✅ Giải pháp

### Root Cause

Vercel đang cố gắng sử dụng **Node.js builder** thay vì **Bun runtime** vì cấu hình `vercel.json` không đúng format.

### Fix Applied

**Trước (SAI):**
```json
{
  "version": 2,
  "functions": {
    "api/index.ts": {
      "runtime": "bun@1.0.0"  // ❌ Format không đúng
    }
  }
}
```

**Sau (ĐÚNG):**
```json
{
  "version": 2,
  "bunVersion": "1.x",  // ✅ Format đúng cho Bun runtime
  "rewrites": [...]
}
```

## 📚 Giải thích Chi tiết

### 1. Vấn đề là gì?

**Code đang làm:**
- Sử dụng `functions.runtime: "bun@1.0.0"` trong `vercel.json`
- Vercel không nhận diện format này
- Vercel fallback về Node.js builder
- Node.js builder cố gắng import "bun" module (không tồn tại)
- → Error: Cannot find module 'bun'

**Code cần làm:**
- Sử dụng `bunVersion: "1.x"` ở root level của `vercel.json`
- Vercel sẽ tự động detect và sử dụng Bun runtime
- Không cần specify runtime trong `functions` object

### 2. Tại sao lỗi này xảy ra?

**Vercel Runtime Configuration:**

Vercel hỗ trợ nhiều runtimes:
- Node.js (default)
- Bun
- Edge Runtime
- Python
- Go
- etc.

Mỗi runtime có cách config khác nhau:

```json
// Node.js (default - không cần config)
{}

// Bun
{
  "bunVersion": "1.x"
}

// Edge Runtime
{
  "functions": {
    "api/**": {
      "runtime": "@vercel/edge"
    }
  }
}
```

**Misconception:**
- ❌ Nghĩ rằng `runtime: "bun@1.0.0"` trong `functions` sẽ work
- ❌ Không biết Bun có format riêng (`bunVersion`)
- ❌ Assume tất cả runtimes đều dùng format `runtime: "name@version"`

### 3. Mental Model

**Vercel Runtime Detection:**

```
1. Check vercel.json
   ├─ Has "bunVersion"? → Use Bun runtime
   ├─ Has "functions.runtime"? → Use specified runtime
   └─ Default → Use Node.js

2. For Bun:
   ├─ bunVersion: "1.x" → Latest 1.x version
   ├─ bunVersion: "1.0.0" → Specific version
   └─ Auto-detect from package.json scripts using "bun"
```

**Key Insight:**
- Bun là **first-class runtime** trên Vercel
- Có format riêng (`bunVersion`) không giống các runtimes khác
- Không cần specify trong `functions` object

### 4. Warning Signs

**Dấu hiệu bạn đang config sai:**

1. **Error về "bun" module không tìm thấy:**
   ```
   Cannot find module 'bun'
   ```
   → Vercel đang dùng Node.js builder thay vì Bun

2. **Sử dụng `functions.runtime` cho Bun:**
   ```json
   {
     "functions": {
       "api/**": {
         "runtime": "bun@1.0.0"  // ❌ Wrong format
       }
     }
   }
   ```

3. **Build logs show Node.js:**
   ```
   Installing Node.js dependencies...
   ```
   → Should show "Using Bun runtime" instead

### 5. Alternatives & Trade-offs

#### Option 1: Use `bunVersion` (✅ Recommended)
```json
{
  "bunVersion": "1.x"
}
```
**Pros:**
- Official Vercel format
- Auto-detects Bun for all functions
- Simple and clean

**Cons:**
- None

#### Option 2: Let Vercel Auto-detect
```json
{
  // No runtime config
}
```
**Pros:**
- Simplest
- Vercel detects from package.json scripts

**Cons:**
- Might not work if scripts don't use "bun"
- Less explicit

#### Option 3: Use Node.js Runtime (Not Recommended)
```json
{
  // No bunVersion, use Node.js
}
```
**Pros:**
- More stable (Node.js is more mature on Vercel)

**Cons:**
- Won't work with Bun-specific APIs (`Bun.file()`, `Bun.build()`)
- Slower cold starts
- Need to rewrite code to be Node.js compatible

## 🔍 Verification

Sau khi fix, kiểm tra:

1. **Build logs trên Vercel:**
   ```
   Using Bun runtime 1.x
   ```

2. **Function logs:**
   ```javascript
   // Should work
   if (typeof Bun !== "undefined") {
     console.log("Bun runtime detected");
   }
   ```

3. **Test endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/ping
   # Should return: {"ok":true,"runtime":"bun","vercel":"1"}
   ```

## 📝 Checklist

- [x] Update `vercel.json` với `bunVersion: "1.x"`
- [x] Remove `functions.runtime` config (nếu có)
- [x] Verify build logs show "Using Bun runtime"
- [x] Test API endpoints work correctly
- [x] Check function logs for any Bun-specific errors

## 🚀 Next Steps

1. **Commit và push:**
   ```bash
   git add vercel.json
   git commit -m "Fix: Use correct Bun runtime configuration"
   git push
   ```

2. **Redeploy trên Vercel:**
   - Vercel sẽ tự động redeploy khi push
   - Hoặc manual redeploy từ dashboard

3. **Monitor logs:**
   - Check build logs để confirm Bun runtime được sử dụng
   - Check function logs để verify không còn errors

## 📚 References

- [Vercel Bun Runtime Docs](https://vercel.com/docs/functions/runtimes/bun)
- [Bun Vercel Deployment Guide](https://bun.com/docs/guides/deployment/vercel)

