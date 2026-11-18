import {useEffect,useRef,useState} from 'react';
import {api} from '../lib/api';
export default function EmployeeProfileImageEditor({employeeId,onSaved}:{employeeId:string;onSaved:()=>Promise<void>}){
  const [options,setOptions]=useState<{canEdit:boolean;maxSizeBytes:number}|null>(null),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reload,setReload]=useState(0),[checking,setChecking]=useState(false);
  const saving=useRef(false),input=useRef<HTMLInputElement>(null);
  const path=`/employees/${encodeURIComponent(employeeId)}`;
  useEffect(()=>{
    if(!open)return;
    let active=true;setOptions(null);setChecking(true);setError('');
    void api.get<{canEdit:boolean;maxSizeBytes:number}>(`${path}/profile-image-options`)
      .then(result=>{if(active)setOptions(result.data);})
      .catch(e=>{if(active)setError(e instanceof Error&&/^Route not found\b/i.test(e.message)?'Photo editing is unavailable on the connected API. Deploy the updated backend to enable it. Employee details and saved photos can still be viewed.':e instanceof Error?e.message:'Unable to load profile image permissions');})
      .finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;};
  },[path,reload,open]);
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  async function save(){
    if(saving.current||!file||!options?.canEdit)return;saving.current=true;setBusy(true);setError('');setNotice('');
    try{
      const reservation=await api.post<{uploadId:string}>(`${path}/profile-image-upload`,{contentType:file.type,size:file.size});
      await api.put(`${path}/profile-image-upload/${reservation.data.uploadId}`,file,file.type);
      await api.patch(`${path}/profile-image`,{profileImageUploadId:reservation.data.uploadId});
      setFile(null);setOpen(false);setNotice('Profile image updated.');
      try{await onSaved();}catch{setError('The image was saved. Refresh employee details to view it.');}
    }catch(e){setError(e instanceof Error?e.message:'Unable to update profile image. The current image has been kept.');}finally{saving.current=false;setBusy(false);}
  }
  if(options&&!options.canEdit)return null;
  return <section className="employee-profile-editor" aria-label="Change profile image">{(!options||options.canEdit)&&<button type="button" className="filter-btn" disabled={busy||checking} onClick={()=>{setOpen(value=>!value);setFile(null);setError('');setNotice('');}}>{open?'Cancel image change':'Change / add profile image'}</button>}{open&&checking&&<p role="status">Checking photo editing permissions...</p>}{open&&options&&<div className="panel calling-panel"><label>New profile image<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{setFile(null);setError('');const selected=event.target.files?.[0];if(!selected)return;if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||!selected.size||selected.size>options.maxSizeBytes){event.target.value='';setError(`Choose a JPEG, PNG or WebP image up to ${options.maxSizeBytes/1024/1024} MB.`);return;}setFile(selected);}}/></label><p>JPEG, PNG or WebP. Maximum {options.maxSizeBytes/1024/1024} MB.</p>{preview&&<img src={preview} alt="Selected profile image preview" style={{width:140,height:140,objectFit:'contain',borderRadius:12,display:'block',marginBottom:12}}/>}<button type="button" className="primary-btn" disabled={busy||!file} onClick={()=>void save()}>{busy?'Uploading and saving...':'Save profile image'}</button></div>}{notice&&<p className="success-note" role="status">{notice}</p>}{error&&<p className="form-error" role="alert">{error}{!options&&<button type="button" className="filter-btn" onClick={()=>{setError('');setReload(value=>value+1);}}>Retry</button>}</p>}</section>;
}
