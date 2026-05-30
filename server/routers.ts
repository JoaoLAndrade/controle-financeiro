import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCategory,
  copyGoalsFromPreviousMonth,
  createGoal,
  createRecurring,
  createTransaction,
  deleteCategory,
  deleteGoal,
  deleteRecurring,
  deleteTransaction,
  generateRecurringForMonth,
  getCategoriesByUser,
  getCategoryBreakdown,
  getGoalsWithProgress,
  getMonthlyEvolution,
  getMonthlySummary,
  getRecurringByUser,
  getTotalBalance,
  getTransactions,
  updateCategory,
  updateGoal,
  updateRecurring,
  updateTransaction,
} from "./db";

// ─── Categories Router ────────────────────────────────────────────────────────

const categoriesRouter = router({
  list: protectedProcedure.query(({ ctx }) => getCategoriesByUser(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().default("#6366f1"),
        icon: z.string().default("tag"),
        type: z.enum(["income", "expense", "both"]).default("both"),
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
        color: z.string().optional(),
        icon: z.string().optional(),
        type: z.enum(["income", "expense", "both"]).optional(),
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
        type: z.enum(["income", "expense"]).optional(),
        categoryId: z.number().optional(),
      }).optional()
    )
    .query(({ ctx, input }) =>
      getTransactions({ userId: ctx.user.id, ...input })
    ),

  create: protectedProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        date: z.date(),
        description: z.string().min(1).max(255),
        categoryId: z.number().nullable().optional(),
        type: z.enum(["income", "expense"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const cats = await getCategoriesByUser(ctx.user.id);
        if (!cats.find((c) => c.id === input.categoryId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Categoria n\u00e3o pertence ao usu\u00e1rio" });
        }
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
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        date: z.date().optional(),
        description: z.string().min(1).max(255).optional(),
        categoryId: z.number().nullable().optional(),
        type: z.enum(["income", "expense"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const cats = await getCategoriesByUser(ctx.user.id);
        if (!cats.find((c) => c.id === input.categoryId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Categoria n\u00e3o pertence ao usu\u00e1rio" });
        }
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
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
    .query(({ ctx, input }) =>
      getMonthlySummary(ctx.user.id, input.year, input.month)
    ),

  totalBalance: protectedProcedure.query(({ ctx }) => getTotalBalance(ctx.user.id)),

  monthlyEvolution: protectedProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(6) }).optional())
    .query(({ ctx, input }) => getMonthlyEvolution(ctx.user.id, input?.months ?? 6)),

  categoryBreakdown: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
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
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        type: z.enum(["income", "expense"]),
        categoryId: z.number().nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate categoryId ownership
      if (input.categoryId) {
        const cats = await getCategoriesByUser(ctx.user.id);
        if (!cats.find((c) => c.id === input.categoryId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Categoria n\u00e3o pertence ao usu\u00e1rio" });
        }
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
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        type: z.enum(["income", "expense"]).optional(),
        categoryId: z.number().nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        active: z.enum(["yes", "no"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate categoryId ownership
      if (input.categoryId) {
        const cats = await getCategoriesByUser(ctx.user.id);
        if (!cats.find((c) => c.id === input.categoryId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Categoria n\u00e3o pertence ao usu\u00e1rio" });
        }
      }
      const { id, ...data } = input;
      return updateRecurring(id, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteRecurring(input.id, ctx.user.id)),

  generateForMonth: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
    .mutation(({ ctx, input }) =>
      generateRecurringForMonth(ctx.user.id, input.year, input.month)
    ),
});

// ─── Goals Router ───────────────────────────────────────────────────────────────

const goalsRouter = router({
  list: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
    .query(({ ctx, input }) =>
      getGoalsWithProgress(ctx.user.id, input.year, input.month)
    ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        type: z.enum(["income", "expense"]).default("expense"),
        categoryId: z.number().nullable().optional(),
        yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const cats = await getCategoriesByUser(ctx.user.id);
        if (!cats.find((c) => c.id === input.categoryId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Categoria n\u00e3o pertence ao usu\u00e1rio" });
        }
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
        targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        type: z.enum(["income", "expense"]).optional(),
        categoryId: z.number().nullable().optional(),
        yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.categoryId) {
        const cats = await getCategoriesByUser(ctx.user.id);
        if (!cats.find((c) => c.id === input.categoryId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Categoria n\u00e3o pertence ao usu\u00e1rio" });
        }
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

// ─── App Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  categories: categoriesRouter,
  transactions: transactionsRouter,
  reports: reportsRouter,
  recurring: recurringRouter,
  goals: goalsRouter,
});

export type AppRouter = typeof appRouter;
