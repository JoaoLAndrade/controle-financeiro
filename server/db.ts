import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Category,
  InsertCategory,
  InsertTransaction,
  InsertUser,
  Transaction,
  categories,
  transactions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategoriesByUser(userId: number): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.name);
}

export async function createCategory(data: InsertCategory): Promise<Category> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(categories).values(data).$returningId();
  const [cat] = await db.select().from(categories).where(eq(categories.id, result.id)).limit(1);
  return cat;
}

export async function updateCategory(
  id: number,
  userId: number,
  data: Partial<Pick<InsertCategory, "name" | "color" | "icon" | "type">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(categories)
    .set(data)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

export async function deleteCategory(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionFilters {
  userId: number;
  startDate?: Date;
  endDate?: Date;
  type?: "income" | "expense";
  categoryId?: number;
}

export async function getTransactions(
  filters: TransactionFilters
): Promise<(Transaction & { categoryName: string | null; categoryColor: string | null })[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(transactions.userId, filters.userId)];
  if (filters.startDate) conditions.push(gte(transactions.date, filters.startDate));
  if (filters.endDate) conditions.push(lte(transactions.date, filters.endDate));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));

  const rows = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      amount: transactions.amount,
      date: transactions.date,
      description: transactions.description,
      categoryId: transactions.categoryId,
      type: transactions.type,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(eq(transactions.categoryId, categories.id), eq(categories.userId, filters.userId))
    )
    .where(and(...conditions))
    .orderBy(desc(transactions.date));

  return rows;
}

export async function createTransaction(data: InsertTransaction): Promise<Transaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(transactions).values(data).$returningId();
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, result.id))
    .limit(1);
  return tx;
}

export async function updateTransaction(
  id: number,
  userId: number,
  data: Partial<Pick<InsertTransaction, "amount" | "date" | "description" | "categoryId" | "type">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(transactions)
    .set(data)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function deleteTransaction(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ─── Summary / Reports ────────────────────────────────────────────────────────

export async function getMonthlySummary(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return { income: "0", expense: "0" };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .groupBy(transactions.type);

  const income = rows.find((r) => r.type === "income")?.total ?? "0";
  const expense = rows.find((r) => r.type === "expense")?.total ?? "0";
  return { income, expense };
}

export async function getMonthlyEvolution(userId: number, months: number = 6) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      type: transactions.type,
      month: sql<string>`DATE_FORMAT(${transactions.date}, '%Y-%m')`,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, startDate)))
    .groupBy(sql`DATE_FORMAT(${transactions.date}, '%Y-%m')`, transactions.type)
    .orderBy(sql`DATE_FORMAT(${transactions.date}, '%Y-%m')`);

  return rows;
}

export async function getCategoryBreakdown(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      type: transactions.type,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.color, transactions.type)
    .orderBy(sql`SUM(${transactions.amount}) DESC`);

  return rows;
}

export async function getTotalBalance(userId: number) {
  const db = await getDb();
  if (!db) return "0";

  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.type);

  const income = parseFloat(rows.find((r) => r.type === "income")?.total ?? "0");
  const expense = parseFloat(rows.find((r) => r.type === "expense")?.total ?? "0");
  return (income - expense).toFixed(2);
}
