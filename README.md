# API Test Tool

A modern API testing tool built with **Bun**, **Elysia**, and **React TypeScript (TSX)**.

## Tech Stack

- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **Backend Framework**: Elysia (TypeScript-first web framework)
- **Frontend**: React 19 with TypeScript (TSX)
- **Database**: PostgreSQL
- **Language**: TypeScript/TSX (all files use `.tsx` extension)

## Features

- ✅ **Provider-based Testing**: Support multiple API providers (Stripe, Shope, etc.)
- ✅ **Dynamic UI**: Context fields and input fields configured per provider
- ✅ **Test Case System**: Define test cases with steps, dependencies, and assertions
- ✅ **Sequential Execution**: Test cases run one after another
- ✅ **Custom Assertions**: Balance checks, error message validation, etc.
- ✅ **Response Field Mapping**: Configurable field paths per provider
- ✅ **Account-based Permissions**: JWT authentication with provider access control
- ✅ **Default Values**: Per-account, per-provider default values

## Project Structure

```
Tool-Bitville/
├── src/
│   ├── index.tsx              # Main Elysia server
│   ├── db.tsx                 # Database connection
│   ├── testRunner.tsx        # Test execution engine
│   └── hardcoded/
│       ├── providers.tsx      # Provider configurations
│       ├── accounts.tsx       # Account permissions (re-export)
│       ├── accounts/
│       │   ├── index.tsx      # Account aggregation
│       │   ├── types.tsx      # Account types
│       │   ├── stripe.tsx     # Stripe account config
│       │   └── shope.tsx      # Shope account config
│       └── testcases/
│           ├── index.tsx      # Test suites aggregation
│           ├── _types.tsx     # Test case types
│           ├── stripe.tsx     # Stripe test cases
│           └── shope.tsx      # Shope test cases
├── public/
│   ├── app.html               # Main app page
│   ├── app.tsx                # React TSX frontend
│   ├── app.css                # Styles
│   ├── index.html             # Landing page
│   └── login.html             # Login page
├── db/                        # Database migrations
├── scripts/                   # Utility scripts
└── package.json
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed (v1.3.5+)
- PostgreSQL database running

### Installation
## Setup

1. Clone repo
2. Copy env file
   ```bash
   cp .env.example .env
   
```bash
# Install dependencies
bun install
```

### Database Setup

```bash
# Start PostgreSQL (using Docker)
docker compose up -d

# Run migrations
bun run src/scripts/migrate.tsx

# Seed initial data
bun run src/scripts/seed.tsx
```

### Development

```bash
# Start dev server with hot reload
bun run dev

# Or start production server
bun run start
```

Server will start at `http://localhost:3000`

## Usage

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Get Providers

```bash
curl http://localhost:3000/api/providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Run All Test Cases

```bash
curl -X POST http://localhost:3000/api/run-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": "stripe",
    "context": {
      "url": "https://api.stripe.example.com",
      "operatorId": "operator123",
      "secretKey": "sk_test_...",
      "playerId": "player123",
      "currencyId": "USD",
      "gameId": "game123"
    },
    "providerInput": {
      "amount": 1000,
      "providerId": "provider123"
    }
  }'
```

### 4. Run Single Test Case

```bash
curl -X POST http://localhost:3000/api/run-case \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": "stripe",
    "caseId": "balance_debit_balance_check",
    "context": { ... },
    "providerInput": { ... }
  }'
```

## TypeScript/TSX

This project uses **TypeScript/TSX** throughout:

- ✅ All backend files: `.tsx` (TypeScript with JSX support)
- ✅ Frontend: `app.tsx` (React TSX)
- ✅ Type-safe: Full TypeScript type checking
- ✅ No build step: Bun transpiles TSX on-the-fly

### Why TSX for Backend?

- **Consistency**: Same extension for all TypeScript files
- **Future-proof**: Easy to add JSX/TSX if needed
- **Bun Support**: Bun handles `.tsx` files natively
- **No Performance Impact**: Bun transpiles directly, no overhead

## Docker Commands

```bash
# Reset database
docker compose down -v
docker compose up -d

# Check database logs
docker logs api_test_tool_db --tail 50
```

## Documentation

- **[ADD_NEW_PROVIDER.md](./ADD_NEW_PROVIDER.md)**: Guide to add new providers
- **[TEST_CASE_FLOW.md](./TEST_CASE_FLOW.md)**: Test case execution flow documentation

## Default Accounts

- **admin@example.com** / `admin123` - Access to all providers
- **user1@example.com** / `user123` - Limited provider access

## API Endpoints

- `GET /` - Landing page
- `GET /login` - Login page
- `GET /app` - Main application
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/providers` - Get available providers for current user
- `GET /api/testcases?provider=stripe` - Get test cases for provider
- `POST /api/run-all` - Run all test cases for provider
- `POST /api/run-case` - Run single test case
- `GET /api/health` - Health check

## Development Notes

- **Hot Reload**: `bun run dev` watches for file changes
- **TypeScript**: No separate build step needed
- **Frontend**: React TSX is transpiled on-the-fly by Bun
- **Database**: Uses PostgreSQL with `postgres` package

## License

Private project
