import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Category,
  DashboardPrefs,
  Goal,
  InsertCategory,
  InsertGoal,
  InsertRecurringTransaction,
  InsertTransaction,
  InsertUser,
  RecurringTransaction,
  Transaction,
  categories,
  dashboardPrefs,
  goals,
  recurringTransactions,
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

export async function updateUserCurrency(userId: number, currency: "BRL" | "USD"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ currency }).where(eq(users.id, userId));
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategoriesByUser(userId: number): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.name);
}

export async function checkCategoryOwnership(categoryId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  return result.length > 0;
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

  // Check for linked records before deleting
  const [txCount] = await db
    .select({ count: count() })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)));
  const [recCount] = await db
    .select({ count: count() })
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.categoryId, id), eq(recurringTransactions.userId, userId)));
  const [goalCount] = await db
    .select({ count: count() })
    .from(goals)
    .where(and(eq(goals.categoryId, id), eq(goals.userId, userId)));

  const total = (txCount?.count ?? 0) + (recCount?.count ?? 0) + (goalCount?.count ?? 0);
  if (total > 0) {
    const parts: string[] = [];
    if ((txCount?.count ?? 0) > 0) parts.push(`${txCount.count} transação(s)`);
    if ((recCount?.count ?? 0) > 0) parts.push(`${recCount.count} recorrência(s)`);
    if ((goalCount?.count ?? 0) > 0) parts.push(`${goalCount.count} meta(s)`);
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Não é possível excluir: categoria possui ${parts.join(", ")} vinculada(s). Remova ou reatribua antes de excluir.`,
    });
  }

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

export type TransactionWithCategory = Omit<Transaction, never> & {
  categoryName: string | null;
  categoryColor: string | null;
};

export async function getTransactions(
  filters: TransactionFilters
): Promise<TransactionWithCategory[]> {
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
      recurringId: transactions.recurringId,
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

  // Fetch raw rows and aggregate by month in JS to avoid DATE_FORMAT issues in Drizzle GROUP BY
  const rows = await db
    .select({
      type: transactions.type,
      date: transactions.date,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, startDate)));

  const map = new Map<string, { type: string; month: string; total: number }>();
  for (const row of rows) {
    const d = new Date(row.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const key = `${monthKey}-${row.type}`;
    if (!map.has(key)) map.set(key, { type: row.type, month: monthKey, total: 0 });
    map.get(key)!.total += parseFloat(row.amount);
  }
  return Array.from(map.values())
    .map((r) => ({
      type: r.type as "income" | "expense",
      month: r.month,
      total: r.total.toFixed(2),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
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
    .groupBy(transactions.categoryId, categories.name, categories.color, transactions.type);

  return rows;
}

// ─── Recurring Transactions ──────────────────────────────────────────────────

export async function getRecurringByUser(userId: number): Promise<
  (RecurringTransaction & { categoryName: string | null; categoryColor: string | null })[]
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: recurringTransactions.id,
      userId: recurringTransactions.userId,
      name: recurringTransactions.name,
      amount: recurringTransactions.amount,
      type: recurringTransactions.type,
      categoryId: recurringTransactions.categoryId,
      dayOfMonth: recurringTransactions.dayOfMonth,
      active: recurringTransactions.active,
      lastGeneratedMonth: recurringTransactions.lastGeneratedMonth,
      createdAt: recurringTransactions.createdAt,
      updatedAt: recurringTransactions.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(recurringTransactions)
    .leftJoin(
      categories,
      and(
        eq(recurringTransactions.categoryId, categories.id),
        eq(categories.userId, userId)
      )
    )
    .where(eq(recurringTransactions.userId, userId))
    .orderBy(recurringTransactions.name);
  return rows;
}

export async function createRecurring(
  data: InsertRecurringTransaction
): Promise<RecurringTransaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(recurringTransactions).values(data).$returningId();
  const [rec] = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, result.id))
    .limit(1);
  return rec;
}

export async function updateRecurring(
  id: number,
  userId: number,
  data: Partial<
    Pick<
      InsertRecurringTransaction,
      "name" | "amount" | "type" | "categoryId" | "dayOfMonth" | "active"
    >
  >
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(recurringTransactions)
    .set(data)
    .where(
      and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId))
    );
}

export async function deleteRecurring(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(recurringTransactions)
    .where(
      and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId))
    );
}

/**
 * Generates transactions for all active recurring entries that haven't been
 * generated for the given month yet. Returns the number of transactions created.
 */
export async function generateRecurringForMonth(
  userId: number,
  year: number,
  month: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const pending = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.active, "yes"),
        sql`(${recurringTransactions.lastGeneratedMonth} IS NULL OR ${recurringTransactions.lastGeneratedMonth} < ${monthKey})`
      )
    );

  if (pending.length === 0) return 0;

  let created = 0;
  for (const rec of pending) {
    // Clamp day to last day of month (e.g. Feb 31 → Feb 28)
    const maxDay = new Date(year, month, 0).getDate();
    const day = Math.min(rec.dayOfMonth, maxDay);
    const date = new Date(year, month - 1, day, 12, 0, 0);

    // Wrap INSERT + UPDATE in a single atomic transaction to prevent duplicates
    // if two concurrent requests race for the same recurring entry.
    await db.transaction(async (tx) => {
      // SELECT FOR UPDATE locks this row for the duration of the transaction,
      // serialising concurrent requests so only one can proceed past this point.
      // tx.execute() returns [rows, fields] — destructure rows first, then get the first row.
      const [rows] = await tx.execute(
        sql`SELECT lastGeneratedMonth FROM recurring_transactions WHERE id = ${rec.id} FOR UPDATE`
      ) as unknown as [{ lastGeneratedMonth: string | null }[]];
      const current = rows[0];

      if (
        current &&
        current.lastGeneratedMonth !== null &&
        current.lastGeneratedMonth >= monthKey
      ) {
        // Already generated by a concurrent request — skip
        return;
      }

      await tx.insert(transactions).values({
        userId,
        amount: rec.amount,
        date,
        description: rec.name,
        categoryId: rec.categoryId,
        type: rec.type,
        recurringId: rec.id,
      });

      await tx
        .update(recurringTransactions)
        .set({ lastGeneratedMonth: monthKey })
        .where(eq(recurringTransactions.id, rec.id));

      created++;
    });
  }

  return created;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export interface GoalWithProgress {
  id: number;
  userId: number;
  categoryId: number | null;
  name: string;
  targetAmount: string;
  type: "income" | "expense";
  yearMonth: string;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
  spent: string;
  percentage: number;
}

export async function getGoalsWithProgress(
  userId: number,
  year: number,
  month: number
): Promise<GoalWithProgress[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  // Fetch goals for user filtered by yearMonth
  const goalsRows = await db
    .select({
      id: goals.id,
      userId: goals.userId,
      categoryId: goals.categoryId,
      name: goals.name,
      targetAmount: goals.targetAmount,
      type: goals.type,
      yearMonth: goals.yearMonth,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(goals)
    .leftJoin(categories, and(eq(goals.categoryId, categories.id), eq(categories.userId, userId)))
    .where(and(eq(goals.userId, userId), eq(goals.yearMonth, yearMonth)))
    .orderBy(goals.name);

  if (goalsRows.length === 0) return [];

  // Fetch spending per category for the month
  const spendingRows = await db
    .select({
      categoryId: transactions.categoryId,
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
    .groupBy(transactions.categoryId, transactions.type);

  // Build a map: categoryId+type -> total
  const spendingMap = new Map<string, number>();
  for (const row of spendingRows) {
    const key = `${row.categoryId ?? "null"}-${row.type}`;
    spendingMap.set(key, parseFloat(row.total ?? "0"));
  }

  // Build total per type (for goals without a specific category)
  const totalByType = new Map<string, number>();
  for (const row of spendingRows) {
    const prev = totalByType.get(row.type) ?? 0;
    totalByType.set(row.type, prev + parseFloat(row.total ?? "0"));
  }

  return goalsRows.map((g) => {
    let spent: number;
    if (g.categoryId === null) {
      // No specific category: track total spending of this type
      spent = totalByType.get(g.type) ?? 0;
    } else {
      const key = `${g.categoryId}-${g.type}`;
      spent = spendingMap.get(key) ?? 0;
    }
    const target = parseFloat(g.targetAmount);
    const percentage = target > 0 ? Math.round((spent / target) * 100) : 0;
    return {
      ...g,
      spent: spent.toFixed(2),
      percentage,
    };
  });
}

export async function createGoal(data: InsertGoal): Promise<Goal> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(goals).values(data).$returningId();
  const [goal] = await db.select().from(goals).where(eq(goals.id, result.id)).limit(1);
  return goal;
}

export async function updateGoal(
  id: number,
  userId: number,
  data: Partial<Pick<InsertGoal, "name" | "targetAmount" | "categoryId" | "type" | "yearMonth">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(goals)
    .set(data)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function deleteGoal(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

/**
 * Copies all goals from the previous month into targetYearMonth.
 * Only copies if targetYearMonth has NO goals yet.
 * Returns the number of goals copied (0 if source is empty or target already has goals).
 */
export async function copyGoalsFromPreviousMonth(
  userId: number,
  targetYearMonth: string // "YYYY-MM"
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Compute previous month
  const [yearStr, monthStr] = targetYearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const sourceYearMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  // Check if target already has goals
  const existing = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.yearMonth, targetYearMonth)))
    .limit(1);
  if (existing.length > 0) return 0;

  // Fetch source goals
  const sourceGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.yearMonth, sourceYearMonth)));
  if (sourceGoals.length === 0) return 0;

  // Insert copies with new yearMonth
  await db.insert(goals).values(
    sourceGoals.map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => ({
      ...rest,
      yearMonth: targetYearMonth,
    }))
  );

  return sourceGoals.length;
}

// ─── Dashboard Preferences ───────────────────────────────────────────────────

export const DEFAULT_WIDGET_ORDER = [
  "summary",
  "chart",
  "recent",
  "goals",
] as const;

export type WidgetId = (typeof DEFAULT_WIDGET_ORDER)[number];

export async function getDashboardPrefs(
  userId: number
): Promise<{ widgetOrder: WidgetId[]; hiddenWidgets: WidgetId[] }> {
  const db = await getDb();
  if (!db) return { widgetOrder: [...DEFAULT_WIDGET_ORDER], hiddenWidgets: [] };

  const [row] = await db
    .select()
    .from(dashboardPrefs)
    .where(eq(dashboardPrefs.userId, userId))
    .limit(1);

  if (!row) return { widgetOrder: [...DEFAULT_WIDGET_ORDER], hiddenWidgets: [] };

  // Safely parse JSON — fall back to defaults if the stored value is corrupted
  const safeParse = (json: string | null, fallback: WidgetId[]): WidgetId[] => {
    try {
      const parsed = JSON.parse(json || "[]");
      if (!Array.isArray(parsed)) return fallback;
      return parsed.filter((w: unknown) =>
        typeof w === "string" && DEFAULT_WIDGET_ORDER.includes(w as WidgetId)
      ) as WidgetId[];
    } catch {
      return fallback;
    }
  };

  const widgetOrder = safeParse(row.widgetOrder, [...DEFAULT_WIDGET_ORDER]);
  const hiddenWidgets = safeParse(row.hiddenWidgets, []);

  // Ensure all default widgets are present in order (handle new widgets added later)
  const merged = [
    ...widgetOrder.filter((w) => DEFAULT_WIDGET_ORDER.includes(w as WidgetId)),
    ...DEFAULT_WIDGET_ORDER.filter((w) => !widgetOrder.includes(w)),
  ] as WidgetId[];

  return { widgetOrder: merged, hiddenWidgets };
}

export async function saveDashboardPrefs(
  userId: number,
  widgetOrder: WidgetId[],
  hiddenWidgets: WidgetId[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderJson = JSON.stringify(widgetOrder);
  const hiddenJson = JSON.stringify(hiddenWidgets);

  await db
    .insert(dashboardPrefs)
    .values({ userId, widgetOrder: orderJson, hiddenWidgets: hiddenJson })
    .onDuplicateKeyUpdate({
      set: { widgetOrder: orderJson, hiddenWidgets: hiddenJson },
    });
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
