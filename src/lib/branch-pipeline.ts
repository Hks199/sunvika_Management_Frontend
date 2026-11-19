export type BranchPipelineRow = { _id: string; name: string; leads: number | null; converted: number | null };
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function branchPipeline(value: unknown): BranchPipelineRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    return [{
      _id: String(item._id ?? `unassigned-${index}`),
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Unassigned / unavailable branch',
      leads: count(item.leads), converted: count(item.converted),
    }];
  }).sort((a, b) => (b.leads ?? -1) - (a.leads ?? -1) || a.name.localeCompare(b.name) || a._id.localeCompare(b._id));
}
