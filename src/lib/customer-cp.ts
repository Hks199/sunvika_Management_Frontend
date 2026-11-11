import type { CpDraft, Person } from './calling-lists';

export type CustomerCpOptions = {
  managers: Person[];
  cpEmployee: string | null;
  defaults: { customerName: string; mobileNumber: string; addressLine: string; state: string; district: string; branch: string; email?: string; firstName?: string; lastName?: string; reportingManagerId?: string };
};
export function customerCpDraft(defaults: CustomerCpOptions['defaults']): CpDraft {
  const parts = defaults.customerName.trim().split(/\s+/);
  return { firstName: defaults.firstName ?? parts[0] ?? '', lastName: defaults.lastName ?? parts.slice(1).join(' '), email: defaults.email ?? '', mobileNumber: defaults.mobileNumber,
    addressLine: defaults.addressLine, state: defaults.state, district: defaults.district, city: '', pincode: '' };
}
