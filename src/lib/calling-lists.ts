export const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MAX_EXCEL_SIZE = 5 * 1024 * 1024;
export type Person = { _id: string; firstName?: string; lastName?: string; employeeCode?: string; isActive?: boolean };
export type CallingList = { _id: string; title: string; fileName: string; uploadedBy?: Person; assignedTo?: Person | null; rowCount: number; originalRowCount: number | null; convertedCount: number; unconvertedCount: number; deletedCount: number | null; totalCallingCount: number | null; calledCount: number; interestedCount: number; followUpCount: number; notCalledCount: number; createdAt: string };
export type Candidate = { _id: string; rowNumber: number; values: string[]; employee?: string | null; callStatus?: CallStatus; callNote?: string; nextFollowUpAt?: string | null; lastCalledAt?: string | null };
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

export function totalCalling(list: Pick<CallingList, 'deletedCount' | 'convertedCount' | 'interestedCount' | 'followUpCount'>): number | null {
  return typeof list.deletedCount === 'number' && typeof list.convertedCount === 'number'
    ? list.deletedCount + list.convertedCount + (list.interestedCount ?? 0) + (list.followUpCount ?? 0) : null;
}

export type CallStatus = 'NOT_CALLED' | 'INTERESTED' | 'NEEDS_FOLLOWUP' | 'NOT_INTERESTED';
export const CALL_STATUSES: { value: CallStatus; label: string }[] = [{ value: 'NOT_CALLED', label: 'Not called' }, { value: 'INTERESTED', label: 'Interested' }, { value: 'NEEDS_FOLLOWUP', label: 'Needs follow-up' }, { value: 'NOT_INTERESTED', label: 'Not interested' }];
export function callStatusLabel(candidate: Candidate) { return candidate.employee ? 'Converted to CP' : CALL_STATUSES.find(option => option.value === (candidate.callStatus ?? 'NOT_CALLED'))?.label ?? 'Not called'; }
