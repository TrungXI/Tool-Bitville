import { sql } from "../db";
import bcrypt from "bcryptjs";

async function main() {
    // seed provider
    await sql`
    insert into providers(key, standard_map, default_headers)
    values (
      'stripe',
      ${sql.json({ authType: "bearer", authField: "apiKey", providerAccountField: "accountId" })},
      ${sql.json({ "Content-Type": "application/json" })}
    )
    on conflict (key) do nothing
  `;

    // seed user
    const email = "admin@example.com";
    const password = "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await sql`
    insert into users(email, password_hash)
    values (${email}, ${passwordHash})
    on conflict (email) do update set email = excluded.email
    returning id
  `;

    // seed user_provider config
    await sql`
    insert into user_providers(user_id, provider_key, config)
    values (
      ${user.id},
      'stripe',
      ${sql.json({ apiKey: "sk_test_account_001", accountId: "acct_001", extra: { env: "test" } })}
    )
    on conflict (user_id, provider_key) do update set config = excluded.config
  `;

    console.log("✅ Seeded:");
    console.log("   login:", email, "/", password);
    console.log("   provider: stripe configured");
}

await main();
await sql.end();