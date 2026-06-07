import crypto from "crypto";

const API_KEY_PREFIX = "crm_sk_";

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  return `${API_KEY_PREFIX}${randomBytes.toString("hex")}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  return computedHash === hash;
}
