function normalizeRoleCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]+/g, '_') : '';
}

export function isAdminHeadRole(role: { code?: unknown; name?: unknown }): boolean {
  return normalizeRoleCode(role.code) === 'ADMIN_HEAD' || normalizeRoleCode(role.name) === 'ADMIN_HEAD';
}

export function isAdminHeadRoleCode(value: unknown): boolean {
  return normalizeRoleCode(value) === 'ADMIN_HEAD';
}

export function isRetiredRole(role: { code?: unknown; name?: unknown }): boolean {
  return normalizeRoleCode(role.code) === "MH" || normalizeRoleCode(role.name) === "MARKETING_HEAD";
}
