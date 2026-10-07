export const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/; export const phoneRe=/^[6-9]\d{9}$/;
export function cleanEmail(v){return String(v||'').trim().toLowerCase()}; export function todayStart(){const d=new Date();d.setHours(0,0,0,0);return d}
export function requireFields(body,fields){const errors={};for(const f of fields)if(body[f]===undefined||body[f]===null||String(body[f]).trim()==='')errors[f]=`${f} is required`;return errors}
