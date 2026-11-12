import { useEffect, useState, type FormEvent } from 'react';
import { Download, ExternalLink, RefreshCw, Share2, X } from 'lucide-react';
import { api } from '../lib/api';
import { branchChoices, branchSelectionUpdate, employeeDistrictId, type BranchChoice } from '../lib/employee-branches';
import { useAuth } from '../state/auth';
import CustomerCpConversion from './CustomerCpConversion';
import { displayJson, displayValue } from '../lib/display';

const endpoints: Record<string, string> = {
  leads: '/leads',
  visits: '/visits',
  customers: '/customers',
  quotations: '/quotations',
  amc: '/amc',
  employees: '/employees',
};

type RecordValue = Record<string, unknown>;
type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[] };
const actionFields: Record<string, Field[]> = {
  'lead-status': [{ name: 'status', label: 'New status', type: 'select', required: true, options: ['PENDING', 'INTERESTED', 'NOT_INTERESTED', 'SITE_VISITED', 'NEED_FOLLOWUP', 'QUOTATION_SENT', 'LOST'] }, { name: 'remark', label: 'Status note', required: true }, { name: 'nextFollowUpDate', label: 'Next follow-up', type: 'datetime-local' }],
  'lead-assignment': [{ name: 'assignedTo', label: 'Employee ID', required: true }],
  'lead-edit': [{ name: 'customerName', label: 'Customer name' }, { name: 'mobileNumber', label: 'Mobile number' }, { name: 'alternateNumber', label: 'Alternate number' }, { name: 'blockOrTehsil', label: 'Block / tehsil' }, { name: 'siteAddress', label: 'Site address' }],
  'lead-convert': [{ name: 'requiredCapacityKW', label: 'Capacity (kW)', type: 'number', required: true }, { name: 'ratePerKW', label: 'Rate per kW', type: 'number', required: true }, { name: 'paymentMode', label: 'Payment mode', required: true }, { name: 'panelBrand', label: 'Panel brand', required: true }, { name: 'panelTechnology', label: 'Panel technology', required: true }, { name: 'remark', label: 'Conversion note', required: true }, { name: 'document_PAN', label: 'PAN card (required)', type: 'file', required: true }, { name: 'document_AADHAAR', label: 'Aadhaar card (required)', type: 'file', required: true }, { name: 'document_ELECTRICITY_BILL', label: 'Electricity bill (required)', type: 'file', required: true }, { name: 'document_BANK_PASSBOOK', label: 'Bank passbook (required)', type: 'file', required: true }],
  'visit-edit': [{ name: 'visitDate', label: 'Visit date', type: 'datetime-local' }, { name: 'nextVisitDate', label: 'Next visit', type: 'datetime-local' }, { name: 'remark', label: 'Visit remarks' }],
  'customer-edit': [{ name: 'customerName', label: 'Customer name' }, { name: 'mobileNumber', label: 'Mobile number' }, { name: 'alternateNumber', label: 'Alternate number' }, { name: 'siteAddress', label: 'Site address' }, { name: 'blockOrTehsil', label: 'Block / tehsil' }, { name: 'requiredCapacityKW', label: 'Capacity (kW)', type: 'number' }, { name: 'ratePerKW', label: 'Rate per kW', type: 'number' }, { name: 'paymentMode', label: 'Payment mode' }, { name: 'panelBrand', label: 'Panel brand' }, { name: 'panelTechnology', label: 'Panel technology' }, { name: 'status', label: 'Status', type: 'select', options: ['ONBOARDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }],
  'quotation-share': [{ name: 'mobileNumber', label: 'WhatsApp number for chat-link fallback', required: true }],
  'employee-edit': [{ name: 'firstName', label: 'First name' }, { name: 'middleName', label: 'Middle name' }, { name: 'lastName', label: 'Last name' }, { name: 'mobileNumber', label: 'Mobile number' }, { name: 'branch', label: 'Branch' }],
  'employee-manager': [{ name: 'reportingManagerId', label: 'Reporting manager employee ID', required: true }],
  'amc-renew': [{ name: 'startDate', label: 'Renewal start', type: 'date', required: true }, { name: 'expiryDate', label: 'Renewal expiry', type: 'date', required: true }, { name: 'amount', label: 'Contract amount', type: 'number', required: true }, { name: 'currency', label: 'Currency', required: true }, { name: 'assignedEmployeeId', label: 'Assigned employee ID' }],
  'amc-renewal-status': [{ name: 'renewalStatus', label: 'Renewal status', type: 'select', required: true, options: ['DECLINED', 'NOT_DUE'] }],
  'amc-schedule': [{ name: 'scheduledAt', label: 'Scheduled date', type: 'datetime-local', required: true }, { name: 'assignedEmployeeId', label: 'Assigned employee ID', required: true }, { name: 'notes', label: 'Notes' }],
  'amc-schedule-update': [{ name: 'scheduleId', label: 'Schedule ID', required: true }, { name: 'scheduledAt', label: 'Scheduled date', type: 'datetime-local' }, { name: 'assignedEmployeeId', label: 'Assigned employee ID' }, { name: 'status', label: 'Status', type: 'select', options: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'] }, { name: 'notes', label: 'Notes' }],
  'amc-service': [{ name: 'serviceDate', label: 'Service date', type: 'date', required: true }, { name: 'performedBy', label: 'Employee ID', required: true }, { name: 'scheduleId', label: 'Schedule ID' }, { name: 'outcome', label: 'Outcome', required: true }, { name: 'notes', label: 'Notes' }, { name: 'partsUsed', label: 'Parts used (comma-separated)' }],
};
const leadQuotationFields: Field[] = [
  { name: 'requiredCapacityKW', label: 'Required capacity (kW)', type: 'number', required: true },
  { name: 'ratePerKW', label: 'Rate per kW', type: 'number', required: true },
  { name: 'paymentMode', label: 'Payment mode', required: true },
  { name: 'panelBrand', label: 'Panel brand', required: true },
  { name: 'panelTechnology', label: 'Panel technology', required: true },
  { name: 'termsAndConditions', label: 'Terms and conditions', required: true },
];

const actionLabels: Record<string, string> = {
  'lead-status': 'Update lead status', 'lead-assignment': 'Assign lead', 'lead-edit': 'Edit lead', 'lead-convert': 'Convert lead to customer',
  'visit-edit': 'Update visit', 'customer-edit': 'Edit customer',
  'quotation-share': 'Share quotation via WhatsApp', 'employee-edit': 'Edit employee', 'employee-manager': 'Change reporting manager',
  'amc-renew': 'Renew contract', 'amc-renewal-status': 'Update renewal status', 'amc-schedule': 'Add service schedule',
  'amc-schedule-update': 'Update service schedule', 'amc-service': 'Record service',
};

function label(value: string) {
  const referenceLabels: Record<string, string> = { reportingTo: 'Reporting manager', hierarchyPath: 'Reporting chain', sourceCustomer: 'Original customer' };
  if (referenceLabels[value]) return referenceLabels[value];
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());
}

function display(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return displayValue(value);
}

function referencedId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in value) return String((value as RecordValue)._id ?? '');
  return '';
}

export default function RecordDetails({ type, id, onClose, channelPartner = false }: { type: string; id: string; onClose: () => void; channelPartner?: boolean }) {
  const { user } = useAuth();
  const roleCode = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const canSendQuotation = Boolean(roleCode) && roleCode !== 'CP';
  const [convertCp, setConvertCp] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(false);
  const [conversionNotice, setConversionNotice] = useState('');
  const [record, setRecord] = useState<RecordValue | null>(null);
  const [customerContext, setCustomerContext] = useState<RecordValue | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [related, setRelated] = useState<unknown>(null);
  const [relatedError, setRelatedError] = useState('');
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ documentId: string; url: string; contentType: string; fileName: string } | null>(null);
  const [generateQuotation, setGenerateQuotation] = useState(false);
  const [leadStatus, setLeadStatus] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [profileImageError, setProfileImageError] = useState('');

  const role = record?.role;
  const isChannelPartner = type === 'employees' && (channelPartner || role === 'CP' || (role && typeof role === 'object' && 'code' in role && role.code === 'CP'));
  const employeeName = isChannelPartner ? 'Channel Partner' : 'Employee';
  const actionTitle = (name: string) => name === 'employee-edit' && isChannelPartner ? 'Edit channel partner' : actionLabels[name];
  const districtId = employeeDistrictId(record?.address), currentBranchId = referencedId(record?.branch);
  const [editBranch, setEditBranch] = useState('');
  const [branches, setBranches] = useState<BranchChoice[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false), [branchError, setBranchError] = useState('');
  const [branchReload, setBranchReload] = useState(0);
  useEffect(() => {
    if (action !== 'employee-edit') return;
    let active = true;
    setEditBranch(currentBranchId); setBranches(branchChoices([], record?.branch)); setBranchError('');
    if (!districtId) { setBranchesLoading(false); return; }
    setBranchesLoading(true);
    void api.get<unknown>(`/geography/districts/${encodeURIComponent(districtId)}/branches`).then(result => {
      if (active) setBranches(branchChoices(result.data, record?.branch));
    }).catch(cause => { if (active) setBranchError(cause instanceof Error ? cause.message : 'Unable to load branches'); })
      .finally(() => { if (active) setBranchesLoading(false); });
    return () => { active = false; };
  }, [action, districtId, currentBranchId, branchReload, record?.branch]);


  async function shareQuotationFile(file: File) {
    if (!canSendQuotation) return;
    if (typeof navigator.share !== 'function' || !navigator.canShare?.({ files: [file] })) {
      setRelatedError('This browser cannot share PDF files directly. Download the quotation, then attach it in WhatsApp.');
      return;
    }
    setRelatedError('');
    try {
      await navigator.share({ files: [file], title: file.name, text: `Sunvika Private Limited quotation ${file.name}` });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setRelatedError(cause instanceof Error ? cause.message : 'Unable to open the device share menu.');
    }
  }

  function downloadQuotationFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setCustomerContext(null);
    void api.get<unknown>(`${endpoints[type]}/${encodeURIComponent(id)}`)
      .then((response) => {
        if (!active) return;
        const data = response.data;
        const value = data && typeof data === 'object' && !Array.isArray(data) && type === 'customers' && 'customer' in data
          ? (() => {
            setCustomerContext(data as RecordValue);
            return (data as RecordValue).customer;
          })()
          : data && typeof data === 'object' && !Array.isArray(data) && 'contract' in data
            ? {
            ...(data as RecordValue).contract as RecordValue,
            schedules: (data as RecordValue).schedules,
            serviceHistory: (data as RecordValue).serviceHistory,
          }
            : data;
        setRecord(value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load record details');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [type, id]);

  useEffect(() => {
    let active = true;
    setProfileImageUrl('');
    setProfileImageError('');
    if (type === 'employees' && record?.profileImage && typeof record.profileImage === 'object') {
      void api.get<{ url?: string }>(`/employees/${encodeURIComponent(id)}/profile-image-url`)
        .then((response) => {
          if (!active) return;
          if (!response.data?.url) throw new Error('The API did not return a profile image URL.');
          setProfileImageUrl(response.data.url);
        })
        .catch((cause: unknown) => {
          if (active) setProfileImageError(cause instanceof Error ? cause.message : 'Unable to load profile image');
        });
    }
    return () => { active = false; };
  }, [id, record, type]);

  const fields = record ? Object.entries(record).filter(([key]) => (
    !/password|token|secret|s3key|uploadId|^key$|^__v$|^_id$|^id$/i.test(key) &&
    key !== 'profileImage' &&
    !(type === 'quotations' && ['version', 'totalProjectAmount'].includes(key))
  )) : [];
  const relatedRows = Array.isArray(related)
    ? related as RecordValue[]
    : related && typeof related === 'object' && 'data' in related && Array.isArray((related as RecordValue).data)
      ? (related as RecordValue).data as RecordValue[]
      : [];
  const relatedRecord = related && typeof related === 'object' ? related as RecordValue : null;
  const quotationFile = relatedRecord?.quotationFile instanceof File ? relatedRecord.quotationFile : null;
  const whatsappUrl = typeof relatedRecord?.whatsappUrl === 'string' ? relatedRecord.whatsappUrl : null;
  const isQuotationShareHistory = type === 'quotations' && Array.isArray(related);
  const isLeadStatusHistory = type === 'leads' && Array.isArray(related);
  const readableStatus = (status: unknown) => typeof status === 'string'
    ? status.replaceAll('_', ' ').toLowerCase().replace(/^./, (first) => first.toUpperCase())
    : 'Unknown';
  const customerContextRows = (key: string) => {
    const value = customerContext?.[key];
    return Array.isArray(value) ? value as RecordValue[] : [];
  };
  const customerSourceLead = customerContext?.sourceLead && typeof customerContext.sourceLead === 'object'
    ? customerContext.sourceLead as RecordValue
    : null;
  const personName = (value: unknown) => {
    if (!value || typeof value !== 'object') return '';
    const person = value as RecordValue;
    return [[person.firstName, person.lastName].filter((part) => typeof part === 'string' && part).join(' '), person.employeeCode]
      .filter(Boolean).join(' · ');
  };
  const formatDate = (value: unknown) => {
    if (typeof value !== 'string' && !(value instanceof Date)) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const actionOptions: Record<string, string[]> = {
    leads: ['lead-status', 'lead-assignment', 'lead-edit', 'lead-convert'],
    visits: ['visit-edit'],
    customers: ['customer-edit'],
    quotations: canSendQuotation ? ['quotation-share'] : [],
    employees: ['employee-edit', 'employee-manager'],
    amc: ['amc-renew', 'amc-renewal-status', 'amc-schedule', 'amc-schedule-update', 'amc-service'],
  };
  const relatedPaths: Record<string, Array<{ label: string; path: string }>> = {
    leads: [{ label: 'Status history', path: `/leads/${id}/history` }],
    visits: [
      ...(referencedId(record?.lead) ? [{ label: 'Lead visit history', path: `/visits/leads/${encodeURIComponent(referencedId(record?.lead))}?page=1&limit=20` }] : []),
      ...(referencedId(record?.visitedBy) ? [{ label: 'Employee visit history', path: `/visits/employees/${encodeURIComponent(referencedId(record?.visitedBy))}?page=1&limit=20` }] : []),
    ],
    customers: [],
    quotations: [{ label: 'Share history', path: `/quotations/${id}/shares` }],
    employees: [{ label: 'Reporting hierarchy', path: `/employees/${id}/hierarchy` }],
    amc: [{ label: 'Service history', path: `/amc/${id}/service-history?page=1&limit=20` }],
  };

  async function loadRelated(path: string) {
    setRelatedBusy(true);
    setRelatedError('');
    setRelated(null);
    try { setRelated((await api.get<unknown>(path)).data); }
    catch (cause) { setRelatedError(cause instanceof Error ? cause.message : 'Unable to load related records'); }
    finally { setRelatedBusy(false); }
  }

  async function downloadDocument(document: RecordValue) {
    const documentKey = String(document._id ?? document.id ?? '');
    if (!documentKey) { setRelatedError('The document ID is missing from the API response.'); return; }
    setRelatedBusy(true);
    setRelatedError('');
    try {
      const result = await api.get<{ url?: string; expiresInSeconds?: number }>(`/customers/${id}/documents/${encodeURIComponent(documentKey)}/download-url`);
      if (!result.data?.url) throw new Error('The API did not return a document download URL.');
      setRelated({ downloadUrl: result.data.url, expiresInSeconds: result.data.expiresInSeconds });
    } catch (cause) {
      setRelatedError(cause instanceof Error ? cause.message : 'Unable to download customer document');
    } finally { setRelatedBusy(false); }
  }

  async function previewDocument(document: RecordValue) {
    const previewId = String(document._id ?? document.id ?? '');
    if (!previewId) { setRelatedError('The document ID is missing from the API response.'); return; }
    if (documentPreview?.documentId === previewId) {
      setDocumentPreview(null);
      return;
    }
    setRelatedBusy(true);
    setRelatedError('');
    try {
      const result = await api.get<{ url?: string; contentType?: string }>(`/customers/${id}/documents/${encodeURIComponent(previewId)}/preview-url`);
      if (!result.data?.url || !result.data.contentType) throw new Error('The API did not return a valid document preview URL.');
      setDocumentPreview({
        documentId: previewId,
        url: result.data.url,
        contentType: result.data.contentType,
        fileName: String(document.fileName ?? 'Customer document'),
      });
    } catch (cause) {
      setRelatedError(cause instanceof Error ? cause.message : 'Unable to preview customer document');
    } finally {
      setRelatedBusy(false);
    }
  }

  async function verifyDocument(document: RecordValue) {
    const verificationId = String(document._id ?? document.id ?? '');
    if (!verificationId) { setRelatedError('The document ID is missing from the API response.'); return; }
    if (document.verificationStatus === 'VERIFIED') return;
    setRelatedBusy(true);
    setRelatedError('');
    try {
      await api.patch(`/customers/${id}/documents/${encodeURIComponent(verificationId)}/verification`, { status: 'VERIFIED' });
      await loadRecord();
      if (Array.isArray(related)) {
        const refreshed = await api.get<unknown>(`/customers/${id}/documents`);
        setRelated(refreshed.data);
      }
    } catch (cause) {
      setRelatedError(cause instanceof Error ? cause.message : 'Unable to verify customer document');
    } finally {
      setRelatedBusy(false);
    }
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setActionBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = Object.fromEntries([...form.entries()].filter(([, value]) => value !== '' && !(value instanceof File)));
    try {
      if (action === 'lead-status') {
        const body = { ...values } as Record<string, unknown>;
        const shouldGenerateQuotation = body.generateQuotation === 'on';
        delete body.generateQuotation;
        if (body.status === 'NEED_FOLLOWUP' && !body.nextFollowUpDate) throw new Error('Choose a next follow-up date before saving this status.');
        if (body.status !== 'NEED_FOLLOWUP') delete body.nextFollowUpDate;
        if (typeof body.nextFollowUpDate === 'string') {
          const nextFollowUpDate = new Date(body.nextFollowUpDate);
          if (Number.isNaN(nextFollowUpDate.getTime()) || nextFollowUpDate.getTime() <= Date.now()) {
            throw new Error('Choose a future date and time for the next follow-up.');
          }
          body.nextFollowUpDate = nextFollowUpDate.toISOString();
        }
        if (shouldGenerateQuotation) {
          if (body.status !== 'QUOTATION_SENT') throw new Error('Quotation generation is only available when moving a lead to quotation stage.');
          const quotation: Record<string, unknown> = {};
          for (const key of ['requiredCapacityKW', 'ratePerKW']) {
            const value = Number(body[key]);
            if (!Number.isFinite(value)) throw new Error(`Enter a valid ${key === 'ratePerKW' ? 'rate per kW' : 'capacity'}.`);
            quotation[key] = value;
            delete body[key];
          }
          for (const key of ['paymentMode', 'panelBrand', 'panelTechnology', 'termsAndConditions']) {
            if (typeof body[key] !== 'string' || !body[key].trim()) throw new Error(`Enter ${label(key).toLowerCase()}.`);
            quotation[key] = body[key];
            delete body[key];
          }
          body.quotation = quotation;
        }
        await api.patch(`/leads/${id}/status`, body);
      } else if (action === 'lead-assignment') {
        await api.patch(`/leads/${id}/assignment`, values);
      } else if (action === 'lead-edit' || action === 'visit-edit' || action === 'customer-edit' || action === 'employee-edit') {
        const paths: Record<string, string> = { 'lead-edit': '/leads', 'visit-edit': '/visits', 'customer-edit': '/customers', 'employee-edit': '/employees' };
        const body = { ...values } as Record<string, unknown>;
        if (action === 'employee-edit') {
          delete body.branch;
          Object.assign(body, branchSelectionUpdate(record?.branch, editBranch, branches));
          if (!Object.keys(body).length) throw new Error('Change a field before saving.');
        }
        for (const key of ['requiredCapacityKW', 'ratePerKW']) if (body[key] !== undefined) body[key] = Number(body[key]);
        if (action === 'visit-edit') for (const key of ['visitDate', 'nextVisitDate']) if (typeof body[key] === 'string') body[key] = new Date(body[key] as string).toISOString();
        await api.patch(`${paths[action]}/${id}`, body);
      } else if (action === 'lead-convert') {
        for (const key of ['requiredCapacityKW', 'ratePerKW']) values[key] = Number(values[key]);
        const documentTypes = ['PAN', 'AADHAAR', 'ELECTRICITY_BILL', 'BANK_PASSBOOK'] as const;
        const files = documentTypes.map((documentType) => {
          const file = form.get(`document_${documentType}`);
          if (!(file instanceof File) || !file.size) throw new Error(`Choose the required ${label(documentType).toLowerCase()} document.`);
          if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
            throw new Error(`${label(documentType)} must be a PDF, JPEG, PNG, or WebP file no larger than 20 MB.`);
          }
          return { documentType, file };
        });
        const reservations = await api.post<Array<{ uploadId: string; documentType: string }>>(
          `/customers/from-lead/${id}/document-upload-urls`,
          { documents: files.map(({ documentType, file }) => ({ documentType, fileName: file.name, mimeType: file.type, fileSize: file.size })) }
        );
        if (!Array.isArray(reservations.data) || reservations.data.length !== documentTypes.length) {
          throw new Error('The API did not reserve all four required document uploads.');
        }
        for (const reservation of reservations.data) {
          const entry = files.find(({ documentType }) => documentType === reservation.documentType);
          if (!entry || !reservation.uploadId) throw new Error('The API returned an invalid document upload reservation.');
          try {
            await api.put(
              `/customers/from-lead/${encodeURIComponent(id)}/document-uploads/${encodeURIComponent(reservation.uploadId)}`,
              entry.file,
              entry.file.type
            );
          } catch (cause) {
            if (cause instanceof TypeError) {
              throw new Error(`Could not reach the API while uploading ${label(reservation.documentType)}. Check the API connection and try again.`);
            }
            throw new Error(`${label(reservation.documentType)} upload failed: ${cause instanceof Error ? cause.message : 'unknown error'}`);
          }
        }

        values.documentUploadIds = reservations.data.map(({ uploadId }) => uploadId);
        await api.post(`/customers/from-lead/${id}`, values);
      } else if (action === 'quotation-share') {
        if (!canSendQuotation) throw new Error('Channel partners cannot send quotations.');
        const result = await api.post<{ whatsappUrl?: string; expiresAt?: string; deliveryStatus?: string }>(`/quotations/${id}/share`, values);
        if (!result.data?.whatsappUrl) throw new Error('The API did not return a WhatsApp share link.');
        const pdf = await api.getBlob(`/quotations/${id}/file`);
        const quotationNumber = String(record?.quotationNumber ?? 'quotation');
        const quotationFile = new File([pdf], `${quotationNumber}.pdf`, { type: 'application/pdf' });
        setRelated({ whatsappUrl: result.data.whatsappUrl, expiresAt: result.data.expiresAt, deliveryStatus: result.data.deliveryStatus, quotationFile });
        setAction('');
      } else if (action === 'employee-manager') {
        await api.patch(`/employees/${id}/reporting-manager`, values);
      } else if (action.startsWith('amc-')) {
        const body = { ...values } as Record<string, unknown>;
        if (action === 'amc-renew' || action === 'amc-service') {
          for (const key of ['amount']) if (body[key] !== undefined) body[key] = Number(body[key]);
          for (const key of ['startDate', 'expiryDate', 'serviceDate']) if (typeof body[key] === 'string') body[key] = new Date(body[key] as string).toISOString();
        }
        if (typeof body.partsUsed === 'string') body.partsUsed = (body.partsUsed as string).split(',').map((part) => part.trim()).filter(Boolean);
        if (action === 'amc-renewal-status') await api.patch(`/amc/${id}/renewal-status`, body);
        if (action === 'amc-renew') await api.post(`/amc/${id}/renew`, body);
        if (action === 'amc-schedule') {
          body.scheduledAt = new Date(String(body.scheduledAt)).toISOString();
          await api.post(`/amc/${id}/schedules`, body);
        }
        if (action === 'amc-schedule-update') {
          const scheduleId = String(body.scheduleId);
          delete body.scheduleId;
          if (typeof body.scheduledAt === 'string') body.scheduledAt = new Date(body.scheduledAt).toISOString();
          await api.patch(`/amc/${id}/schedules/${encodeURIComponent(scheduleId)}`, body);
        }
        if (action === 'amc-service') await api.post(`/amc/${id}/service-history`, body);
      }
      if (action !== 'quotation-share') setAction('');
      if (action !== 'quotation-share') await loadRecord();
      setRelated(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The requested action failed');
    } finally { setActionBusy(false); }
  }

  async function loadRecord() {
    const response = await api.get<unknown>(`${endpoints[type]}/${encodeURIComponent(id)}`);
    const data = response.data;
    if (type === 'customers' && data && typeof data === 'object' && !Array.isArray(data) && 'customer' in data) {
      setCustomerContext(data as RecordValue);
    }
    const value = data && typeof data === 'object' && !Array.isArray(data) && type === 'customers' && 'customer' in data
      ? (data as RecordValue).customer
      : data && typeof data === 'object' && !Array.isArray(data) && 'contract' in data
        ? {
        ...(response.data as RecordValue).contract as RecordValue,
        schedules: (response.data as RecordValue).schedules,
        serviceHistory: (response.data as RecordValue).serviceHistory,
      }
        : data;
    setRecord(value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null);
  }

  async function directAction(name: string) {
    setError('');
    try {
      if (name === 'employee-activate' || name === 'employee-deactivate' || name === 'employee-invite') {
        const path = name === 'employee-invite' ? 'resend-invitation' : name === 'employee-activate' ? 'activate' : 'deactivate';
        await api.post(`/employees/${id}/${path}`);
      } else if (name === 'amc-cancel') {
        if (!window.confirm('Cancel this AMC contract and its scheduled services?')) return;
        await api.post(`/amc/${id}/cancel`);
      } else if (name === 'quotation-download') {
        const result = await api.get<{ url?: string; expiresInSeconds?: number }>(`/quotations/${id}/download-url`);
        if (!result.data?.url) throw new Error('The API did not return a download URL.');
        setRelated({ downloadUrl: result.data.url, expiresInSeconds: result.data.expiresInSeconds });
      } else if (name === 'employee-image') {
        const result = await api.get<{ url?: string; expiresInSeconds?: number }>(`/employees/${id}/profile-image-url`);
        if (!result.data?.url) throw new Error('No profile image download URL was returned.');
        setProfileImageUrl(result.data.url);
        setProfileImageError('');
      }
      await loadRecord();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The requested action failed'); }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="create-modal details-modal" role="dialog" aria-modal="true" aria-labelledby="record-details-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">RECORD DETAILS</div>
            <h2 id="record-details-title">{type === 'employees' ? employeeName : label(type)}</h2>
          </div>
          <button className="icon-button" aria-label="Close record details" onClick={onClose}><X size={18}/></button>
        </div>
        {loading ? (
          <div className="details-state"><RefreshCw className="spin" size={18}/> Loading details…</div>
        ) : error ? (
          <div className="form-error" role="alert">{error}</div>
        ) : fields.length ? (
          <>
            {type === 'employees' && record?.profileImage && typeof record.profileImage === 'object' && (
              <section className="employee-profile-preview" aria-label={`${employeeName} profile image`}>
                {profileImageUrl ? <img src={profileImageUrl} alt={`${String(record.firstName ?? employeeName)} profile`} onError={() => { setProfileImageUrl(''); setProfileImageError('The image could not be loaded. Check profile-bucket read access.'); }} /> : <div className="employee-profile-placeholder">{profileImageError ? 'Image unavailable' : <RefreshCw className="spin" size={18}/>}</div>}
                <div><b>Profile image</b>{profileImageError && <small role="status">{profileImageError}</small>}</div>
                <button className="filter-btn" onClick={() => void directAction('employee-image')}>Refresh image</button>
              </section>
            )}
            <dl className="details-list">
              {fields.map(([key, value]) => (
                <div className="details-item" key={key}>
                  <dt>{isChannelPartner && key === 'employeeCode' ? 'CP code' : label(key)}</dt>
                  <dd>{display(value)}</dd>
                </div>
              ))}
            </dl>
            {type === 'customers' && customerContext && (
              <div className="customer-detail-sections">
                {customerSourceLead && (
                  <section>
                    <h3>Source lead</h3>
                    <dl className="details-list">
                      {(['leadCode', 'status', 'customerName', 'mobileNumber', 'siteAddress'] as const)
                        .filter((key) => customerSourceLead[key] != null && customerSourceLead[key] !== '')
                        .map((key) => (
                          <div className="details-item" key={key}>
                            <dt>{label(key)}</dt>
                            <dd>{key === 'status' ? readableStatus(customerSourceLead[key]) : display(customerSourceLead[key])}</dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                )}
                <section>
                  <h3>Documents</h3>
                  {customerContextRows('documents').length ? (
                    <div className="related-documents">
                      {customerContextRows('documents').map((document, index) => {
                        const key = String(document._id ?? document.id ?? index);
                        return (
                          <div className="related-document-entry" key={key}>
                            <div className="related-document">
                              <span>
                                <b>{readableStatus(document.documentType)}</b>
                                <small>{String(document.fileName ?? 'File name unavailable')} · {readableStatus(document.verificationStatus)}</small>
                                <small>Uploaded {formatDate(document.uploadedAt)}{personName(document.uploadedBy) ? ` · By ${personName(document.uploadedBy)}` : ''}</small>
                                {Boolean(document.verifiedAt) && <small>Verified {formatDate(document.verifiedAt)}{personName(document.verifiedBy) ? ` · By ${personName(document.verifiedBy)}` : ''}</small>}
                                {typeof document.verificationRemark === 'string' && document.verificationRemark && <small>Note: {document.verificationRemark}</small>}
                              </span>
                              <button className="filter-btn" disabled={relatedBusy} onClick={() => void previewDocument(document)}>{documentPreview?.documentId === key ? 'Hide preview' : 'Preview'}</button>
                              <button className="filter-btn" disabled={relatedBusy} onClick={() => void downloadDocument(document)}>Download</button>
                              <button className="filter-btn" disabled={relatedBusy || document.verificationStatus === 'VERIFIED'} onClick={() => void verifyDocument(document)}>
                                {document.verificationStatus === 'VERIFIED' ? 'Verified' : 'Verify'}
                              </button>
                            </div>
                            {documentPreview?.documentId === key && (
                              <div className="customer-document-preview">
                                {documentPreview.contentType === 'application/pdf'
                                  ? <iframe title={documentPreview.fileName} src={documentPreview.url} />
                                  : documentPreview.contentType.startsWith('image/')
                                    ? <img src={documentPreview.url} alt={documentPreview.fileName} />
                                    : <a href={documentPreview.url} target="_blank" rel="noreferrer">Open document preview</a>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="form-hint">No customer documents have been uploaded.</p>}
                </section>
                <section>
                  <h3>Lead status history</h3>
                  {customerContextRows('leadStatusHistory').length ? (
                    <div className="related-documents">
                      {customerContextRows('leadStatusHistory').map((entry, index) => (
                        <div className="related-document" key={String(entry._id ?? index)}>
                          <span>
                            <b>{readableStatus(entry.previousStatus)} → {readableStatus(entry.newStatus)}</b>
                            <small>{formatDate(entry.changedAt)}{personName(entry.changedBy) ? ` · Updated by ${personName(entry.changedBy)}` : ''}</small>
                            {typeof entry.remark === 'string' && <small>Note: {entry.remark}</small>}
                            {Boolean(entry.nextFollowUpDate) && <small>Next follow-up: {formatDate(entry.nextFollowUpDate)}</small>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="form-hint">No lead status history is available.</p>}
                </section>
                <section>
                  <h3>Site visits</h3>
                  {customerContextRows('visits').length ? (
                    <div className="related-documents">
                      {customerContextRows('visits').map((visit, index) => (
                        <div className="related-document" key={String(visit._id ?? index)}>
                          <span>
                            <b>Visit · {formatDate(visit.visitDate)}</b>
                            {typeof visit.remark === 'string' && <small>Note: {visit.remark}</small>}
                            {Boolean(visit.nextVisitDate) && <small>Next visit: {formatDate(visit.nextVisitDate)}</small>}
                            {personName(visit.visitedBy) && <small>Visited by {personName(visit.visitedBy)}</small>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="form-hint">No site visits are recorded.</p>}
                </section>
                <section>
                  <h3>Customer activity</h3>
                  {customerContextRows('activities').length ? (
                    <div className="related-documents">
                      {customerContextRows('activities').map((activity, index) => (
                        <div className="related-document" key={String(activity._id ?? index)}>
                          <span>
                            <b>{readableStatus(activity.action)}</b>
                            <small>{formatDate(activity.occurredAt)}{personName(activity.actor) ? ` · By ${personName(activity.actor)}` : ''}</small>
                            {typeof activity.description === 'string' && <small>{activity.description}</small>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="form-hint">No customer activity is recorded.</p>}
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="details-state">No details are available for this record.</div>
        )}
        {error && !loading && <div className="form-error" role="alert">{error}</div>}
        {!loading && record && (
          <div className="record-operations">
            {conversionNotice && <div className="success-note" role="status">{conversionNotice}</div>}
            {type === 'customers' && ['MD','CP_HEAD','RM'].includes(roleCode ?? '') && <button className="primary-btn" disabled={Boolean(record?.cpEmployee)} onClick={() => setConvertCp(true)}>{record?.cpEmployee ? 'CP account created' : 'Convert to CP'}</button>}
            {type === 'employees' && referencedId(record?.sourceCustomer) && <button className="secondary-btn" onClick={() => setCustomerHistory(true)}>Customer history</button>}
            {type === 'customers' && ['quotations', 'amcContracts'].map(key => <section key={key}><h3>{key === 'quotations' ? 'Quotation history' : 'AMC history'}</h3>{customerContextRows(key).length ? customerContextRows(key).map((item, index) => <dl className="details-list" key={String(item._id ?? index)}>{Object.entries(item).filter(([field]) => field !== "_id").map(([field, value]) => <div className="details-item" key={field}><dt>{label(field)}</dt><dd>{display(value)}</dd></div>)}</dl>) : <p>No records yet.</p>}</section>)}
            {actionOptions[type]?.length || type === 'quotations' ? (
              <div className="operation-toolbar">
                {actionOptions[type].map((name) => <button className="filter-btn" key={name} onClick={() => { setRelated(null); setLeadStatus(''); setGenerateQuotation(false); setAction(action === name ? '' : name); }}>{actionTitle(name)}</button>)}
                {type === 'employees' && <><button className="filter-btn" onClick={() => void directAction('employee-activate')}>Activate</button><button className="filter-btn" onClick={() => void directAction('employee-deactivate')}>Deactivate</button><button className="filter-btn" onClick={() => void directAction('employee-invite')}>Resend invitation</button><button className="filter-btn" onClick={() => void directAction('employee-image')}>Profile image</button></>}
                {type === 'quotations' && <button className="filter-btn" onClick={() => void directAction('quotation-download')}><Download size={14}/> Download PDF</button>}
                {type === 'amc' && <button className="filter-btn danger-btn" onClick={() => void directAction('amc-cancel')}>Cancel contract</button>}
              </div>
            ) : null}
            {action && actionFields[action] && (action !== 'quotation-share' || canSendQuotation) && (
              <form className="operation-form" onSubmit={(event) => void submitAction(event)}>
                <h3>{actionTitle(action)}</h3>
                <div className="modal-fields">
                  {action === 'lead-convert' && <p className="form-hint field-wide">Upload all four required documents to convert this lead. Accepted formats: PDF, JPEG, PNG, or WebP. The server verifies each file before conversion.</p>}
                  {actionFields[action].filter((field) => field.name !== 'nextFollowUpDate' || (action === 'lead-status' && leadStatus === 'NEED_FOLLOWUP')).map((field) => <label key={field.name}>{field.label}{action === 'employee-edit' && field.name === 'branch' ? <select name="branch" value={editBranch} disabled={branchesLoading || actionBusy} onChange={event => setEditBranch(event.target.value)}><option value="">{branchesLoading ? 'Loading branches...' : 'No branch'}</option>{branches.map(branch => <option key={branch.value} value={branch.value}>{branch.label}</option>)}</select> : field.type === 'select' ? <select name={field.name} required={field.required} defaultValue="" onChange={field.name === 'status' && action === 'lead-status' ? (event) => { setLeadStatus(event.target.value); setGenerateQuotation(false); } : undefined}><option value="">Choose…</option>{field.options?.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select> : <input name={field.name} type={field.type ?? 'text'} accept={field.type === 'file' ? 'application/pdf,image/jpeg,image/png,image/webp' : undefined} required={field.required || (action === 'lead-status' && field.name === 'nextFollowUpDate')} step={field.type === 'number' ? 'any' : undefined}/>}</label>)}
                  {action === 'employee-edit' && <><p className="form-hint">Choose a branch in the current address district. The current branch stays selected unless you change it.</p>{branchError && <div className="form-error" role="alert">{branchError} <button type="button" className="filter-btn" onClick={() => setBranchReload(value => value + 1)}>Retry branches</button></div>}</>}
                  {action === 'quotation-share' && <p className="form-hint">The device share menu asks you to choose WhatsApp and the recipient. This number is only for the chat-link fallback; WhatsApp cannot pre-attach a PDF to a selected chat.</p>}
                  {action === 'lead-status' && leadStatus === 'QUOTATION_SENT' && (
                    <>
                      <label className="field-wide"><span><input type="checkbox" name="generateQuotation" checked={generateQuotation} onChange={(event) => setGenerateQuotation(event.currentTarget.checked)}/> Generate quotation now</span></label>
                      {generateQuotation && leadQuotationFields.map((field) => <label key={field.name}>{field.label}{field.name === 'termsAndConditions' ? <textarea name={field.name} required maxLength={5000} minLength={10}/> : <input name={field.name} type={field.type ?? 'text'} required={field.required} min={field.type === 'number' ? '0' : undefined} max={field.name === 'requiredCapacityKW' ? '100000' : field.name === 'ratePerKW' ? '100000000' : undefined} step={field.type === 'number' ? 'any' : undefined} maxLength={field.type === 'number' ? undefined : 100}/>}</label>)}
                    </>
                  )}
                </div>
                <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setAction('')}>Cancel</button><button className="primary-btn" disabled={actionBusy || (action === 'employee-edit' && branchesLoading)}>{actionBusy ? action === 'lead-convert' ? 'Uploading & converting…' : 'Saving…' : action === 'lead-convert' ? 'Upload documents & convert' : 'Save'}</button></div>
              </form>
            )}
            {type === 'customers' && (
              <form className="operation-form" onSubmit={(event) => {
                event.preventDefault();
                const file = new FormData(event.currentTarget).get('customerDocument');
                if (!(file instanceof File) || !file.size) { setError('Choose a customer document to upload.'); return; }
                const documentType = String(new FormData(event.currentTarget).get('documentType'));
                void (async () => {
                  setActionBusy(true); setError('');
                  try {
                    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Choose a PDF, JPEG, PNG, or WebP file no larger than 20 MB.');
                    const ticket = await api.post<{ uploadId: string; uploadUrl: string }>(`/customers/${id}/documents/upload-url`, { documentType, fileName: file.name, mimeType: file.type, fileSize: file.size });
                    if (!ticket.data?.uploadId || !ticket.data.uploadUrl) throw new Error('The API did not return a valid upload reservation.');
                    const url = new URL(ticket.data.uploadUrl);
                    if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('The upload URL must use HTTPS.');
                    const uploaded = await fetch(url.toString(), { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, credentials: 'omit', redirect: 'error' });
                    if (!uploaded.ok) throw new Error(`Document upload failed (${uploaded.status}).`);
                    await api.post(`/customers/${id}/documents/complete`, { uploadId: ticket.data.uploadId });
                    await loadRelated(`/customers/${id}/documents`);
                  } catch (cause) { setError(cause instanceof Error ? cause.message : 'Document upload failed'); }
                  finally { setActionBusy(false); }
                })();
              }}>
                <h3>Upload customer document</h3>
                <div className="modal-fields">
                  <label>Document type<select name="documentType" required defaultValue=""><option value="">Choose document type</option>{['PAN', 'AADHAAR', 'ELECTRICITY_BILL', 'BANK_PASSBOOK'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                  <label>File (PDF or image, max 20 MB)<input name="customerDocument" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label>
                </div>
                <div className="modal-actions"><button className="primary-btn" disabled={actionBusy}>{actionBusy ? 'Uploading…' : 'Upload document'}</button></div>
              </form>
            )}
            {relatedPaths[type]?.length ? (
              <div className="related-toolbar">
                {relatedPaths[type].map((item) => <button className="filter-btn" key={item.label} disabled={relatedBusy} onClick={() => void loadRelated(item.path)}>{item.label}</button>)}
              </div>
            ) : null}
            {(type === 'customers' || type === 'amc') && <div className="related-toolbar"><button className="filter-btn" disabled={relatedBusy} onClick={() => void loadRelated(type === 'customers' ? `/customers/${id}/documents` : `/amc/${id}/service-history?page=1&limit=20`)}>{type === 'customers' ? 'Customer documents' : 'Service history'}</button></div>}
            {relatedError && <div className="form-error" role="alert">{relatedError}</div>}
            {type === 'customers' && relatedRows.length > 0 && (
              <div className="related-documents">
                {relatedRows.map((document) => {
                  const key = String(document._id ?? document.id ?? '');
                  return <div className="related-document-entry" key={key}>
                    <div className="related-document">
                      <span><b>{String(document.documentType ?? 'Document')}</b><small>{String(document.fileName ?? document.verificationStatus ?? '')}</small></span>
                      <button className="filter-btn" disabled={relatedBusy} onClick={() => void previewDocument(document)}>{documentPreview?.documentId === key ? 'Hide preview' : 'Preview'}</button>
                      <button className="filter-btn" disabled={relatedBusy} onClick={() => void downloadDocument(document)}>Download</button>
                      <button className="filter-btn" disabled={relatedBusy || document.verificationStatus === 'VERIFIED'} onClick={() => void verifyDocument(document)}>
                        {document.verificationStatus === 'VERIFIED' ? 'Verified' : 'Verify'}
                      </button>
                    </div>
                    {documentPreview?.documentId === key && (
                      <div className="customer-document-preview">
                        {documentPreview.contentType === 'application/pdf'
                          ? <iframe title={documentPreview.fileName} src={documentPreview.url} />
                          : documentPreview.contentType.startsWith('image/')
                            ? <img src={documentPreview.url} alt={documentPreview.fileName} />
                            : <a href={documentPreview.url} target="_blank" rel="noreferrer">Open document preview</a>}
                      </div>
                    )}
                  </div>;
                })}
              </div>
            )}
            {isQuotationShareHistory && (
              relatedRows.length ? (
                <div className="related-documents">
                  {relatedRows.map((share, index) => {
                    const sharedBy = share.sharedBy && typeof share.sharedBy === 'object'
                      ? share.sharedBy as RecordValue
                      : null;
                    const employeeName = sharedBy
                      ? [sharedBy.firstName, sharedBy.lastName].filter((part) => typeof part === 'string' && part).join(' ')
                      : '';
                    const employee = [employeeName, sharedBy?.employeeCode].filter(Boolean).join(' · ');
                    const timestamp = typeof share.linkCreatedAt === 'string' || share.linkCreatedAt instanceof Date
                      ? new Date(share.linkCreatedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                      : 'Time unavailable';
                    const lastFour = typeof share.recipientMobileLast4 === 'string' ? share.recipientMobileLast4 : '';
                    const channel = typeof share.channel === 'string'
                      ? share.channel.replaceAll('_', ' ').toLowerCase().replace(/^./, (first) => first.toUpperCase())
                      : 'WhatsApp';
                    return (
                      <div className="related-document" key={String(share._id ?? index)}>
                        <span>
                          <b>{channel}</b>
                          <small>{timestamp}{employee ? ` · Shared by ${employee}` : ''}</small>
                          <small>{lastFour ? `Recipient: •••• ${lastFour}` : 'Recipient unavailable'} · Link created; delivery not confirmed</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="form-hint">No share history is available for this quotation yet.</p>
              )
            )}
            {isLeadStatusHistory && (
              relatedRows.length ? (
                <div className="related-documents">
                  {relatedRows.map((entry, index) => {
                    const changedBy = entry.changedBy && typeof entry.changedBy === 'object'
                      ? entry.changedBy as RecordValue
                      : null;
                    const employeeName = changedBy
                      ? [changedBy.firstName, changedBy.lastName].filter((part) => typeof part === 'string' && part).join(' ')
                      : '';
                    const employee = [employeeName, changedBy?.employeeCode].filter(Boolean).join(' · ');
                    const changedAt = typeof entry.changedAt === 'string' || entry.changedAt instanceof Date
                      ? new Date(entry.changedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                      : 'Time unavailable';
                    const followUpDate = typeof entry.nextFollowUpDate === 'string' || entry.nextFollowUpDate instanceof Date
                      ? new Date(entry.nextFollowUpDate).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                      : null;
                    return (
                      <div className="related-document" key={String(entry._id ?? index)}>
                        <span>
                          <b>{readableStatus(entry.previousStatus)} → {readableStatus(entry.newStatus)}</b>
                          <small>{changedAt}{employee ? ` · Updated by ${employee}` : ''}</small>
                          {typeof entry.remark === 'string' && <small>Note: {entry.remark}</small>}
                          {followUpDate && <small>Next follow-up: {followUpDate}</small>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="form-hint">No status changes have been recorded for this lead yet.</p>
              )
            )}
            {relatedRecord && !quotationFile && !isQuotationShareHistory && !isLeadStatusHistory && <pre className="json-result">{displayJson(related)}</pre>}
            {canSendQuotation && quotationFile && (
              <div className="related-toolbar">
                <button className="primary-btn" onClick={() => void shareQuotationFile(quotationFile)}><Share2 size={14}/> Share PDF</button>
                <button className="filter-btn" onClick={() => downloadQuotationFile(quotationFile)}><Download size={14}/> Download PDF</button>
                {whatsappUrl && <a className="filter-btn" href={whatsappUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open WhatsApp chat</a>}
              </div>
            )}
            {canSendQuotation && quotationFile && (
              <p className="form-hint">Choose WhatsApp from the device share menu, then select the recipient. WhatsApp does not allow websites to attach a PDF to a preselected chat.</p>
            )}
            {related !== null && typeof related === 'object' && 'downloadUrl' in related && typeof (related as RecordValue).downloadUrl === 'string' && (
              <a className="primary-btn" href={String((related as RecordValue).downloadUrl)} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open download</a>
            )}
            {canSendQuotation && related !== null && typeof related === 'object' && !quotationFile && 'whatsappUrl' in related && typeof (related as RecordValue).whatsappUrl === 'string' && (
              <a className="primary-btn" href={String((related as RecordValue).whatsappUrl)} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open WhatsApp</a>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
        </div>
      </section>
      {convertCp && <CustomerCpConversion customerId={id} onClose={() => setConvertCp(false)} onSaved={(sent, already) => { setConvertCp(false); setConversionNotice(already ? 'This customer already has a CP account.' : sent ? 'CP account created. Password-setup invitation sent.' : 'CP account created. Invitation was not delivered; use Employees to resend it.'); void loadRecord().catch(e => setError(e instanceof Error ? e.message : 'Unable to refresh customer')); }}/> }
      {customerHistory && referencedId(record?.sourceCustomer) && <RecordDetails type="customers" id={referencedId(record?.sourceCustomer)} onClose={() => setCustomerHistory(false)}/>}
    </div>
  );
}
