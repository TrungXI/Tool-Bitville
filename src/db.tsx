import "dotenv/config";
import postgres from "postgres";

// Lazy initialization - only create connection when needed
// This prevents module-level errors in serverless environments
let sqlInstance: ReturnType<typeof postgres> | null = null;

function getSql() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set. Please create a .env file with your Neon database URL.");
    }
    
    if (!sqlInstance) {
        sqlInstance = postgres(process.env.DATABASE_URL, {
            ssl: "require",
            max: 5,
            idle_timeout: 30,
        });
    }
    
    return sqlInstance;
}

export const sql = new Proxy({} as ReturnType<typeof postgres>, {
    get(_target, prop) {
        return getSql()[prop as keyof ReturnType<typeof postgres>];
    }
});