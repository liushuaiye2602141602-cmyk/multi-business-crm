import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const writePattern = /prisma\.[A-Za-z0-9_]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/;
const allowedWriteFiles = [
  "lib/kernel/",
  "lib/services/",
  "lib/activity-log.ts",
  "lib/events/bus.ts",
  "lib/local-context.ts",
  "scripts/test-",
  "scripts/generate-",
  "scripts/cleanup-",
  "prisma/seed.ts",
].map((item) => item.replaceAll("/", "\\"));

const dashboardActions = execSync("rg --files app/(dashboard) -g actions.ts", { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const directDashboardWrites = dashboardActions.filter((file) => {
  const content = readFileSync(join(root, file), "utf8");
  return writePattern.test(content);
});

const allWriteLocations = execSync(
  "rg \"prisma\\.[A-Za-z0-9_]+\\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\\s*\\(\" app lib scripts prisma -g \"*.ts\" -g \"*.tsx\" -n",
  { encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !line.includes("lib\\generated\\prisma") && !line.includes("lib/generated/prisma"));

const bypassLocations = allWriteLocations.filter((line) => {
  const file = line.split(":")[0];
  const normalized = relative(root, join(root, file)).replaceAll("/", "\\");
  return !allowedWriteFiles.some((prefix) => normalized.startsWith(prefix));
});

const kernelFiles = [
  "lib/kernel/system-gate.ts",
  "lib/kernel/action-registry.ts",
  "lib/kernel/execution-kernel.ts",
];

for (const file of kernelFiles) {
  readFileSync(join(root, file), "utf8");
}

assert(directDashboardWrites.length === 0, `dashboard actions still have direct writes:\n${directDashboardWrites.join("\n")}`);
assert(bypassLocations.length === 0, `non-kernel business write locations remain:\n${bypassLocations.join("\n")}`);

console.log(JSON.stringify({
  dashboardActionCount: dashboardActions.length,
  directDashboardWriteCount: directDashboardWrites.length,
  scannedWriteCount: allWriteLocations.length,
  bypassWriteCount: bypassLocations.length,
  allowedWritePrefixes: allowedWriteFiles,
}, null, 2));
