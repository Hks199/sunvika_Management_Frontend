export type BranchChoice = { value: string; label: string };
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function referenceId(value: unknown): string {
  return typeof value === 'string' ? value : String(object(value)?._id ?? '');
}
export function employeeDistrictId(address: unknown): string { return referenceId(object(address)?.district); }
export function branchChoices(data: unknown, current: unknown): BranchChoice[] {
  const choices = Array.isArray(data) ? data.flatMap(item => {
    const branch = object(item);
    return branch && typeof branch._id === 'string' && typeof branch.name === 'string' && branch.isActive !== false
      ? [{ value: branch._id, label: branch.name + (typeof branch.code === 'string' && branch.code ? ` (${branch.code})` : '') }] : [];
  }) : [];
  const currentId = referenceId(current), branch = object(current);
  if (currentId && !choices.some(item => item.value === currentId)) {
    choices.unshift({ value: currentId, label: typeof branch?.name === 'string' ? `${branch.name} (current)` : 'Current branch (unavailable)' });
  }
  return choices;
}
export function branchSelectionUpdate(current: unknown, selected: string, choices: BranchChoice[]): { branch?: string | null } {
  if (referenceId(current) === selected) return {};
  if (selected && !choices.some(item => item.value === selected)) throw new Error('Choose an available branch from the list.');
  return { branch: selected || null };
}
