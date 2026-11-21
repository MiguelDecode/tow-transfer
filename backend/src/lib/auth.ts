import { SignJWT } from "jose";
import { config } from "../config.js";

export const SESSION_COOKIE = "session";
export const SESSION_HOURS = 8;

const secret = new TextEncoder().encode(config.JWT_SECRET);

export async function createSessionToken(user: { id: number; role: string }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret);
}
