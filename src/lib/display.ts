type DisplayRecord = Record<string, unknown>;

const hiddenKeys = new Set(['_id', '__v', 'passwordHash', 'failedLoginAttempts', 'lockedUntil', 's3Key', 'uploadId', 'tokenHash']);
const objectIdPattern = /^[a-f\d]{24}$/i;

function isRecord(value: unknown): value is DisplayRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function personDisplay(value: DisplayRecord): string {
  const name = [value.firstName, value.lastName]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .join(' ');
  const employeeCode = typeof value.employeeCode === 'string' ? value.employeeCode : '';
  return [name, employeeCode].filter(Boolean).join(' · ');
}

function namedValue(value: DisplayRecord): string | undefined {
  const person = personDisplay(value);
  if (person) return person;
  for (const key of ['name', 'fullName', 'employeeName', 'customerName', 'employeeCode', 'leadCode', 'quotationNumber', 'contractNumber', 'documentType', 'fileName', 'label', 'code']) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return undefined;
}

export function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return objectIdPattern.test(value) ? 'Linked record' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(displayValue).filter((item) => item !== '—').join(', ') || '—';
  if (isRecord(value)) {
    if ('$numberDecimal' in value) {
      const decimal = value.$numberDecimal;
      return typeof decimal === 'string' || typeof decimal === 'number' ? decimal.toLocaleString('en-IN') : '—';
    }
    const name = namedValue(value);
    if (name) return name;
    const details = Object.entries(value)
      .filter(([key]) => !hiddenKeys.has(key))
      .map(([key, item]) => `${key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}: ${displayValue(item)}`)
      .filter((item) => !item.endsWith(': —'));
    return details.length ? details.join(', ') : '—';
  }
  return '—';
}

export function displayJson(value: unknown): string {
  return JSON.stringify(value, (key, item: unknown) => {
    if (hiddenKeys.has(key)) return undefined;
    if (typeof item === 'string' && objectIdPattern.test(item)) return 'Linked record';
    return item;
  }, 2);
}
