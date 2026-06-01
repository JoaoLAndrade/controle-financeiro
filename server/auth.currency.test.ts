import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the updateUserCurrency helper
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    updateUserCurrency: vi.fn().mockResolvedValue(undefined),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.updateCurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves BRL preference and calls helper with correct args", async () => {
    const ctx = createAuthContext(42);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.updateCurrency({ currency: "BRL" });

    expect(result).toEqual({ currency: "BRL" });
    expect(db.updateUserCurrency).toHaveBeenCalledOnce();
    expect(db.updateUserCurrency).toHaveBeenCalledWith(42, "BRL");
  });

  it("saves USD preference and calls helper with correct args", async () => {
    const ctx = createAuthContext(7);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.updateCurrency({ currency: "USD" });

    expect(result).toEqual({ currency: "USD" });
    expect(db.updateUserCurrency).toHaveBeenCalledOnce();
    expect(db.updateUserCurrency).toHaveBeenCalledWith(7, "USD");
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.updateCurrency({ currency: "BRL" })).rejects.toThrow(
      TRPCError
    );
    expect(db.updateUserCurrency).not.toHaveBeenCalled();
  });

  it("rejects invalid currency values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.updateCurrency({ currency: "EUR" as "BRL" | "USD" })
    ).rejects.toThrow();
    expect(db.updateUserCurrency).not.toHaveBeenCalled();
  });

  it("propagates database errors to the caller", async () => {
    vi.mocked(db.updateUserCurrency).mockRejectedValueOnce(new Error("DB connection lost"));
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.updateCurrency({ currency: "BRL" })).rejects.toThrow(
      "DB connection lost"
    );
  });
});
