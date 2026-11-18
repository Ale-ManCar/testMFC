import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const current = "scrypt-15-8-3";
const hexSalt = /^[0-9a-f]{32}$/;
const hexHash = /^[0-9a-f]{128}$/;
export const temporaryPassword = () => randomBytes(18).toString("base64url");

function derive(password: string, salt: string, legacy = false) {
  const options = { N: legacy ? 16384 : 32768, r: 8, p: legacy ? 1 : 3, maxmem: 64 * 1024 * 1024 };
  return new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, options, (error, key) => {
    if (error) reject(error);
    else resolve(key);
  }));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return [current, salt, hash.toString("hex")].join(":");
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":");
  const legacy = parts.length === 2;
  const [salt, hash] = legacy ? parts : parts.slice(1);
  if ((!legacy && (parts.length !== 3 || parts[0] !== current)) || !hexSalt.test(salt) || !hexHash.test(hash)) return false;
  const actual = await derive(password, salt, legacy);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export const dummyPasswordHash = current + ":" + "0".repeat(32) + ":" + "0".repeat(128);
