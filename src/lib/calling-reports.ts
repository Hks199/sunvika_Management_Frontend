export type ReportCounts = { called:number; converted:number; interested:number; followUp:number };
export type ReportPerson = { _id:string; firstName?:string; lastName?:string; employeeCode?:string };
export type ReportSheet = ReportCounts & { list:string; sheetName:string };
export type DailyCallingReport = { day:string; rm:ReportPerson; sheets:ReportSheet[]; totals:ReportCounts; isCurrent:boolean; canVerify:boolean; report:null | { _id:string; revision:number; status:'PENDING'|'VERIFIED'; generatedAt:string; verifiedBy?:ReportPerson|null; verifiedAt?:string|null; reviewNote?:string; sheets:ReportSheet[]; totals:ReportCounts } };
export type CallingReportSummary = { period:string; fromDay:string; toDay:string; timeZone:string; totals:ReportCounts; sheets:(ReportSheet & {rm:ReportPerson|null})[]; days:DailyCallingReport[] };
export type CallingReportOptions = { role:string; today:string; timeZone:string; rms:ReportPerson[] };
export function reportPerson(person:ReportPerson) { return [person.firstName,person.lastName].filter(Boolean).join(' ') || person.employeeCode || 'RM'; }
export const REPORT_PERIODS = [{value:'DAY',label:'Daily'},{value:'WEEK',label:'Last 7 days'},{value:'MONTH',label:'Calendar month'}];
