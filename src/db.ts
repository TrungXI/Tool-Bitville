import "dotenv/config";
import postgres from "postgres";

export const sql = postgres({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "api_test_tool",
    username: process.env.PGUSER ?? "app",
    password: process.env.PGPASSWORD ?? "app"
});