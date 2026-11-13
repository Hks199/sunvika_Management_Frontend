import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';
type Option = { value:string; label:string };
export default function SearchableSelect({label,value,options,placeholder='Search or choose...',emptyLabel='All accessible RMs',disabled=false,onChange}:{label:string;value:string;options:Option[];placeholder?:string;emptyLabel?:string;disabled?:boolean;onChange:(value:string)=>void}) {
  const id=useId(),input=useRef<HTMLInputElement>(null);
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
  const selected=options.find(option=>option.value===value);
  const matching=options.filter(option=>option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const shown=[{value:'',label:emptyLabel},...matching];
  const focused=Math.min(active,shown.length-1);
  function show(){setQuery('');setActive(0);setOpen(true);}
  function choose(option:Option){onChange(option.value);setQuery('');setOpen(false);}
  function keyboard(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==='Escape'){setOpen(false);event.preventDefault();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();if(!open){show();return;}
      setActive(previous=>(Math.min(previous,shown.length-1)+(event.key==='ArrowDown'?1:-1)+shown.length)%shown.length);
    }else if(event.key==='Enter'&&open){event.preventDefault();choose(shown[focused]!);}
  }
  return <div className="searchable-select" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    <label htmlFor={id}>{label}</label><div className="searchable-select-control"><input ref={input} id={id} role="combobox" aria-expanded={open&&!disabled} aria-controls={`${id}-options`} aria-autocomplete="list" aria-activedescendant={open?`${id}-option-${focused}`:undefined} autoComplete="off" placeholder={placeholder} disabled={disabled} value={open?query:selected?.label??''} onFocus={show} onClick={()=>{if(!open)show();}} onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(1);}} onKeyDown={keyboard}/>{(value||query)&&<button type="button" className="searchable-select-clear" aria-label={`Clear ${label} filter`} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>{onChange('');show();input.current?.focus();}}><X size={13}/></button>}<button type="button" className="searchable-select-toggle" aria-label={`Show ${label} options`} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(open)setOpen(false);else{input.current?.focus();show();}}}><ChevronDown size={14}/></button></div>
    {open&&!disabled&&<div className="searchable-select-popup"><ul id={`${id}-options`} role="listbox" aria-label={`${label} options`}>{shown.map((option,index)=><li id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={option.value===value} className={index===focused?'is-focused':''} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(option)}>{option.label}</li>)}</ul>{!matching.length&&<p role="status">No matching RM found.</p>}</div>}
  </div>;
}
