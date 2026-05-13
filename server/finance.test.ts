import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getCategoriesByUser: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Alimentação", color: "#f97316", icon: "utensils", type: "expense", createdAt: new Date(), updatedAt: new Date() },
  ]),
  createCategory: vi.fn().mockResolvedValue({
    id: 2, userId: 1, name: "Salário", color: "#22c55e", icon: "briefcase", type: "income", createdAt: new Date(), updatedAt: new Date()
  }),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  getTransactions: vi.fn().mockResolvedValue([
    {
      id: 1, userId: 1, amount: "150.00", date: new Date(), description: "Supermercado",
      categoryId: 1, type: "expense", createdAt: new Date(), updatedAt: new Date(),
      categoryName: "Alimentação", categoryColor: "#f97316"
    },
  ]),
  createTransaction: vi.fn().mockResolvedValue({
    id: 2, userId: 1, amount: "3000.00", date: new Date(), description: "Salário",
    categoryId: null, type: "income", createdAt: new Date(), updatedAt: new Date()
  }),
  updateTransaction: vi.fn().mockResolvedValue(undefined),
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
  getMonthlySummary: vi.fn().mockResolvedValue({ income: "3000.00", expense: "150.00" }),
  getTotalBalance: vi.fn().mockResolvedValue("2850.00"),
  getMonthlyEvolution: vi.fn().mockResolvedValue([
    { type: "income", month: "2026-05", total: "3000.00" },
    { type: "expense", month: "2026-05", total: "150.00" },
  ]),
  getCategoryBreakdown: vi.fn().mockResolvedValue([
    { categoryId: 1, categoryName: "Alimentação", categoryColor: "#f97316", type: "expense", total: "150.00" },
  ]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("categories router", () => {
  it("lists categories for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.categories.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alimentação");
  });

  it("creates a new category", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.categories.create({
      name: "Salário",
      color: "#22c55e",
      icon: "briefcase",
      type: "income",
    });
    expect(result.name).toBe("Salário");
    expect(result.type).toBe("income");
  });

  it("updates a category", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.categories.update({ id: 1, name: "Comida" })
    ).resolves.toBeUndefined();
  });

  it("deletes a category", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.categories.delete({ id: 1 })).resolves.toBeUndefined();
  });
});

describe("transactions router", () => {
  it("lists transactions for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.transactions.list({});
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Supermercado");
    expect(result[0].type).toBe("expense");
  });

  it("creates a new transaction", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.transactions.create({
      type: "income",
      amount: "3000.00",
      date: new Date(),
      description: "Salário",
      categoryId: null,
    });
    expect(result.amount).toBe("3000.00");
    expect(result.type).toBe("income");
  });

  it("updates a transaction", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.transactions.update({ id: 1, description: "Mercado" })
    ).resolves.toBeUndefined();
  });

  it("deletes a transaction", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.transactions.delete({ id: 1 })).resolves.toBeUndefined();
  });
});

describe("reports router", () => {
  it("returns monthly summary", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.reports.summary({ year: 2026, month: 5 });
    expect(result.income).toBe("3000.00");
    expect(result.expense).toBe("150.00");
  });

  it("returns total balance", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.reports.totalBalance();
    expect(result).toBe("2850.00");
  });

  it("returns monthly evolution", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.reports.monthlyEvolution({ months: 6 });
    expect(result).toHaveLength(2);
  });

  it("returns category breakdown", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.reports.categoryBreakdown({ year: 2026, month: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].categoryName).toBe("Alimentação");
  });
});
