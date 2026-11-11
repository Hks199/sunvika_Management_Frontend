export const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MAX_EXCEL_SIZE = 5 * 1024 * 1024;
export type Person = { _id: string; firstName?: string; lastName?: string; employeeCode?: string };
export type CallingList = { _id: string; title: string; fileName: string; uploadedBy?: Person; assignedTo?: Person | null; rowCount: number; createdAt: string };
export type Candidate = { _id: string; rowNumber: number; values: string[]; employee?: string | null };
export type CallingPreview = { _id: string; title: string; headers: string[]; rows: Candidate[]; total: number; page: number; limit: number };
export type CpDraft = { firstName: string; lastName: string; email: string; mobileNumber: string; addressLine: string; state: string; district: string; city: string; pincode: string };
export function personName(person?: Person | null) { return person ? [person.firstName, person.lastName].filter(Boolean).join(' ') || person.employeeCode || person._id : 'Unassigned'; }
export function candidateDraft(headers: string[], values: string[]): CpDraft {
  const cells = new Map(headers.map((header, index) => [header.toLowerCase().replace(/[^a-z0-9]/g, ''), values[index] ?? '']));
  const read = (...names: string[]) => names.map(name => cells.get(name)).find(Boolean) ?? '';
  const fullName = read('name', 'fullname', 'candidatename').trim().split(/\s+/);
  return { firstName: read('firstname') || fullName[0] || '', lastName: read('lastname', 'surname') || fullName.slice(1).join(' '),
    email: read('email', 'emailaddress'), mobileNumber: read('mobilenumber', 'mobile', 'phone', 'phonenumber', 'contactnumber'),
    addressLine: read('addressline', 'address'), state: read('stateid'), district: read('districtid'), city: read('city'), pincode: read('pincode', 'postalcode', 'zipcode') };
}
export function cpPayload(draft: CpDraft) {
  return { roleCode: 'CP', firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), email: draft.email.trim(), mobileNumber: draft.mobileNumber.trim(),
    address: { addressLine: draft.addressLine.trim(), state: draft.state, district: draft.district,
      ...(draft.city.trim() ? { city: draft.city.trim() } : {}), ...(draft.pincode.trim() ? { pincode: draft.pincode.trim() } : {}) } };
}
