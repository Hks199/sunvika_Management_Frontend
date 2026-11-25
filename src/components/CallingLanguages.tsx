import {useEffect,useState} from 'react';
import {api} from '../lib/api';
export default function CallingLanguages({onSaved}:{onSaved:(values:string[])=>void}){
 const [text,setText]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void api.get<string[]>('/calling-lists/languages').then(r=>setText(r.data.join('\n'))).catch(e=>setError(e instanceof Error?e.message:'Unable to load languages'));},[]);
 async function save(){setBusy(true);setError('');try{const values=text.split('\n').map(x=>x.trim()).filter(Boolean);const r=await api.patch<string[]>('/calling-lists/languages',{languages:values});setText(r.data.join('\n'));onSaved(r.data);setNotice('Languages saved.');}catch(e){setError(e instanceof Error?e.message:'Unable to save languages');}finally{setBusy(false);}}
 return <section className="panel calling-panel"><h2>Manage calling languages</h2><p>Enter one language per line. RMs and batch uploads use these options.</p><label>Languages<textarea rows={4} value={text} onChange={e=>setText(e.target.value)}/></label><button type="button" className="primary-btn" disabled={busy} onClick={()=>void save()}>Save languages</button>{error&&<p className="form-error">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>;
}
