"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "./auth";
import { db } from "./db";

const filter = z.object({
  year: z.string().max(9), parallel: z.string().max(1), query: z.string().trim().max(100),
  status: z.enum(["all", "new", "started", "done"]), page: z.number().int().min(1).max(10000),
});
export type RosterFilter = z.infer<typeof filter>;

export async function readRoster(filters: RosterFilter) {
  await requireRole("DECE");
  const { year, parallel, query, status, page } = filter.parse(filters);
  const scope: Prisma.EnrollmentWhereInput = year ? { yearId: year } : {};
  const states = {
    all: {},
    new: { attempt: { is: null } },
    started: { attempt: { is: { completedAt: null } } },
    done: { attempt: { is: { completedAt: { not: null } } } },
  } satisfies Record<string, Prisma.EnrollmentWhereInput>;
  const search = query.replace(/[\\%_]/g, "\\$&");
  const text = { contains: search, mode: "insensitive" } as const;
  const where: Prisma.EnrollmentWhereInput = {
    ...scope, ...states[status], ...(parallel ? { parallelId: parallel } : {}),
    ...(query ? { OR: [{ student: { code: text } }, { student: { user: { name: text } } }, { student: { user: { username: text } } }] } : {}),
  };
  const [total, fresh, started, done, filtered, rows] = await db.$transaction([
    db.enrollment.count({ where: scope }), db.enrollment.count({ where: { ...scope, ...states.new } }),
    db.enrollment.count({ where: { ...scope, ...states.started } }), db.enrollment.count({ where: { ...scope, ...states.done } }),
    db.enrollment.count({ where }),
    db.enrollment.findMany({ where, skip: (page - 1) * 25, take: 25,
      orderBy: [{ student: { user: { name: "asc" } } }, { id: "asc" }],
      select: { id: true, yearId: true, parallelId: true, student: { select: { code: true, user: { select: { name: true } } } },
        attempt: { select: { id: true, completedAt: true } } },
    }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { total, fresh, started, done, filtered, rows };
}
