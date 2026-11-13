export const cpCustomerDocuments = ['PAN', 'AADHAAR', 'ELECTRICITY_BILL', 'BANK_PASSBOOK'] as const;
export type CpCustomerDocument = typeof cpCustomerDocuments[number];
export type CpCustomerOptions = { customerId: string | null; defaults: Record<string, string> };
export type CustomerPlace = { _id: string; name: string };
export const cpCustomerFields = [
  ['customerName', 'Customer name', 'text', 160], ['mobileNumber', 'Mobile number', 'tel', 16],
  ['alternateNumber', 'Alternate number (optional)', 'tel', 16], ['siteAddress', 'Site address', 'text', 1000],
  ['blockOrTehsil', 'Block / tehsil (optional)', 'text', 120], ['requiredCapacityKW', 'Capacity (kW)', 'number', 10],
  ['ratePerKW', 'Rate per kW', 'number', 15], ['paymentMode', 'Payment mode', 'text', 100],
  ['panelBrand', 'Panel brand', 'text', 100], ['panelTechnology', 'Panel technology', 'text', 100],
  ['remark', 'Conversion note', 'text', 1000],
] as const;
export function cpCustomerPayload(draft: Record<string, string>) {
  const value = (key: string) => (draft[key] ?? '').trim();
  for (const [key, label] of cpCustomerFields) if (!['alternateNumber', 'blockOrTehsil'].includes(key) && !value(key)) throw new Error(`${label} is required.`);
  if (value('customerName').length < 2 || value('siteAddress').length < 3) throw new Error('Enter the full customer name and site address.');
  if (!/^\+?[0-9]{10,15}$/.test(value('mobileNumber')) || (value('alternateNumber') && !/^\+?[0-9]{10,15}$/.test(value('alternateNumber')))) throw new Error('Enter a valid mobile number (10–15 digits).');
  if (!['state', 'district', 'branch'].every(key => /^[a-f\d]{24}$/i.test(value(key)))) throw new Error('Select a state, district and branch.');
  const capacity = Number(value('requiredCapacityKW')), rate = Number(value('ratePerKW'));
  if (!Number.isFinite(capacity) || capacity < 0.1 || capacity > 100000 || !Number.isFinite(rate) || rate < 0 || rate > 100000000) throw new Error('Enter a capacity from 0.1 to 100,000 kW and a valid non-negative rate.');
  return { ...Object.fromEntries([...cpCustomerFields.map(([key]) => key), 'state', 'district', 'branch'].filter(key => value(key)).map(key => [key, value(key)])), requiredCapacityKW: capacity, ratePerKW: rate, confirmed: true };
}
