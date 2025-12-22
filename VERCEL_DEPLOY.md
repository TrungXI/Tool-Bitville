# Vercel Deployment Guide

## Cấu trúc cho Vercel

```
Tool-Bitville/
├── api/
│   └── index.ts          # Vercel serverless function entry point
├── public/               # Static files (served by Vercel)
├── src/
│   └── index.tsx        # Main Elysia app (exported for Vercel)
├── vercel.json          # Vercel configuration
└── .env                 # Local environment variables (not committed)
```

## Environment Variables

### Local Development (.env)
```env
DATABASE_URL=postgresql://username:password@hostname.neon.tech/database?sslmode=require
JWT_SECRET=your-secret-key-here
```

### Vercel Dashboard
1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add:
   - `DATABASE_URL` - Your Neon database connection string
   - `JWT_SECRET` - Your JWT secret key

## Deployment Steps

### 1. Install Vercel CLI (if not already)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link project (first time)
```bash
vercel link
```

### 4. Set Environment Variables
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

Or set them in Vercel dashboard.

### 5. Deploy
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## Local Development

### Run locally
```bash
bun run dev
```

Server will start at `http://localhost:3000`

### Environment Detection

Code automatically detects environment:
- **Local**: `VERCEL !== "1"` → Listens on port 3000
- **Vercel**: `VERCEL === "1"` → Exports handler only, no listen

## File Structure

### `api/index.ts`
- Entry point for Vercel serverless function
- Imports and exports Elysia app handler

### `src/index.tsx`
- Main Elysia application
- Exports app for Vercel
- Only listens on port when running locally

### `vercel.json`
- Routes configuration
- API routes → `/api/index.ts`
- Static files → `/public/`
- Fallback → `/public/index.html`

## Important Notes

1. **Database Connection**: 
   - Uses Neon database (serverless-friendly)
   - Connection pooling configured for serverless

2. **Static Files**:
   - Served from `/public/` folder
   - `app.tsx` is transpiled on-the-fly

3. **Environment Variables**:
   - Local: `.env` file (not committed)
   - Vercel: Set in dashboard

4. **Build**:
   - No build step needed (Elysia runs directly)
   - Vercel uses Bun runtime

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is set correctly in Vercel
- Ensure Neon database allows connections from Vercel IPs
- Check SSL mode is set to `require`

### Static Files Not Loading
- Ensure files are in `/public/` folder
- Check `vercel.json` routes configuration

### API Routes Not Working
- Check `api/index.ts` exports handler correctly
- Verify routes in `vercel.json`

## Testing

### Test locally
```bash
bun run dev
```

### Test Vercel preview
```bash
vercel
```

### Test production
```bash
vercel --prod
```

