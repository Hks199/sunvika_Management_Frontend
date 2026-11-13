export type ReminderDraft={title:string;body:string;enabled:boolean;startDate:string;durationDays:number;everyDays:number;time:string;repeatMinutes:number;endTime:string};
export type ReminderManager={_id:string;firstName?:string;lastName?:string;employeeCode?:string};
export type ReminderRun={_id:string;slot:string;title:string;body:string;state:string;recipientCount:number;push:Record<string,number>};
export const REMINDER_ROLES=['MD','MIS','CP_HEAD','RM'];
export const REMINDER_INTERVALS=[{value:0,label:'Once per send day'},{value:15,label:'Every 15 minutes'},{value:30,label:'Every 30 minutes'},{value:60,label:'Every hour'},{value:120,label:'Every 2 hours'},{value:180,label:'Every 3 hours'},{value:240,label:'Every 4 hours'},{value:360,label:'Every 6 hours'},{value:720,label:'Every 12 hours'}];
export function defaultReminder():ReminderDraft{return {title:'A message from your RM',body:'',enabled:true,startDate:new Date(Date.now()+330*60_000).toISOString().slice(0,10),durationDays:30,everyDays:1,time:'09:30',repeatMinutes:0,endTime:''};}
export function reminderPayload(draft:ReminderDraft):ReminderDraft{
  if(!draft.title.trim()||!draft.body.trim())throw new Error('Enter a title and notification message.');
  if(![draft.durationDays,draft.everyDays].every(value=>Number.isInteger(value)&&value>=1&&value<=365))throw new Error('Duration and day interval must be between 1 and 365.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))throw new Error('Choose a valid start date and send time.');
  if(draft.repeatMinutes&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.endTime)||draft.endTime<draft.time))throw new Error('Choose an end time at or after the first send time.');
  return {title:draft.title.trim(),body:draft.body.trim(),enabled:draft.enabled,startDate:draft.startDate,durationDays:draft.durationDays,everyDays:draft.everyDays,time:draft.time,repeatMinutes:draft.repeatMinutes,endTime:draft.repeatMinutes?draft.endTime:''};
}
export function reminderManagerName(person:ReminderManager){return `${[person.firstName,person.lastName].filter(Boolean).join(' ')} · ${person.employeeCode??''}`;}

export type ReminderSchedule=ReminderDraft & {_id:string;endDate:string};
