import {useEffect,useState} from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const csvCell=value=>{
  let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
  if(/^[\s]*[=+\-@]/.test(text))text=`'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
};

export default function Reports(){
  const[type,setType]=useState('pipeline');
  const[data,setData]=useState([]);
  const[filters,setFilters]=useState({from:'',to:'',status:'',stage:'',assignedTo:'',user:''});
  const[sort,setSort]=useState('-amount');
  const[users,setUsers]=useState([]);
  const[page,setPage]=useState(1);
  const[meta,setMeta]=useState({});
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  useEffect(()=>{api.get('/users/assignable').then(response=>setUsers(response.data.data)).catch(()=>setUsers([]))},[]);
  const run=async(nextPage=1)=>{
    setLoading(true);
    setError('');
    const params={page:nextPage,limit:20};
    for(const [key,value] of Object.entries(filters))if(value&&(key!=='user'||type==='user-activity'))params[key]=value;
    params.sort=sort;
    try{
      const response=await api.get('/reports/'+type,{params});
      const result=response.data.data;
      setData(Array.isArray(result)?result:result==null?[]:[result]);
      setMeta(response.data.pagination||{});
      setPage(nextPage);
    }catch(requestError){
      setError(requestError.response?.data?.message||'Unable to run report.');
      setData([]);
    }finally{setLoading(false)}
  };
  const exportCsv=()=>{
    if(!data.length)return;
    const keys=Object.keys(data[0]);
    const rows=[keys.map(csvCell),...data.map(item=>keys.map(key=>csvCell(item[key])))];
    const blob=new Blob([rows.map(row=>row.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=`${type}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const supportsStatus=['customers','leads','opportunities','followups','activities'].includes(type);
  const sortFields=type==='pipeline'?['amount','count','weighted']:type==='user-activity'?['count']:type==='opportunities'?['createdAt','updatedAt','amount']:type==='followups'?['createdAt','followUpDate']:type==='activities'?['createdAt','activityDate']:['createdAt','updatedAt'];
  return <>
    <PageHeader title="Reports" subtitle="Role-scoped CRM reports"/>
    <div className="card table-card p-3">
      <div className="row g-2 align-items-end mb-3">
        <div className="col-sm-4 col-lg-3"><label className="form-label" htmlFor="report-type">Report</label><select id="report-type" className="form-select" value={type} onChange={event=>{setType(event.target.value);setSort(event.target.value==='pipeline'?'-amount':event.target.value==='user-activity'?'-count':'-createdAt');setData([]);setPage(1)}}><option value="pipeline">Pipeline</option><option value="conversion">Conversion</option><option value="customers">Customers</option><option value="leads">Leads</option><option value="opportunities">Opportunities</option><option value="followups">Follow-Ups</option><option value="activities">Activities</option><option value="user-activity">User Activity</option></select></div>
        {supportsStatus&&<div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="report-status">Status</label><input id="report-status" className="form-control" value={filters.status} onChange={event=>setFilters({...filters,status:event.target.value})} placeholder="Any status"/></div>}
        {type==='opportunities'&&<div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="report-stage">Stage</label><select id="report-stage" className="form-select" value={filters.stage} onChange={event=>setFilters({...filters,stage:event.target.value})}><option value="">All stages</option>{['Qualification','Proposal','Negotiation','Won','Lost'].map(stage=><option key={stage}>{stage}</option>)}</select></div>}
        {type==='user-activity'&&<div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="report-user">User</label><select id="report-user" className="form-select" value={filters.user} onChange={event=>setFilters({...filters,user:event.target.value})}><option value="">All available users</option>{users.map(user=><option key={user._id} value={user._id}>{user.name}</option>)}</select></div>}
        {['leads','opportunities','followups','activities','pipeline'].includes(type)&&<div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="report-assignee">Assignee</label><select id="report-assignee" className="form-select" value={filters.assignedTo} onChange={event=>setFilters({...filters,assignedTo:event.target.value})}><option value="">All assigned</option>{users.map(user=><option key={user._id} value={user._id}>{user.name}</option>)}</select></div>}
        {type!=='conversion'&&<div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="report-sort">Sort by</label><select id="report-sort" className="form-select" value={sort} onChange={event=>setSort(event.target.value)}>{sortFields.flatMap(field=>[<option key={`-${field}`} value={`-${field}`}>{field} (descending)</option>,<option key={field} value={field}>{field} (ascending)</option>])}</select></div>}
        <div className="col-sm-3 col-lg-2"><label className="form-label" htmlFor="report-from">From</label><input id="report-from" className="form-control" type="date" value={filters.from} onChange={event=>setFilters({...filters,from:event.target.value})}/></div>
        <div className="col-sm-3 col-lg-2"><label className="form-label" htmlFor="report-to">To</label><input id="report-to" className="form-control" type="date" value={filters.to} onChange={event=>setFilters({...filters,to:event.target.value})}/></div>
        <div className="col-auto"><button className="btn btn-primary" onClick={()=>run(1)} disabled={loading}>{loading?'Loading…':'Run Report'}</button></div>
        <div className="col-auto"><button className="btn btn-outline-success" onClick={exportCsv} disabled={!data.length}>Export CSV</button></div>
      </div>
      {error&&<div className="alert alert-danger" role="alert">{error}</div>}
      {!error&&!data.length&&!loading&&<div className="text-muted py-3">Run a report to see results.</div>}
      {loading&&<div className="text-center py-3" role="status">Loading report…</div>}
      {data.length>0&&<><div className="table-responsive"><table className="table"><thead><tr>{Object.keys(data[0]).map(key=><th key={key}>{key}</th>)}</tr></thead><tbody>{data.map((row,index)=><tr key={row._id||index}>{Object.values(row).map((value,column)=><td key={column}>{value&&typeof value==='object'?JSON.stringify(value):String(value??'')}</td>)}</tr>)}</tbody></table></div>
        {meta.total!==undefined&&<div className="d-flex justify-content-between align-items-center"><span>{meta.total} records</span><div><button className="btn btn-sm btn-outline-secondary me-2" disabled={page<=1||loading} onClick={()=>run(page-1)}>Previous</button><span>Page {page} / {meta.totalPages||1}</span><button className="btn btn-sm btn-outline-secondary ms-2" disabled={page>=(meta.totalPages||1)||loading} onClick={()=>run(page+1)}>Next</button></div></div>}
      </>}
    </div>
  </>;
}
