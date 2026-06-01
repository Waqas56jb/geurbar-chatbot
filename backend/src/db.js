// Single shared PrismaClient instance for the whole backend.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["warn", "error"],
});

export default prisma;
