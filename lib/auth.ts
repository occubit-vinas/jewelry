import crypto from "crypto";

/**
 * Derives a secure PBKDF2 hash from a plain text password and a random salt.
 * Returns the format `salt:hash`.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored `salt:hash` string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  const salt = parts[0];
  const hash = parts[1];
  
  if (!salt || !hash) return false;

  const verify = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  
  return hash === verify;
}
