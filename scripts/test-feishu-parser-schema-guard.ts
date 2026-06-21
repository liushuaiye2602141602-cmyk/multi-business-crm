import { parseFeishuIntent } from "../lib/im/feishu-parser";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const forbiddenKeys = [
  "keyword",
  "ownerId",
  "aiScore",
  "followUps",
  "emails",
  "messages",
  "tasks",
  "projects",
];

function collectKeys(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectKeys(item, `${path}[${index}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    path ? `${path}.${key}` : key,
    ...collectKeys(child, path ? `${path}.${key}` : key),
  ]);
}

const parsed = parseFeishuIntent(
  "添加线索，NovaPet Packaging，美国，联系人David Lee，邮箱david@novapet.example.invalid，需求10kg宠物食品袋",
);

assert(parsed.intent === "CREATE_LEAD", `expected CREATE_LEAD, got ${parsed.intent}`);

const keys = collectKeys(parsed);
for (const forbidden of forbiddenKeys) {
  assert(
    !keys.some((key) => key.split(".").includes(forbidden)),
    `parser output leaked forbidden key "${forbidden}": ${JSON.stringify(parsed)}`,
  );
}

assert((parsed as any).entityHint?.company === "NovaPet Packaging", "entityHint.company must contain company");
assert((parsed as any).entityHint?.contact === "David Lee", "entityHint.contact must contain contact");
assert((parsed as any).entityHint?.email === "david@novapet.example.invalid", "entityHint.email must contain email");
assert((parsed as any).entityHint?.country === "美国", "entityHint.country must contain country");

console.log("Feishu parser schema guard passed");
