import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

export const SESSION_COOKIE = "session";
export const SESSION_HOURS = 8;

export const ROLES = ["ADMIN", "MANAGER", "DRIVER", "REQUESTER"] as const;
export type RoleName = (typeof ROLES)[number];

const secret = new TextEncoder().encode(config.JWT_SECRET);

export async function createSessionToken(user: { id: number; role: string }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret);
}

// Returns the user id stored in the token, or null if the token is invalid, tampered with or expired.
export async function verifySessionToken(
  token: string,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
