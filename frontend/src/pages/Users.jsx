import {useEffect,useState} from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const blank={name:'',email:'',password:'',role:'SALES_EXECUTIVE',manager:''};

export default function Users(){
  const[users,setUsers]=useState([]);
  const[managerOptions,setManagerOptions]=useState([]);
  const[form,setForm]=useState(blank);
  const[editingId,setEditingId]=useState('');
  const[filters,setFilters]=useState({search:'',role:'',status:''});
  const[page,setPage]=useState(1);
  const[meta,setMeta]=useState({});
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[loading,setLoading]=useState(true);
  const load=async(nextPage=page)=>{
    setLoading(true);
    setError('');
    try{
      const response=await api.get('/users',{params:{...Object.fromEntries(Object.entries(filters).filter(([,value])=>value)),page:nextPage,limit:20}});
      setUsers(response.data.data);
      setMeta(response.data.pagination);
      setPage(nextPage);
    }catch(requestError){
      setError(requestError.response?.data?.message||'Unable to load users.');
    }finally{setLoading(false)}
  };
  const loadManagerOptions=()=>api.get('/users/assignable').then(response=>setManagerOptions(response.data.data.filter(user=>user.role==='MANAGER')));
  useEffect(()=>{load(1)},[filters]);
  useEffect(()=>{loadManagerOptions().catch(()=>setManagerOptions([]))},[]);
  const resetForm=()=>{setForm(blank);setEditingId('')};
  const save=async event=>{
    event.preventDefault();
    setError('');
    setNotice('');
    const payload={...form,manager:form.manager||null};
    if(!payload.password)delete payload.password;
    try{
      if(editingId)await api.put(`/users/${editingId}`,payload);
      else await api.post('/users',payload);
      setNotice(editingId?'User updated successfully':'User created successfully');
      resetForm();
      await load(1);
      await loadManagerOptions();
    }catch(requestError){
      setError(requestError.response?.data?.message||'Unable to save user.');
    }
  };
  const edit=user=>{
    setEditingId(user._id);
    setForm({name:user.name,email:user.email,password:'',role:user.role,manager:user.manager?._id||''});
    setError('');
    setNotice('');
  };
  const updateStatus=async user=>{
    setError('');
    setNotice('');
    try{
      await api.patch(`/users/${user._id}/status`,{isActive:!user.isActive});
      setNotice(user.isActive?'User deactivated':'User activated');
      await load();
    }catch(requestError){setError(requestError.response?.data?.message||'Unable to update user status.')}
  };
  const unlock=async user=>{
    setError('');
    setNotice('');
    try{
      await api.patch(`/users/${user._id}/unlock`);
      setNotice(`Login lockout cleared for ${user.name}`);
      await load();
    }catch(requestError){setError(requestError.response?.data?.message||'Unable to unlock user.')}
  };
  return <>
    <PageHeader title="Users & Roles" subtitle="Admin-only user administration"/>
    {error&&<div className="alert alert-danger" role="alert">{error}</div>}
    {notice&&<div className="alert alert-success" role="status">{notice}</div>}
    <div className="row g-4">
      <div className="col-lg-4">
        <div className="card form-card p-4">
          <h2 className="h5">{editingId?'Edit User':'Create User'}</h2>
          <form onSubmit={save}>
            <label className="form-label" htmlFor="user-name">Name</label>
            <input id="user-name" className="form-control mb-2" value={form.name} onChange={event=>setForm({...form,name:event.target.value})} required maxLength={100}/>
            <label className="form-label" htmlFor="user-email">Email</label>
            <input id="user-email" className="form-control mb-2" type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} required/>
            <label className="form-label" htmlFor="user-password">{editingId?'New password (leave blank to keep current)':'Temporary password'}</label>
            <input id="user-password" className="form-control mb-2" type="password" value={form.password} onChange={event=>setForm({...form,password:event.target.value})} required={!editingId} minLength={8} autoComplete="new-password"/>
            <label className="form-label" htmlFor="user-role">Role</label>
            <select id="user-role" className="form-select mb-2" value={form.role} onChange={event=>setForm({...form,role:event.target.value,manager:event.target.value==='SALES_EXECUTIVE'?form.manager:''})}>
              <option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="SALES_EXECUTIVE">Sales Executive</option>
            </select>
            {form.role==='SALES_EXECUTIVE'&&<><label className="form-label" htmlFor="user-manager">Manager</label><select id="user-manager" className="form-select mb-3" value={form.manager} onChange={event=>setForm({...form,manager:event.target.value})}><option value="">No manager</option>{managerOptions.map(manager=><option key={manager._id} value={manager._id}>{manager.name}</option>)}</select></>}
            <button className="btn btn-primary">{editingId?'Save changes':'Create'}</button>
            {editingId&&<button type="button" className="btn btn-outline-secondary ms-2" onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>
      <div className="col-lg-8">
        <div className="card table-card p-3">
          <form className="row g-2 mb-3" onSubmit={event=>{event.preventDefault();load(1)}}>
            <div className="col-md-5"><label className="form-label" htmlFor="user-search">Search</label><input id="user-search" className="form-control" value={filters.search} onChange={event=>setFilters({...filters,search:event.target.value})} placeholder="Name or email"/></div>
            <div className="col-md-3"><label className="form-label" htmlFor="user-filter-role">Role</label><select id="user-filter-role" className="form-select" value={filters.role} onChange={event=>setFilters({...filters,role:event.target.value})}><option value="">All roles</option><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="SALES_EXECUTIVE">Sales Executive</option></select></div>
            <div className="col-md-3"><label className="form-label" htmlFor="user-filter-status">Status</label><select id="user-filter-status" className="form-select" value={filters.status} onChange={event=>setFilters({...filters,status:event.target.value})}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="col-auto align-self-end"><button className="btn btn-outline-primary" disabled={loading}>Filter</button></div>
          </form>
          <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th>Status</th><th>Lockout</th><th>Actions</th></tr></thead>
            <tbody>{users.map(user=><tr key={user._id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.manager?.name||'-'}</td><td><span className={`badge ${user.isActive?'bg-success':'bg-secondary'}`}>{user.isActive?'Active':'Inactive'}</span></td><td>{user.lockoutEnd&&new Date(user.lockoutEnd)>new Date()?new Date(user.lockoutEnd).toLocaleString():'-'}</td><td className="text-nowrap"><button className="btn btn-sm btn-outline-primary me-1" onClick={()=>edit(user)}>Edit</button><button className="btn btn-sm btn-outline-secondary me-1" onClick={()=>window.confirm(`${user.isActive?'Deactivate':'Activate'} ${user.name}?`)&&updateStatus(user)}>{user.isActive?'Deactivate':'Activate'}</button>{user.lockoutEnd&&new Date(user.lockoutEnd)>new Date()&&<button className="btn btn-sm btn-outline-warning" onClick={()=>unlock(user)}>Unlock</button>}</td></tr>)}</tbody>
          </table></div>
          {!loading&&!users.length&&<div className="text-muted py-3">No users match these filters.</div>}
          {loading&&<div className="text-center py-3" role="status">Loading users…</div>}
          <div className="d-flex justify-content-between align-items-center"><span>{meta.total||0} users</span><div><button className="btn btn-sm btn-outline-secondary me-2" disabled={page<=1||loading} onClick={()=>load(page-1)}>Previous</button><span>Page {page} / {meta.totalPages||1}</span><button className="btn btn-sm btn-outline-secondary ms-2" disabled={page>=(meta.totalPages||1)||loading} onClick={()=>load(page+1)}>Next</button></div></div>
        </div>
      </div>
    </div>
  </>;
}
