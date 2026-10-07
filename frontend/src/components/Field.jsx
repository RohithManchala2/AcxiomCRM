export default function Field({label,name,value,onChange,type='text',required,error,options,min,max,placeholder}){
  const id=`field-${name}`;
  const describedBy=error?`${id}-error`:undefined;
  const optionValue=option=>typeof option==='string'?option:option.value;
  const optionLabel=option=>typeof option==='string'?option:option.label;
  return <div className="mb-3">
    <label className="form-label fw-semibold" htmlFor={id}>{label}{required&&' *'}</label>
    {options
      ?<select id={id} className={`form-select ${error?'is-invalid':''}`} name={name} value={value??''} onChange={onChange} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
        <option value="">Select...</option>{options.map(option=><option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}
      </select>
      :<input id={id} className={`form-control ${error?'is-invalid':''}`} name={name} value={value??''} onChange={onChange} type={type} required={required} min={min} max={max} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={describedBy}/>}
    {error&&<div id={describedBy} className="invalid-feedback">{error}</div>}
  </div>;
}
