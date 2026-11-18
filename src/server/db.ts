import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as typeof globalThis & { vocacionalDb?: PrismaClient };
export const db = globalDb.vocacionalDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.vocacionalDb = db;
