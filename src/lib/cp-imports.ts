export type CpImportRow={rowNumber:number;managerId?:string;managerName:string;managerCode:string;fields:Record<string,string>;errors:string[];status:'PENDING'|'CREATED'|'FAILED';employeeId?:string;invitationSent:boolean;error:string};
export type CpImport={_id:string;manager?:string;fileName:string;state:'PREVIEW'|'INVALID'|'QUEUED'|'PROCESSING'|'COMPLETED';rows:CpImportRow[];total:number;created:number;failed:number;invalid:number};
export type CpImportRecent={_id:string;fileName:string;state:string;createdAt:string};
export type CpImportRm={_id:string;firstName:string;lastName:string;employeeCode:string};
export const CP_IMPORT_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CP_IMPORT_SIZE=5*1024*1024;
