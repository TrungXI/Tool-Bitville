import "dotenv/config";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Please create a .env file with your Neon database URL.");
}

export const sql = postgres(process.env.DATABASE_URL, {
    ssl: "require",
    max: 5,
    idle_timeout: 30,
});