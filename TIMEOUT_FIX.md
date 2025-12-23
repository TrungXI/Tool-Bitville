# Fix: FUNCTION_INVOCATION_TIMEOUT trên Vercel

## 🔴 Lỗi

```
504: GATEWAY_TIMEOUT
Code: FUNCTION_INVOCATION_TIMEOUT
```

## ✅ Giải pháp đã áp dụng

### 1. Disable staticPlugin trên Vercel
**File:** `src/index.tsx`

**Vấn đề:** `staticPlugin` scan filesystem khi initialize, có thể mất nhiều thời gian trên Vercel.

**Giải pháp:** Chỉ dùng `staticPlugin` ở local, disable trên Vercel (Vercel tự serve static files):

```typescript
.use(
    process.env.VERCEL === "1" 
        ? new Elysia() // No-op plugin on Vercel
        : staticPlugin({
            assets: "public",
            prefix: "/"
        })
)
```

### 2. Add Timeout cho File Reading
**File:** `src/index.tsx` - `readFile()` function

**Vấn đề:** `readFile()` thử nhiều fallback methods, có thể timeout nếu tất cả đều chậm.

**Giải pháp:** Thêm timeout 3 giây cho mỗi operation:

```typescript
const timeout = 3000; // 3 seconds max

// Wrap operations với Promise.race và timeout
return await Promise.race([
    file.text(),
    new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), timeout)
    )
]);
```

### 3. Add Connection Timeout cho Database
**File:** `src/db.tsx`

**Vấn đề:** Database connection có thể timeout nếu không có timeout setting.

**Giải pháp:** Thêm `connect_timeout: 10`:

```typescript
sqlInstance = postgres(process.env.DATABASE_URL, {
    ssl: "require",
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10, // 10 seconds connection timeout
    connection: {
        application_name: "tool-bitville"
    }
});
```

### 4. Add Function-Level Timeout
**File:** `api/index.ts`

**Vấn đề:** Nếu handler chạy quá lâu, Vercel sẽ timeout (10s cho Hobby, 60s cho Pro).

**Giải pháp:** Thêm safety timeout ở handler level:

```typescript
const FUNCTION_TIMEOUT = 8000; // 8 seconds for Hobby plan

const handlerPromise = app.handle(req);
const response = await Promise.race([handlerPromise, timeoutPromise]);
```

## 📚 Giải thích Chi tiết

### 1. Vấn đề là gì?

**Vercel Timeout Limits:**
- **Hobby Plan:** 10 seconds
- **Pro Plan:** 60 seconds
- **Enterprise:** Custom

**Code đang làm:**
- `staticPlugin` scan filesystem khi initialize → Chậm trên cold start
- `readFile()` thử nhiều fallback methods → Có thể mất nhiều thời gian
- Database connection không có timeout → Có thể hang nếu DB không respond
- Handler không có timeout protection → Có thể chạy quá lâu

**Code cần làm:**
- Disable `staticPlugin` trên Vercel (Vercel tự serve static files)
- Add timeout cho file operations
- Add connection timeout cho database
- Add function-level timeout để fail fast

### 2. Tại sao lỗi này xảy ra?

**Cold Start Performance:**

```
Cold Start Timeline:
┌─────────────────────────────────────┐
│ 1. Import modules (0.5-2s)          │ ← Module evaluation
│ 2. Initialize plugins (0.5-1s)      │ ← staticPlugin scan
│ 3. Connect to database (1-3s)        │ ← Network latency
│ 4. Handle request (variable)        │ ← Business logic
└─────────────────────────────────────┘
Total: 2-6s+ (có thể vượt 10s nếu chậm)
```

**Điều kiện trigger timeout:**
1. Cold start: Module imports + plugin initialization
2. `staticPlugin` scan filesystem → Chậm trên Vercel
3. Database connection timeout → Network issues
4. File reading operations → Multiple fallbacks
5. Business logic chạy quá lâu

**Misconception:**
- ❌ Nghĩ rằng "Bun runtime nhanh" = "không cần optimize"
- ❌ Không biết `staticPlugin` scan filesystem khi initialize
- ❌ Không hiểu Vercel timeout limits
- ❌ Không add timeout cho async operations

### 3. Mental Model

**Vercel Serverless Function Lifecycle:**

```
Request → Cold Start → Execution → Response
           ↑
           └─ Timeout limit starts here
```

**Key Insights:**
1. **Cold Start Counts:** Time từ khi request đến khi bắt đầu execute code
2. **Execution Time:** Time từ khi code bắt đầu đến khi return response
3. **Total Time:** Cold Start + Execution phải < Timeout limit

**Optimization Strategy:**
1. **Minimize Cold Start:**
   - Lazy load heavy modules
   - Disable unnecessary plugins
   - Optimize imports

2. **Minimize Execution Time:**
   - Add timeouts cho async operations
   - Fail fast thay vì retry nhiều lần
   - Cache expensive operations

3. **Fail Fast:**
   - Add timeouts ở mọi level
   - Return error thay vì hang
   - Log để debug

### 4. Warning Signs

**Dấu hiệu bạn có thể bị timeout:**

1. **Slow Cold Start:**
   ```typescript
   // ❌ BAD: Heavy operations ở module level
   import { heavyOperation } from "./heavy";
   const result = heavyOperation(); // Blocks module load
   
   // ✅ GOOD: Lazy load
   async function getResult() {
       return await heavyOperation();
   }
   ```

2. **No Timeouts:**
   ```typescript
   // ❌ BAD: No timeout
   const data = await fetch(url);
   
   // ✅ GOOD: With timeout
   const data = await Promise.race([
       fetch(url),
       new Promise((_, reject) => 
           setTimeout(() => reject(new Error("Timeout")), 5000)
       )
   ]);
   ```

3. **Filesystem Scanning:**
   ```typescript
   // ❌ BAD: Scan filesystem on init
   .use(staticPlugin({ assets: "public" }))
   
   // ✅ GOOD: Conditional plugin
   .use(process.env.VERCEL ? noop : staticPlugin({...}))
   ```

4. **Multiple Fallbacks:**
   ```typescript
   // ❌ BAD: Try many things sequentially
   try { method1(); } catch { try { method2(); } catch { method3(); } }
   
   // ✅ GOOD: Fail fast với timeout
   try { await Promise.race([method1(), timeout]); } catch { return error; }
   ```

### 5. Alternatives & Trade-offs

#### Option 1: Disable staticPlugin (✅ Applied)
**Approach:** Chỉ dùng `staticPlugin` ở local, disable trên Vercel.

**Pros:**
- Faster cold start
- Vercel tự serve static files (optimized)
- No filesystem scanning

**Cons:**
- Cần maintain 2 configs (local vs Vercel)
- Static files phải ở `/public` folder

#### Option 2: Pre-build Static Files
**Approach:** Build static files ở build time, không serve on-the-fly.

**Pros:**
- Fastest serving
- No runtime overhead

**Cons:**
- Cần build step
- Không thể dynamic generate

#### Option 3: Use Edge Runtime
**Approach:** Deploy với Edge Runtime thay vì Bun.

**Pros:**
- Faster cold start
- Better global distribution

**Cons:**
- Có limitations về APIs
- Không support một số dependencies

#### Option 4: Increase Timeout (Pro Plan)
**Approach:** Upgrade lên Pro plan để có 60s timeout.

**Pros:**
- More time for operations
- Better for long-running tasks

**Cons:**
- Cost money
- Không fix root cause (vẫn nên optimize)

## 🔍 Verification

Sau khi fix, kiểm tra:

1. **Build logs:**
   ```
   Build completed successfully
   Function size: < 50MB
   ```

2. **Function logs:**
   ```
   Function execution time: < 5s
   No timeout errors
   ```

3. **Test endpoints:**
   ```bash
   # Should respond quickly
   curl https://your-app.vercel.app/api/ping
   # Response time: < 1s
   ```

## 📝 Checklist

- [x] Disable `staticPlugin` trên Vercel
- [x] Add timeout cho `readFile()`
- [x] Add `connect_timeout` cho database
- [x] Add function-level timeout
- [ ] Test cold start performance
- [ ] Monitor function execution time
- [ ] Check Vercel logs for any remaining issues

## 🚀 Next Steps

1. **Deploy và test:**
   ```bash
   git add .
   git commit -m "Fix: Add timeouts and optimize for Vercel"
   git push
   ```

2. **Monitor:**
   - Check Vercel function logs
   - Monitor execution time
   - Check for timeout errors

3. **Optimize further nếu cần:**
   - Lazy load heavy modules
   - Cache expensive operations
   - Consider Edge Runtime nếu cần

## 📚 References

- [Vercel Function Timeout Limits](https://vercel.com/docs/functions/runtimes#timeout)
- [Optimizing Serverless Functions](https://vercel.com/docs/functions/serverless-functions/runtimes#optimization)
- [Bun Performance Tips](https://bun.com/docs/runtime/performance)

