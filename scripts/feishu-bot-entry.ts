/**
 * Feishu bot startup entry.
 * Loads runtime env before importing modules that initialize Prisma or Feishu clients.
 */
import { loadEnvConfig } from "@next/env";
import fs from "node:fs";

function loadRuntimeEnvOverrides() {
  const envPath = `${process.cwd()}\\.env`;
  if (!fs.existsSync(envPath)) return;
  const allowed = /^(DATABASE_URL|FEISHU_)/;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index);
    if (!allowed.test(key)) continue;
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
    process.env[key] = value;
  }
}

loadEnvConfig(process.cwd());
loadRuntimeEnvOverrides();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || typeof dbUrl !== "string" || dbUrl.length === 0) {
  console.error("Feishu bot startup failed: DATABASE_URL is not configured.");
  process.exit(1);
}

console.log("Environment variables loaded.");

import("./feishu-bot").then(({ startFeishuBot }) => {
  startFeishuBot().catch((err) => {
    console.error("Feishu bot startup failed", err);
    process.exit(1);
  });
});
