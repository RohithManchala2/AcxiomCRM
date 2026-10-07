import {useCallback,useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import ConfirmButton from '../components/ConfirmButton';

const config={
  customers:{title:'Customers',fields:['customerName','email','phone','companyName','status'],search:'Name, email, phone or company',new:'/customers/new',filters:{status:['Active','Inactive','Prospect'],owner:true},sort:['customerName','createdAt','updatedAt']},
  leads:{title:'Leads',fields:['leadName','companyName','source','status','priority','expectedValue','assignedTo'],search:'Lead name, company or status',new:'/leads/new',filters:{status:['New','Contacted','Qualified','Unqualified','Converted','Lost'],priority:['Low','Medium','High'],assignedTo:true},sort:['leadName','createdAt','expectedValue']},
  opportunities:{title:'Opportunities',fields:['opportunityName','customer','stage','amount','probability','status','assignedTo'],search:'Opportunity name, stage or status',new:'/opportunities/new',filters:{stage:['Qualification','Proposal','Negotiation','Won','Lost'],status:['Open','Won','Lost'],assignedTo:true,customer:true},sort:['opportunityName','createdAt','amount','expectedCloseDate']},
  followups:{title:'Follow-Ups',fields:['subject','customer','lead','followUpDate','followUpType','status','assignedTo'],search:'Subject, type or status',new:'/followups/new',filters:{status:['Planned','Overdue','Completed','Missed','Cancelled'],followUpType:['Call','Meeting','Email','Task'],assignedTo:true,customer:true,lead:true},sort:['followUpDate','createdAt','status']},
  activities:{title:'Activities',fields:['subject','customer','lead','activityType','activityDate','status','assignedTo'],search:'Subject, type or status',new:'/activities/new',filters:{status:['Planned','Completed','Cancelled'],activityType:['Call','Meeting','Email','Task'],assignedTo:true,customer:true,lead:true},sort:['activityDate','createdAt','status']}
};

function display(value){
  if(value==null)return '-';
  if(typeof value==='object')return value.customerName||value.name||value.email||value.opportunityName||value.leadName||value._id||'-';
  return String(value).length>45?`${String(value).slice(0,45)}…`:value;
}

export default function ResourcePage({resource}){
  const cfg=config[resource];
  const location=useLocation();
  const[rows,setRows]=useState([]);
  const[search,setSearch]=useState('');
  const[filters,setFilters]=useState({});
  const[lookups,setLookups]=useState({users:[],customers:[],leads:[]});
  const[page,setPage]=useState(1);
  const[limit,setLimit]=useState(10);
  const[sort,setSort]=useState('-createdAt');
  const[meta,setMeta]=useState({});
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');

  useEffect(()=>{
    Promise.all([
      api.get('/users/assignable'),
      api.get('/customers',{params:{page:1,limit:100}}),
      api.get('/leads',{params:{page:1,limit:100}})
    ]).then(([users,customers,leads])=>setLookups({users:users.data.data,customers:customers.data.data,leads:leads.data.data})).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(location.state?.notice)setNotice(location.state.notice);
  },[location.state]);

  const load=useCallback(async(nextPage=page)=>{
    setLoading(true);
    setError('');
    try{
      const params={...Object.fromEntries(Object.entries(filters).filter(([,value])=>value)),search,page:nextPage,limit,sort};
      const response=await api.get('/'+resource,{params});
      setRows(response.data.data);
      setMeta(response.data.pagination||{});
      setPage(nextPage);
    }catch(requestError){
      setRows([]);
      setError(requestError.response?.data?.message||'Unable to load records.');
    }finally{setLoading(false)}
  },[filters,limit,page,resource,search,sort]);

  useEffect(()=>{load(1)},[resource,filters,limit,sort]);

  const remove=async id=>{
    setNotice('');
    try{await api.delete(`/${resource}/${id}`);setNotice('Record deactivated successfully');await load()}
    catch(requestError){setError(requestError.response?.data?.message||'Unable to deactivate record.')}
  };
  const convert=async id=>{
    setNotice('');
    setError('');
    try{await api.post(`/leads/${id}/convert`);setNotice('Lead converted successfully');await load()}
    catch(requestError){setError(requestError.response?.data?.message||'Lead conversion failed.')}
  };
  const filterSelect=(key,values,label)=>{
    const choices=typeof values==='boolean'?(key==='customer'?lookups.customers:key==='lead'?lookups.leads:lookups.users):values;
    return <div className="col-sm-6 col-lg-3" key={key}><label className="form-label" htmlFor={`filter-${key}`}>{label}</label><select id={`filter-${key}`} className="form-select" value={filters[key]||''} onChange={event=>setFilters({...filters,[key]:event.target.value})}><option value="">All</option>{choices.map(choice=>{
      const value=typeof choice==='string'?choice:choice._id;
      const text=typeof choice==='string'?choice:display(choice);
      return <option key={value} value={value}>{text}</option>;
    })}</select></div>;
  };
  return <>
    <PageHeader title={cfg.title} subtitle="Search, filter and manage records" action={cfg.new} actionText={cfg.title==='Follow-Ups'?'Add Follow-Up':`Add ${cfg.title.replace(/s$/,'')}`}/>
    <div className="card table-card p-3">
      {notice&&<div className="alert alert-success" role="status">{notice}</div>}
      {error&&<div className="alert alert-danger" role="alert">{error}</div>}
      <form className="row g-2 align-items-end mb-3" onSubmit={event=>{event.preventDefault();load(1)}}>
        <div className="col-sm-8 col-lg-5"><label className="form-label" htmlFor="resource-search">Search</label><input id="resource-search" className="form-control" placeholder={cfg.search} value={search} onChange={event=>setSearch(event.target.value)}/></div>
        {Object.entries(cfg.filters).map(([key,values])=>filterSelect(key,values,key.replace(/[A-Z]/g,letter=>` ${letter}`).replace(/^./,letter=>letter.toUpperCase())))}
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="resource-from">From</label><input id="resource-from" type="date" className="form-control" value={filters.from||''} onChange={event=>setFilters({...filters,from:event.target.value})}/></div>
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="resource-to">To</label><input id="resource-to" type="date" className="form-control" value={filters.to||''} onChange={event=>setFilters({...filters,to:event.target.value})}/></div>
        <div className="col-sm-6 col-lg-2"><label className="form-label" htmlFor="resource-sort">Sort by</label><select id="resource-sort" className="form-select" value={sort} onChange={event=>setSort(event.target.value)}>{cfg.sort.map(field=><ReactOption key={field} field={field}/>)}</select></div>
        <div className="col-sm-3 col-lg-1"><label className="form-label" htmlFor="resource-limit">Rows</label><select id="resource-limit" className="form-select" value={limit} onChange={event=>setLimit(Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></div>
        <div className="col-auto"><button className="btn btn-outline-primary" disabled={loading}>Apply</button></div>
      </form>
      <div className="table-responsive"><table className="table align-middle"><thead><tr>{cfg.fields.map(field=><th key={field}>{field.replace(/[A-Z]/g,letter=>` ${letter}`).replace(/^./,letter=>letter.toUpperCase())}</th>)}<th>Actions</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row._id}>{cfg.fields.map(field=><td key={field}>{resource==='followups'&&field==='status'&&row.status==='Planned'&&new Date(row.followUpDate)<new Date(new Date().setHours(0,0,0,0))?<span className="badge bg-danger">Overdue</span>:field.toLowerCase().includes('date')&&row[field]?new Date(row[field]).toLocaleString():display(row[field])}</td>)}<td className="text-nowrap"><Link className="btn btn-sm btn-outline-secondary me-1" to={`/${resource}/${row._id}`}>View</Link><Link className="btn btn-sm btn-outline-primary me-1" to={`/${resource}/${row._id}/edit`}>Edit</Link><ConfirmButton onConfirm={()=>remove(row._id)}/>{resource==='leads'&&row.status==='Qualified'&&<button className="btn btn-sm btn-outline-success ms-1" onClick={()=>convert(row._id)}>Convert</button>}</td></tr>)}</tbody>
      </table></div>
      {!loading&&!rows.length&&!error&&<div className="text-muted py-3">No records match these filters.</div>}
      {loading&&<div className="text-center py-3" role="status">Loading records…</div>}
      <div className="d-flex justify-content-between align-items-center"><span>{meta.total||0} records</span><div><button className="btn btn-sm btn-outline-secondary me-2" disabled={page<=1||loading} onClick={()=>load(page-1)}>Previous</button><span>Page {page} / {meta.totalPages||1}</span><button className="btn btn-sm btn-outline-secondary ms-2" disabled={page>=(meta.totalPages||1)||loading} onClick={()=>load(page+1)}>Next</button></div></div>
    </div>
  </>;
}

function ReactOption({field}){
  const label=field.replace(/[A-Z]/g,letter=>` ${letter}`).replace(/^./,letter=>letter.toUpperCase());
  return <><option value={`-${field}`}>{label} (descending)</option><option value={field}>{label} (ascending)</option></>;
}
