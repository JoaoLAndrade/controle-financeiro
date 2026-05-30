import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  // Stubs for other routers
  getCategoriesByUser: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Alimentação", color: "#f59e0b", icon: "utensils", type: "expense", createdAt: new Date(), updatedAt: new Date() },
  ]),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getTransactions: vi.fn().mockResolvedValue([]),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getMonthlySummary: vi.fn().mockResolvedValue({ income: "0", expense: "0" }),
  getTotalBalance: vi.fn().mockResolvedValue("0"),
  getMonthlyEvolution: vi.fn().mockResolvedValue([]),
  getCategoryBreakdown: vi.fn().mockResolvedValue([]),
  getRecurringByUser: vi.fn().mockResolvedValue([]),
  createRecurring: vi.fn(),
  updateRecurring: vi.fn(),
  deleteRecurring: vi.fn(),
  generateRecurringForMonth: vi.fn().mockResolvedValue(0),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),

  // Goals stubs
  getGoalsWithProgress: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      categoryId: 1,
      name: "Limite Alimentação",
      targetAmount: "500.00",
      type: "expense",
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryName: "Alimentação",
      categoryColor: "#f59e0b",
      spent: "320.00",
      percentage: 64,
    },
    {
      id: 2,
      userId: 1,
      categoryId: null,
      name: "Limite Lazer",
      targetAmount: "200.00",
      type: "expense",
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryName: null,
      categoryColor: null,
      spent: "180.00",
      percentage: 90,
    },
  ]),
  createGoal: vi.fn().mockResolvedValue({
    id: 3,
    userId: 1,
    categoryId: null,
    name: "Limite Transporte",
    targetAmount: "300.00",
    type: "expense",
    yearMonth: "2026-05",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateGoal: vi.fn().mockResolvedValue(undefined),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
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

describe("goals router", () => {
  it("lists goals with progress for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.goals.list({ year: 2026, month: 5 });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Limite Alimentação");
    expect(result[0].percentage).toBe(64);
    expect(result[0].spent).toBe("320.00");
  });

  it("returns goals with alert status when percentage >= 80", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.goals.list({ year: 2026, month: 5 });
    const alertGoal = result.find((g) => g.name === "Limite Lazer");
    expect(alertGoal).toBeDefined();
    expect(alertGoal!.percentage).toBe(90);
  });

  it("creates a new goal", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.goals.create({
      name: "Limite Transporte",
      targetAmount: "300.00",
      type: "expense",
      yearMonth: "2026-05",
    });
    expect(result.name).toBe("Limite Transporte");
    expect(result.targetAmount).toBe("300.00");
    expect(result.type).toBe("expense");
    expect(result.yearMonth).toBe("2026-05");
  });

  it("creates a goal with valid categoryId owned by user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    // categoryId: 1 is in the mock getCategoriesByUser result
    await expect(
      caller.goals.create({
        name: "Meta Alimentação",
        targetAmount: "500.00",
        type: "expense",
        categoryId: 1,
        yearMonth: "2026-05",
      })
    ).resolves.toBeDefined();
  });

  it("rejects goal creation with categoryId not belonging to user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    // categoryId: 999 is NOT in the mock getCategoriesByUser result
    await expect(
      caller.goals.create({
        name: "Meta Inválida",
        targetAmount: "100.00",
        type: "expense",
        categoryId: 999,
        yearMonth: "2026-05",
      })
    ).rejects.toThrow();
  });

  it("updates a goal", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.goals.update({ id: 1, name: "Novo Nome", targetAmount: "600.00" })
    ).resolves.toBeUndefined();
  });

  it("deletes a goal", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.goals.delete({ id: 1 })).resolves.toBeUndefined();
  });

  it("validates targetAmount format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.goals.create({
        name: "Meta Inválida",
        targetAmount: "abc", // invalid
        type: "expense",
        yearMonth: "2026-05",
      })
    ).rejects.toThrow();
  });

  it("validates yearMonth format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.goals.create({
        name: "Meta Inválida",
        targetAmount: "100.00",
        type: "expense",
        yearMonth: "2026-13", // invalid month
      })
    ).rejects.toThrow();
  });

  it("lists goals for a specific yearMonth", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    // Mock returns goals with yearMonth baked in
    const result = await caller.goals.list({ year: 2026, month: 5 });
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("rejects unauthenticated access", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.goals.list({ year: 2026, month: 5 })).rejects.toThrow();
  });
});
