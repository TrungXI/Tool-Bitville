import "dotenv/config";
import postgres from "postgres";
const DATABASE_URL =
    process.env.DATABASE_URL_POOL || process.env.DATABASE_URL

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Please create a .env file with your Neon database URL.");
}

export const sql = postgres(DATABASE_URL, {
    ssl: "require",
    max: 5,
    idle_timeout: 30,
});