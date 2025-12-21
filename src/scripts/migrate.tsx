import { sql } from "../db";

const initSql = await Bun.file("db/init.sql").text();
await sql.unsafe(initSql);
console.log("✅ Migrated schema");
await sql.end();