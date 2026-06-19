import prisma from "./prisma";

const LOCAL_WORKSPACE_ID = 1;
const LOCAL_USER_ID = 1;

let initialized = false;

export async function ensureLocalContext() {
  if (initialized) return;

  // Ensure LocalWorkspace (Tenant id=1)
  const existing = await prisma.tenant.findUnique({ where: { id: LOCAL_WORKSPACE_ID } });
  if (!existing) {
    await prisma.tenant.create({
      data: { id: LOCAL_WORKSPACE_ID, name: "Local Workspace", plan: "FREE" },
    });
  }

  // Ensure LocalUser (User id=1)
  const user = await prisma.user.findUnique({ where: { id: LOCAL_USER_ID } });
  if (!user) {
    await prisma.user.create({
      data: { id: LOCAL_USER_ID, name: "Local User", email: "local@localhost", password: "local", role: "ADMIN", tenantId: LOCAL_WORKSPACE_ID },
    });
  }

  initialized = true;
}

export function getLocalWorkspaceId(): number {
  return LOCAL_WORKSPACE_ID;
}

export function getLocalUserId(): number {
  return LOCAL_USER_ID;
}
