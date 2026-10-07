import {useEffect,useMemo,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import api from '../services/api';
import {useAuth} from '../context/AuthContext';
import Field from '../components/Field';
import PageHeader from '../components/PageHeader';

const options=values=>values.map(value=>({value,label:value}));
const relation=(items,labelField)=>items.map(item=>({value:item._id,label:item[labelField]||item.name||item.email||item._id}));
const fields={
  customers:{title:'Customer',values:[['customerName','Customer Name','text',true],['email','Email','email',true],['phone','Phone','tel',true],['companyName','Company','text'],['address','Address','text'],['city','City','text'],['state','State','text'],['status','Status','select',false,['Active','Inactive','Prospect']],['owner','Owner','relation','users']]},
  leads:{title:'Lead',values:[['leadName','Lead Name','text',true],['email','Email','email'],['phone','Phone','tel'],['companyName','Company','text'],['source','Source','text'],['status','Status','select',false,['New','Contacted','Qualified','Unqualified','Lost']],['priority','Priority','select',false,['Low','Medium','High']],['expectedValue','Expected Value','number',false],['assignedTo','Assigned To','relation','users']]},
  opportunities:{title:'Opportunity',values:[['opportunityName','Opportunity Name','text',true],['customer','Customer','relation','customers'],['lead','Lead','relation','leads'],['assignedTo','Assigned To','relation','users'],['amount','Amount','number',true],['probability','Probability','number',true],['expectedCloseDate','Expected Close Date','date',true],['stage','Stage','select',false,['Qualification','Proposal','Negotiation','Won','Lost']],['notes','Notes','text']]},
  followups:{title:'Follow-Up',values:[['customer','Customer','relation','customers'],['lead','Lead','relation','leads'],['opportunity','Opportunity','relation','opportunities'],['assignedTo','Assigned To','relation','users'],['followUpDate','Follow-Up Date','date',true],['followUpType','Type','select',true,['Call','Meeting','Email','Task']],['subject','Subject','text',true],['remarks','Remarks','text'],['status','Status','select',false,['Planned','Completed','Missed','Cancelled']]]},
  activities:{title:'Activity',values:[['customer','Customer','relation','customers'],['lead','Lead','relation','leads'],['opportunity','Opportunity','relation','opportunities'],['assignedTo','Assigned To','relation','users'],['activityType','Type','select',true,['Call','Meeting','Email','Task']],['subject','Subject','text',true],['description','Description','text'],['activityDate','Activity Date','datetime-local',true],['status','Status','select',false,['Planned','Completed','Cancelled']]]}
};

function referenceId(value){
  return value&&typeof value==='object'&&value._id?value._id:value||'';
}

export default function FormPage({resource}){
  const config=fields[resource];
  const{id}=useParams();
  const nav=useNavigate();
  const{user}=useAuth();
  const[form,setForm]=useState({});
  const[errors,setErrors]=useState({});
  const[lookups,setLookups]=useState({users:[],customers:[],leads:[],opportunities:[]});
  const[loading,setLoading]=useState(Boolean(id));
  const[saving,setSaving]=useState(false);
  const[loadError,setLoadError]=useState('');

  useEffect(()=>{
    let active=true;
    const requests=[
      api.get('/users/assignable'),
      api.get('/customers',{params:{page:1,limit:100}}),
      api.get('/leads',{params:{page:1,limit:100}}),
      api.get('/opportunities',{params:{page:1,limit:100}})
    ];
    Promise.all(requests).then(([users,customers,leads,opportunities])=>{
      if(active)setLookups({users:relation(users.data.data,'name'),customers:relation(customers.data.data,'customerName'),leads:relation(leads.data.data,'leadName'),opportunities:relation(opportunities.data.data,'opportunityName')});
    }).catch(()=>{if(active)setLoadError('Unable to load related records or assignees.')});
    return()=>{active=false};
  },[]);

  useEffect(()=>{
    if(!id)return;
    let active=true;
    setLoading(true);
    api.get(`/${resource}/${id}`).then(response=>{
      if(!active)return;
      const next={...response.data.data};
      for(const key of ['owner','assignedTo','customer','lead','opportunity'])if(next[key])next[key]=referenceId(next[key]);
      for(const key of ['expectedCloseDate','followUpDate'])if(next[key])next[key]=next[key].slice(0,10);
      if(next.activityDate)next.activityDate=next.activityDate.slice(0,16);
      setForm(next);
    }).catch(requestError=>{
      if(active)setLoadError(requestError.response?.data?.message||'Unable to load this record.');
    }).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[id,resource]);

  const definitions=useMemo(()=>config.values.filter(([name])=>!['owner','assignedTo'].includes(name)||user?.role!=='SALES_EXECUTIVE'),[config,user?.role]);
  const change=event=>setForm(current=>({...current,[event.target.name]:event.target.value}));
  const validate=()=>{
    const next={};
    for(const[name,label,type,required]of config.values){
      if(required&&!String(form[name]??'').trim())next[name]=`${label} is required`;
    }
    const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(form.email&&!emailPattern.test(form.email.trim()))next.email='Enter a valid email address';
    if(['customers','leads'].includes(resource)&&form.phone&&!/^[6-9]\d{9}$/.test(String(form.phone).replace(/\s/g,'')))next.phone='Enter a valid 10-digit Indian phone number';
    if(resource==='opportunities'){
      if(Number(form.amount)<=0)next.amount='Opportunity Amount must be greater than 0';
      if(Number(form.probability)<0||Number(form.probability)>100)next.probability='Probability must be between 0 and 100';
      if(form.expectedCloseDate&&new Date(form.expectedCloseDate)<new Date(new Date().setHours(0,0,0,0))&&!['Lost','Won'].includes(form.stage))next.expectedCloseDate='Expected Close Date cannot be in the past';
    }
    if(resource==='followups'&&form.followUpDate&&new Date(form.followUpDate)<new Date(new Date().setHours(0,0,0,0))&&(!form.status||form.status==='Planned'))next.followUpDate='Follow-up date cannot be earlier than today';
    setErrors(next);
    return Object.keys(next).length===0;
  };
  const submit=async event=>{
    event.preventDefault();
    if(!validate())return;
    setSaving(true);
    setErrors({});
    try{
      const payload={...form};
      if(resource==='customers'&&user?.role==='SALES_EXECUTIVE')delete payload.owner;
      if(user?.role==='SALES_EXECUTIVE')delete payload.assignedTo;
      if(id)await api.put(`/${resource}/${id}`,payload);
      else await api.post(`/${resource}`,payload);
      nav('/'+resource,{state:{notice:`${config.title} ${id?'updated':'created'} successfully`}});
    }catch(requestError){
      setErrors({...requestError.response?.data?.errors,form:requestError.response?.data?.message||'Unable to save record.'});
    }finally{setSaving(false)}
  };
  const renderField=([name,label,type,required,values])=>{
    let selectOptions;
    if(type==='select')selectOptions=options(values);
    if(type==='relation')selectOptions=lookups[values];
    return <div className="col-md-6" key={name}><Field name={name} label={label} value={form[name]||''} onChange={change} type={type==='select'||type==='relation'?'text':type} required={required} error={errors[name]} options={selectOptions} min={name==='amount'?0.01:name==='probability'?0:undefined} max={name==='probability'?100:undefined}/></div>;
  };

  if(loading)return <div className="text-center p-5" role="status">Loading record…</div>;
  return <>
    <PageHeader title={`${id?'Edit':'Create'} ${config.title}`}/>
    <div className="card form-card p-4">
      {loadError&&<div className="alert alert-danger" role="alert">{loadError}</div>}
      <form onSubmit={submit} noValidate>
        {errors.form&&<div className="alert alert-danger" role="alert">{errors.form}</div>}
        <div className="row">{definitions.map(renderField)}</div>
        <button className="btn btn-primary" disabled={saving||Boolean(loadError)}>{saving?'Saving…':'Save'}</button>
        <button type="button" className="btn btn-outline-secondary ms-2" onClick={()=>nav('/'+resource)}>Cancel</button>
      </form>
    </div>
  </>;
}
