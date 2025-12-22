import app from "./index";
import { sql } from "./db";

const PORT = Number(process.env.PORT);

app.listen(PORT);
console.log(`✅ http://localhost:${PORT}`);

process.on("SIGINT", async () => {
    await sql.end({ timeout: 5 });
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await sql.end({ timeout: 5 });
    process.exit(0);
});