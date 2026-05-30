import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS dashboard_prefs (
      id int AUTO_INCREMENT NOT NULL,
      userId int NOT NULL,
      widgetOrder text NOT NULL DEFAULT ('[]'),
      hiddenWidgets text NOT NULL DEFAULT ('[]'),
      createdAt timestamp NOT NULL DEFAULT (now()),
      updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT dashboard_prefs_id PRIMARY KEY(id),
      CONSTRAINT dashboard_prefs_userId_unique UNIQUE(userId)
    )
  `);
  const [rows] = await conn.execute("SHOW TABLES LIKE 'dashboard_prefs'");
  console.log("Table dashboard_prefs:", rows.length > 0 ? "EXISTS ✓" : "NOT FOUND ✗");
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await conn.end();
}
