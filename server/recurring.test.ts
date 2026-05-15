import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  // Stubs for other routers
  getCategoriesByUser: vi.fn().mockResolvedValue([]),
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
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),

  // Recurring stubs
  getRecurringByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Aluguel",
      amount: "1500.00",
      type: "expense",
      categoryId: null,
      dayOfMonth: 5,
      active: "yes",
      lastGeneratedMonth: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryName: null,
      categoryColor: null,
    },
  ]),
  createRecurring: vi.fn().mockResolvedValue({
    id: 2,
    userId: 1,
    name: "Salário",
    amount: "5000.00",
    type: "income",
    categoryId: null,
    dayOfMonth: 1,
    active: "yes",
    lastGeneratedMonth: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateRecurring: vi.fn().mockResolvedValue(undefined),
  deleteRecurring: vi.fn().mockResolvedValue(undefined),
  generateRecurringForMonth: vi.fn().mockResolvedValue(2),
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

describe("recurring router", () => {
  it("lists recurring transactions for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.recurring.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Aluguel");
    expect(result[0].dayOfMonth).toBe(5);
  });

  it("creates a new recurring transaction", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.recurring.create({
      name: "Salário",
      amount: "5000.00",
      type: "income",
      dayOfMonth: 1,
    });
    expect(result.name).toBe("Salário");
    expect(result.type).toBe("income");
    expect(result.active).toBe("yes");
  });

  it("updates a recurring transaction (toggle active)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.recurring.update({ id: 1, active: "no" })
    ).resolves.toBeUndefined();
  });

  it("deletes a recurring transaction", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.recurring.delete({ id: 1 })).resolves.toBeUndefined();
  });

  it("generates recurring transactions for a given month", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const count = await caller.recurring.generateForMonth({ year: 2026, month: 5 });
    expect(count).toBe(2);
  });

  it("validates dayOfMonth range (1-31)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.recurring.create({
        name: "Teste",
        amount: "100.00",
        type: "expense",
        dayOfMonth: 0, // invalid
      })
    ).rejects.toThrow();
  });

  it("validates amount format", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.recurring.create({
        name: "Teste",
        amount: "abc", // invalid
        type: "expense",
        dayOfMonth: 10,
      })
    ).rejects.toThrow();
  });
});
