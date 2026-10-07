import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const titles={customers:'Customer',leads:'Lead',opportunities:'Opportunity',followups:'Follow-Up',activities:'Activity'};

function format(value){
  if(value==null||value==='')return '-';
  if(typeof value==='object')return value.name||value.customerName||value.leadName||value.opportunityName||value.email||value._id||JSON.stringify(value);
  if(/^\d{4}-\d{2}-\d{2}T/.test(String(value)))return new Date(value).toLocaleString();
  return String(value);
}

export default function RecordDetails(){
  const{resource,id}=useParams();
  const[record,setRecord]=useState(null);
  const[related,setRelated]=useState([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    setLoading(true);
    setError('');
    const linked=resource==='customers'
      ?[['opportunities',{customer:id}],['followups',{customer:id}],['activities',{customer:id}]]
      :resource==='leads'
        ?[['opportunities',{lead:id}],['followups',{lead:id}],['activities',{lead:id}]]
        :resource==='opportunities'
          ?[['followups',{opportunity:id}],['activities',{opportunity:id}]]
          :[];
    Promise.all([
      api.get(`/${resource}/${id}`),
      ...linked.map(([path,params])=>api.get('/'+path,{params:{...params,page:1,limit:100}}))
    ]).then(([detail,...relatedResponses])=>{
      if(!active)return;
      setRecord(detail.data.data);
      setRelated(relatedResponses.flatMap((response,index)=>response.data.data.map(item=>({resource:linked[index][0],...item}))));
    }).catch(requestError=>{
      if(active)setError(requestError.response?.data?.message||'Unable to load this record.');
    }).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[resource,id]);
  if(loading)return <div className="text-center p-5" role="status">Loading record…</div>;
  if(error)return <div className="alert alert-danger" role="alert">{error}</div>;
  if(!record)return <div className="alert alert-warning">Record not found.</div>;
  const excluded=new Set(['_id','__v','passwordHash']);
  return <>
    <PageHeader title={`${titles[resource]} Details`} action={`/${resource}/${id}/edit`} actionText="Edit"/>
    <div className="card table-card p-3 mb-4">
      <dl className="row mb-0">{Object.entries(record).filter(([key])=>!excluded.has(key)).map(([key,value])=><div className="col-md-6 mb-3" key={key}><dt>{key.replace(/[A-Z]/g,char=>` ${char}`).replace(/^./,char=>char.toUpperCase())}</dt><dd className="mb-0">{format(value)}</dd></div>)}</dl>
    </div>
    {related.length>0&&<div className="card table-card p-3"><h3 className="h5">Related Records</h3><div className="table-responsive"><table className="table"><thead><tr><th>Type</th><th>Name / Subject</th><th>Status / Stage</th><th>Link</th></tr></thead><tbody>{related.map(item=><tr key={`${item.resource}-${item._id}`}><td>{titles[item.resource]}</td><td>{item.customerName||item.leadName||item.opportunityName||item.subject||'-'}</td><td>{item.status||item.stage||'-'}</td><td><Link to={`/${item.resource}/${item._id}`}>View</Link></td></tr>)}</tbody></table></div></div>}
    <Link className="btn btn-outline-secondary mt-3" to={`/${resource}`}>Back to {titles[resource]} list</Link>
  </>;
}
