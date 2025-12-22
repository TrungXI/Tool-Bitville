# Vercel Deployment Fix

## Vấn đề
- Lỗi 404 khi truy cập `https://tool-bitville.vercel.app/login`

## Giải pháp đã áp dụng

### 1. Cập nhật `vercel.json`
- Thêm cấu hình `functions` để chỉ định Bun runtime
- Cấu hình `rewrites` để route tất cả requests đến `/api/index.ts`

### 2. Cập nhật `api/index.ts`
- Export handler dạng async function để tương thích với Vercel

### 3. File `.env.example`
- Đã tạo file `.env.example` với cấu hình cho Docker local

## Các bước deploy lại

1. **Commit và push code:**
```bash
git add .
git commit -m "Fix Vercel deployment configuration"
git push
```

2. **Kiểm tra Environment Variables trên Vercel:**
   - Vào Vercel Dashboard → Project Settings → Environment Variables
   - Đảm bảo có:
     - `DATABASE_URL` - Neon database connection string
     - `JWT_SECRET` - Secret key cho JWT

3. **Redeploy:**
   - Vercel sẽ tự động deploy khi push code
   - Hoặc vào Vercel Dashboard → Deployments → Redeploy

## Cấu hình Local Docker

1. **Copy `.env.example` thành `.env`:**
```bash
cp .env.example .env
```

2. **Chỉnh sửa `.env` nếu cần:**
```env
DATABASE_URL=postgresql://app:app@localhost:5433/api_test_tool
JWT_SECRET=your-secret-key-here
```

3. **Chạy Docker:**
```bash
docker-compose -f composelocal.yml up -d
```

4. **Migrate database:**
```bash
bun run src/scripts/migrate.tsx
```

5. **Seed database:**
```bash
bun run src/scripts/seed.tsx
```

6. **Chạy server local:**
```bash
bun run dev
```

## Lưu ý

- Vercel cần Bun runtime để chạy code sử dụng `Bun.file()` và `Bun.build()`
- Đảm bảo `DATABASE_URL` trên Vercel đúng format và có `?sslmode=require`
- Static files trong `/public` sẽ được serve tự động bởi Vercel

