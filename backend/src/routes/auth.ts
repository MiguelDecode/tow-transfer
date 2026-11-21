import { currentUser, requireAuth } from "../middleware/auth.js";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import {
  SESSION_COOKIE,
  SESSION_HOURS,
  createSessionToken,
} from "../lib/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

// Compared when the user does not exist, so the response time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax",
} as const;

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !user.active || !passwordOk) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = await createSessionToken(user);
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    centerId: user.centerId,
  });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(currentUser(req));
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "New password must be between 8 and 72 characters" });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: currentUser(req).id },
  });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  if (currentPassword === newPassword) {
    res.status(400).json({ error: "New password must be different" });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.status(204).end();
});
