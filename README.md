# tool-bitville

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
Login lấy JWT
curl -s http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'

  TOKEN="PASTE_JWT_HERE"

curl -s http://localhost:3000/api/providers/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "provider":"stripe",
    "config":{"apiKey":"sk_xxx","accountId":"acct_xxx","extra":{"env":"test"}}
  }'

RUN TEST
  curl -s http://localhost:3000/api/test \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "url":"https://httpbin.org/post",
    "provider":"stripe",
    "input":{"hello":"world"}
  }'


  Reset Docker 

  docker compose down -v
docker compose up -d

Check DB Ready

docker logs api_test_tool_db --tail 50

Run DB Migrate

bun run src/scripts/migrate.ts
bun run src/scripts/seed.ts