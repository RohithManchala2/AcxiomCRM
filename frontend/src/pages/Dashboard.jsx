import {useCallback,useEffect,useState} from 'react';
import {Bar,Doughnut,Line} from 'react-chartjs-2';
import {Chart as ChartJS,CategoryScale,LinearScale,BarElement,LineElement,PointElement,ArcElement,Tooltip,Legend} from 'chart.js';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

ChartJS.register(CategoryScale,LinearScale,BarElement,LineElement,PointElement,ArcElement,Tooltip,Legend);

function dateWindow(range,from,to){
  if(range==='custom')return from||to?{...(from?{from}:{}),...(to?{to}:{})}:{};
  if(range==='all')return {};
  const end=new Date();
  const start=new Date(end);
  start.setHours(0,0,0,0);
  if(range==='week')start.setDate(start.getDate()-((start.getDay()+6)%7));
  if(range==='month')start.setDate(1);
  return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}

export default function Dashboard(){
  const[kpi,setKpi]=useState(null);
  const[lead,setLead]=useState([]);
  const[opp,setOpp]=useState([]);
  const[monthly,setMonthly]=useState([]);
  const[follow,setFollow]=useState([]);
  const[range,setRange]=useState('all');
  const[from,setFrom]=useState('');
  const[to,setTo]=useState('');
  const[applied,setApplied]=useState({});
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    setError('');
    try{
      const params=applied;
      const [summary,leadStatus,pipeline,sales,upcoming]=await Promise.all([
        api.get('/dashboard/summary',{params}),
        api.get('/dashboard/lead-status',{params}),
        api.get('/dashboard/opportunity-pipeline',{params}),
        api.get('/dashboard/monthly-sales',{params}),
        api.get('/dashboard/upcoming-followups',{params})
      ]);
      setKpi(summary.data.data);
      setLead(leadStatus.data.data);
      setOpp(pipeline.data.data);
      setMonthly(sales.data.data);
      setFollow(upcoming.data.data);
    }catch(requestError){
      setError(requestError.response?.data?.message||'Unable to load dashboard data.');
    }finally{
      setLoading(false);
    }
  },[applied]);

  useEffect(()=>{load()},[load]);

  const applyRange=event=>{
    event.preventDefault();
    setApplied(dateWindow(range,from,to));
  };
  const cards=[
    ['Total Customers',kpi?.totalCustomers],
    ['Total Leads',kpi?.totalLeads],
    ['Open Leads',kpi?.openLeads],
    ['Total Opportunities',kpi?.totalOpportunities],
    ['Open Opportunities',kpi?.openOpportunities],
    ['Won Opportunities',kpi?.wonOpportunities],
    ['Lost Opportunities',kpi?.lostOpportunities],
    ['Pipeline Value',`₹${Number(kpi?.totalPipelineValue||0).toLocaleString()}`]
  ];
  return <>
    <PageHeader title="Dashboard" subtitle="Role-scoped sales overview"/>
    <form className="card table-card p-3 mb-4" onSubmit={applyRange}>
      <div className="row g-2 align-items-end">
        <div className="col-sm-4 col-lg-3">
          <label className="form-label" htmlFor="dashboard-range">Date range</label>
          <select id="dashboard-range" className="form-select" value={range} onChange={event=>setRange(event.target.value)}>
            <option value="all">All time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom range</option>
          </select>
        </div>
        {range==='custom'&&<>
          <div className="col-sm-3"><label className="form-label" htmlFor="dashboard-from">From</label><input id="dashboard-from" className="form-control" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></div>
          <div className="col-sm-3"><label className="form-label" htmlFor="dashboard-to">To</label><input id="dashboard-to" className="form-control" type="date" value={to} onChange={event=>setTo(event.target.value)}/></div>
        </>}
        <div className="col-auto"><button className="btn btn-outline-primary" disabled={loading}>Apply</button><button className="btn btn-outline-secondary ms-2" type="button" onClick={load} disabled={loading}>Refresh</button></div>
      </div>
    </form>
    {error&&<div className="alert alert-danger" role="alert">{error}</div>}
    {loading&&!kpi?<div className="text-center p-5" role="status">Loading dashboard…</div>:kpi&&<>
      <div className="row g-3 mb-4">{cards.map(([label,value])=><div className="col-6 col-md-3" key={label}><div className="card kpi p-3"><div className="small-muted">{label}</div><div className="fs-4 fw-bold mt-1">{loading?'…':value??0}</div></div></div>)}</div>
      <div className="row g-4">
        <div className="col-lg-4"><div className="card table-card p-3 h-100"><h5>Lead Status</h5>{lead.length?<Doughnut data={{labels:lead.map(item=>item._id),datasets:[{data:lead.map(item=>item.count)}]}}/>:<div className="text-muted">No lead data for this period.</div>}</div></div>
        <div className="col-lg-4"><div className="card table-card p-3 h-100"><h5>Opportunity Pipeline</h5>{opp.length?<Bar data={{labels:opp.map(item=>item._id),datasets:[{label:'Amount',data:opp.map(item=>item.amount)}]}} options={{responsive:true}}/>:<div className="text-muted">No opportunity data for this period.</div>}</div></div>
        <div className="col-lg-4"><div className="card table-card p-3 h-100"><h5>Monthly Sales</h5>{monthly.length?<Line data={{labels:monthly.map(item=>item._id),datasets:[{label:'Won Sales',data:monthly.map(item=>item.amount),tension:.3}]}}/>:<div className="text-muted">No won sales for this period.</div>}</div></div>
      </div>
      <div className="card table-card mt-4 p-3"><h5>Upcoming Follow-Ups</h5>{follow.length?<div className="table-responsive"><table className="table"><thead><tr><th>Date</th><th>Subject</th><th>Customer</th><th>Type</th></tr></thead><tbody>{follow.map(item=><tr key={item._id}><td>{new Date(item.followUpDate).toLocaleDateString()}</td><td>{item.subject}</td><td>{item.customer?.customerName||'-'}</td><td>{item.followUpType}</td></tr>)}</tbody></table></div>:<div className="text-muted">No upcoming follow-ups.</div>}</div>
    </>}
  </>;
}
