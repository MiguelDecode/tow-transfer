import { z } from "zod";

// Validates ":id" route parameters.
export const idParamSchema = z.coerce.number().int().positive();

// Prisma does not accept properties explicitly set to undefined (because of exactOptionalPropertyTypes), so we remove them.
export function omitUndefined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as { [K in keyof T]?: Exclude<T[K], undefined> };
}
