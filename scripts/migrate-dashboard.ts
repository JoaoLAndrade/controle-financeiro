import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

  const conn = await mysql.createConnection(url);
  const db = drizzle(conn);

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS dashboard_prefs (
        id int AUTO_INCREMENT NOT NULL,
        userId int NOT NULL,
        widgetOrder text NOT NULL,
        hiddenWidgets text NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT dashboard_prefs_id PRIMARY KEY(id),
        CONSTRAINT dashboard_prefs_userId_unique UNIQUE(userId)
      )
    `);
    const [rows] = await conn.execute("SHOW TABLES LIKE 'dashboard_prefs'");
    console.log("dashboard_prefs table:", (rows as any[]).length > 0 ? "EXISTS ✓" : "NOT FOUND ✗");
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

main();
