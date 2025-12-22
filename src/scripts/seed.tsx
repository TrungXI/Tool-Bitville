import { sql } from "../db";
import bcrypt from "bcryptjs";

async function main() {
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
    console.log("✅ Seeded:");
    console.log("   login:", email, "/", password);
    console.log("   provider: stripe configured");
}

await main();
await sql.end();