import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  copyGoalsFromPreviousMonth,
  createCategory,
  createGoal,
  createRecurring,
  createTransaction,
  deleteCategory,
  deleteGoal,
  deleteRecurring,
  deleteTransaction,
  generateRecurringForMonth,
  checkCategoryOwnership,
  getCategoriesByUser,
  updateUserCurrency,
  getCategoryBreakdown,
  getDashboardPrefs,
  getGoalsWithProgress,
  getMonthlyEvolution,
  getMonthlySummary,
  getRecurringByUser,
  getTotalBalance,
  getTransactions,
  saveDashboardPrefs,
  updateCategory,
  updateGoal,
  updateRecurring,
  updateTransaction,
  type WidgetId,
} from "./db";

// ─── Categories Router ────────────────────────────────────────────────────────

const categoriesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCategoriesByUser(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366f1"),
        icon: z.string().default("tag"),
        type: z.enum(["income", "expense", "both", "transfer"]).default("both"),
      })
    )
    .mutation(({ ctx, input }) =>
      createCategory({ ...input, userId: ctx.user.id })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().optional(),
        type: z.enum(["income", "expense", "both", "transfer"]).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return updateCategory(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteCategory(input.id, ctx.user.id)),
});

// ─── Transactions Router ──────────────────────────────────────────────────────

const transactionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        type: z.enum(["income", "expense", "transfer"]).optional(),
        categoryId: z.number().optional(),
        status: z.enum(["confirmed", "pending"]).optional(),
      }).optional()
    )
    .query(({ ctx, input }) =>
      getTransactions({ userId: ctx.user.id, ...input })
    ),

  create: protectedProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Valor deve ser maior que zero" }),
        date: z.date(),
        description: z.string().min(1).max(255),
        categoryId: z.number().nullable().optional(),
        type: z.enum(["income", "expense", "transfer"]),
        status: z.enum(["confirmed", "pending"]).default("confirmed"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const owns = await checkCategoryOwnership(input.categoryId, ctx.user.id);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN", message: "Categoria não pertence ao usuário" });
      }
      return createTransaction({
        ...input,
        userId: ctx.user.id,
        categoryId: input.categoryId ?? null,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Valor deve ser maior que zero" }).optional(),
        date: z.date().optional(),
        description: z.string().min(1).max(255).optional(),
        categoryId: z.number().nullable().optional(),
        type: z.enum(["income", "expense", "transfer"]).optional(),
        status: z.enum(["confirmed", "pending"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const owns = await checkCategoryOwnership(input.categoryId, ctx.user.id);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN", message: "Categoria não pertence ao usuário" });
      }
      const { id, ...data } = input;
      return updateTransaction(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteTransaction(input.id, ctx.user.id)),
});

// ─── Reports Router ───────────────────────────────────────────────────────────

const reportsRouter = router({
  summary: protectedProcedure
    .input(z.object({ year: z.number().min(2000).max(2100), month: z.number().min(1).max(12) }))
    .query(({ ctx, input }) =>
      getMonthlySummary(ctx.user.id, input.year, input.month)
    ),

  totalBalance: protectedProcedure.query(({ ctx }) => getTotalBalance(ctx.user.id)),

  monthlyEvolution: protectedProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(6) }).optional())
    .query(({ ctx, input }) => getMonthlyEvolution(ctx.user.id, input?.months ?? 6)),

  categoryBreakdown: protectedProcedure
    .input(z.object({ year: z.number().min(2000).max(2100), month: z.number().min(1).max(12) }))
    .query(({ ctx, input }) =>
      getCategoryBreakdown(ctx.user.id, input.year, input.month)
    ),
});

// ─── Recurring Router ───────────────────────────────────────────────

const recurringRouter = router({
  list: protectedProcedure.query(({ ctx }) => getRecurringByUser(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Valor deve ser maior que zero" }),
        type: z.enum(["income", "expense", "transfer"]),
        categoryId: z.number().nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate categoryId ownership
      if (input.categoryId) {
        const owns = await checkCategoryOwnership(input.categoryId, ctx.user.id);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN", message: "Categoria não pertence ao usuário" });
      }
      return createRecurring({
        ...input,
        userId: ctx.user.id,
        categoryId: input.categoryId ?? null,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Valor deve ser maior que zero" }).optional(),
        type: z.enum(["income", "expense", "transfer"]).optional(),
        categoryId: z.number().nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        active: z.enum(["yes", "no"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate categoryId ownership
      if (input.categoryId) {
        const owns = await checkCategoryOwnership(input.categoryId, ctx.user.id);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN", message: "Categoria não pertence ao usuário" });
      }
      const { id, ...data } = input;
      return updateRecurring(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteRecurring(input.id, ctx.user.id)),

  generateForMonth: protectedProcedure
    .input(z.object({ year: z.number().min(2000).max(2100), month: z.number().min(1).max(12) }))
    .mutation(({ ctx, input }) =>
      generateRecurringForMonth(ctx.user.id, input.year, input.month)
    ),
});

// ─── Goals Router ───────────────────────────────────────────────────────────────

const goalsRouter = router({
  list: protectedProcedure
    .input(z.object({ year: z.number().min(2000).max(2100), month: z.number().min(1).max(12) }))
    .query(({ ctx, input }) =>
      getGoalsWithProgress(ctx.user.id, input.year, input.month)
    ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Valor deve ser maior que zero" }),
        type: z.enum(["income", "expense"]).default("expense"),
        categoryId: z.number().nullable().optional(),
        yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const owns = await checkCategoryOwnership(input.categoryId, ctx.user.id);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN", message: "Categoria não pertence ao usuário" });
      }
      return createGoal({
        ...input,
        userId: ctx.user.id,
        categoryId: input.categoryId ?? null,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Valor deve ser maior que zero" }).optional(),
        type: z.enum(["income", "expense"]).optional(),
        categoryId: z.number().nullable().optional(),
        yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const owns = await checkCategoryOwnership(input.categoryId, ctx.user.id);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN", message: "Categoria não pertence ao usuário" });
      }
      const { id, ...data } = input;
      return updateGoal(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteGoal(input.id, ctx.user.id)),

  copyFromPrevious: protectedProcedure
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }))
    .mutation(({ ctx, input }) =>
      copyGoalsFromPreviousMonth(ctx.user.id, input.yearMonth)
    ),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────────────────────────────

const VALID_WIDGETS = ["summary", "chart", "recent", "goals"] as const;

const dashboardRouter = router({
  getPrefs: protectedProcedure.query(({ ctx }) =>
    getDashboardPrefs(ctx.user.id)
  ),

  savePrefs: protectedProcedure
    .input(
      z.object({
        widgetOrder: z.array(z.enum(VALID_WIDGETS)),
        hiddenWidgets: z.array(z.enum(VALID_WIDGETS)),
      })
    )
    .mutation(({ ctx, input }) =>
      saveDashboardPrefs(
        ctx.user.id,
        input.widgetOrder as WidgetId[],
        input.hiddenWidgets as WidgetId[]
      )
    ),
});

// ─── App Router ─────────────────────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateCurrency: protectedProcedure
      .input(z.object({ currency: z.enum(["BRL", "USD"]) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserCurrency(ctx.user.id, input.currency);
        return { currency: input.currency };
      }),
  }),
  categories: categoriesRouter,
  transactions: transactionsRouter,
  reports: reportsRouter,
  recurring: recurringRouter,
  goals: goalsRouter,
  dashboard: dashboardRouter,
});
export type AppRouter = typeof appRouter;