import { describe, it, expect, vi } from "vitest";
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
  getRecurringByUser: vi.fn().mockResolvedValue([]),
  createRecurring: vi.fn(),
  updateRecurring: vi.fn(),
  deleteRecurring: vi.fn(),
  generateRecurringForMonth: vi.fn().mockResolvedValue(0),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getGoalsWithProgress: vi.fn().mockResolvedValue([]),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  copyGoalsFromPreviousMonth: vi.fn().mockResolvedValue(0),

  // Dashboard stubs
  getDashboardPrefs: vi.fn().mockResolvedValue({ widgetOrder: ["summary", "chart", "recent", "goals"], hiddenWidgets: [] }),
  saveDashboardPrefs: vi.fn().mockResolvedValue(undefined),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      role: "user",
      loginMethod: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("dashboard router", () => {
  it("returns default prefs for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.dashboard.getPrefs();
    expect(result.widgetOrder).toEqual(["summary", "chart", "recent", "goals"]);
    expect(result.hiddenWidgets).toEqual([]);
  });

  it("saves prefs with valid widgetOrder and hiddenWidgets", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.dashboard.savePrefs({
        widgetOrder: ["goals", "summary", "chart", "recent"],
        hiddenWidgets: ["recent"],
      })
    ).resolves.toBeUndefined();
  });

  it("rejects invalid widget ids in widgetOrder", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.dashboard.savePrefs({
        widgetOrder: ["goals", "invalid_widget" as any],
        hiddenWidgets: [],
      })
    ).rejects.toThrow();
  });

  it("rejects invalid widget ids in hiddenWidgets", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.dashboard.savePrefs({
        widgetOrder: ["summary", "chart", "recent", "goals"],
        hiddenWidgets: ["not_a_widget" as any],
      })
    ).rejects.toThrow();
  });

  it("rejects getPrefs when unauthenticated", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.dashboard.getPrefs()).rejects.toThrow();
  });

  it("rejects savePrefs when unauthenticated", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(
      caller.dashboard.savePrefs({
        widgetOrder: ["summary", "chart", "recent", "goals"],
        hiddenWidgets: [],
      })
    ).rejects.toThrow();
  });

  it("allows saving empty hiddenWidgets (all visible)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.dashboard.savePrefs({
        widgetOrder: ["summary", "chart", "recent", "goals"],
        hiddenWidgets: [],
      })
    ).resolves.toBeUndefined();
  });

  it("allows hiding all widgets", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.dashboard.savePrefs({
        widgetOrder: ["summary", "chart", "recent", "goals"],
        hiddenWidgets: ["summary", "chart", "recent", "goals"],
      })
    ).resolves.toBeUndefined();
  });
});
