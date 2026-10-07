import {useEffect,useState} from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

export default function AuditLogs(){
  const[rows,setRows]=useState([]);
  const[users,setUsers]=useState([]);
  const[filters,setFilters]=useState({action:'',entityName:'',recordId:'',result:'',user:'',from:'',to:''});
  const[sort,setSort]=useState('-createdAt');
  const[page,setPage]=useState(1);
  const[meta,setMeta]=useState({});
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  useEffect(()=>{api.get('/users',{params:{page:1,limit:100}}).then(response=>setUsers(response.data.data)).catch(()=>setUsers([]))},[]);
  const load=async(nextPage=1)=>{
    setLoading(true);
    setError('');
    try{
      const response=await api.get('/audit-logs',{params:{...Object.fromEntries(Object.entries(filters).filter(([,value])=>value)),page:nextPage,limit:20,sort}});
      setRows(response.data.data);
      setMeta(response.data.pagination);
      setPage(nextPage);
    }catch(requestError){
      setError(requestError.response?.data?.message||'Unable to load audit logs.');
      setRows([]);
    }finally{setLoading(false)}
  };
  useEffect(()=>{load(1)},[]);
  return <>
    <PageHeader title="Audit Logs" subtitle="Security and business activity history"/>
    <div className="card table-card p-3">
      <form className="row g-2 align-items-end mb-3" onSubmit={event=>{event.preventDefault();load(1)}}>
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="audit-user">User</label><select id="audit-user" className="form-select" value={filters.user} onChange={event=>setFilters({...filters,user:event.target.value})}><option value="">All users</option>{users.map(user=><option key={user._id} value={user._id}>{user.name}</option>)}</select></div>
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="audit-action">Action</label><input id="audit-action" className="form-control" value={filters.action} onChange={event=>setFilters({...filters,action:event.target.value})}/></div>
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="audit-entity">Entity</label><input id="audit-entity" className="form-control" value={filters.entityName} onChange={event=>setFilters({...filters,entityName:event.target.value})}/></div>
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="audit-record">Record ID</label><input id="audit-record" className="form-control" value={filters.recordId} onChange={event=>setFilters({...filters,recordId:event.target.value})}/></div>
        <div className="col-sm-4 col-lg-1"><label className="form-label" htmlFor="audit-result">Result</label><input id="audit-result" className="form-control" value={filters.result} onChange={event=>setFilters({...filters,result:event.target.value})}/></div>
        <div className="col-sm-3 col-lg-1"><label className="form-label" htmlFor="audit-from">From</label><input id="audit-from" className="form-control" type="date" value={filters.from} onChange={event=>setFilters({...filters,from:event.target.value})}/></div>
        <div className="col-sm-3 col-lg-1"><label className="form-label" htmlFor="audit-to">To</label><input id="audit-to" className="form-control" type="date" value={filters.to} onChange={event=>setFilters({...filters,to:event.target.value})}/></div>
        <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="audit-sort">Sort</label><select id="audit-sort" className="form-select" value={sort} onChange={event=>setSort(event.target.value)}><option value="-createdAt">Newest first</option><option value="createdAt">Oldest first</option></select></div>
        <div className="col-auto"><button className="btn btn-primary">Filter</button></div>
      </form>
      {error&&<div className="alert alert-danger" role="alert">{error}</div>}
      <div className="table-responsive"><table className="table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Record ID</th><th>Result</th><th>Details</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row._id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.user?.name||'System'}</td><td>{row.action}</td><td>{row.entityName||'-'}</td><td>{row.recordId||'-'}</td><td>{row.result}</td><td>{row.details||'-'}</td></tr>)}</tbody>
      </table></div>
      {!loading&&!rows.length&&!error&&<div className="text-muted py-3">No audit records match these filters.</div>}
      {loading&&<div className="text-center py-3" role="status">Loading audit logs…</div>}
      <div className="d-flex justify-content-between align-items-center"><span>{meta.total??0} records</span><div><button className="btn btn-sm btn-outline-secondary me-2" disabled={page<=1||loading} onClick={()=>load(page-1)}>Previous</button><span>Page {page} / {meta.totalPages||1}</span><button className="btn btn-sm btn-outline-secondary ms-2" disabled={page>=(meta.totalPages||1)||loading} onClick={()=>load(page+1)}>Next</button></div></div>
    </div>
  </>;
}
