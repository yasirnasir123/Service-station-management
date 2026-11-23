import {
  scrypt as raw,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(raw);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await scrypt(password, salt, 64)).toString("hex");
}
export async function verifyPassword(password, hash) {
  try {
    const [salt, h] = hash.split(":");
    const actual = await scrypt(password, salt, 64);
    const expected = Buffer.from(h, "hex");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
export function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return (
    data + "." + createHmac("sha256", secret).update(data).digest("base64url")
  );
}
export function unsign(token, secret) {
  try {
    const [data, sig] = token.split(".");
    const expected = createHmac("sha256", secret).update(data).digest();
    const got = Buffer.from(sig, "base64url");
    if (got.length !== expected.length || !timingSafeEqual(got, expected))
      return null;
    const p = JSON.parse(Buffer.from(data, "base64url"));
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}
