// Single-user mode - no authentication required
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  tenantId: number | null;
}

// Return a default local user
export function getCurrentUser(): AuthUser {
  return {
    id: 1,
    name: "Local User",
    email: "local@localhost",
    role: "ADMIN",
    tenantId: null,
  };
}

export function requireAuth(): AuthUser {
  return getCurrentUser();
}
