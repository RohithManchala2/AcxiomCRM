import {useEffect,useState} from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const emptyForm={name:'',email:'',password:'',role:'SALES_EXECUTIVE',manager:''};

export default function Users(){
  const[users,setUsers]=useState([]);
  const[form,setForm]=useState(emptyForm);
  const[error,setError]=useState('');
  const[success,setSuccess]=useState('');
  const load=()=>api.get('/users').then(response=>setUsers(response.data.data));
  useEffect(()=>{load().catch(()=>setError('Unable to load users'))},[]);
  const create=async event=>{
    event.preventDefault();
    setError('');
    setSuccess('');
    try{
      await api.post('/users',{...form,manager:form.manager||null});
      setForm(emptyForm);
      setSuccess('User created successfully');
      await load();
    }catch(requestError){
      setError(requestError.response?.data?.message||'Failed to create user');
    }
  };
  const assignManager=async(user,manager)=>{
    setError('');
    setSuccess('');
    try{
      await api.put(`/users/${user._id}`,{manager:manager||null});
      setSuccess(`Manager assignment updated for ${user.name}`);
      await load();
    }catch(requestError){
      setError(requestError.response?.data?.message||'Failed to update manager assignment');
    }
  };
  return <>
    <PageHeader title="Users & Roles" subtitle="Admin-only user administration"/>
    <div className="row g-4">
      <div className="col-lg-4">
        <div className="card form-card p-4">
          <h5>Create User</h5>
          {error&&<div className="alert alert-danger" role="alert">{error}</div>}
          {success&&<div className="alert alert-success" role="status">{success}</div>}
          <form onSubmit={create}>
            <label className="form-label" htmlFor="user-name">Name</label>
            <input id="user-name" className="form-control mb-2" value={form.name} onChange={event=>setForm({...form,name:event.target.value})} required/>
            <label className="form-label" htmlFor="user-email">Email</label>
            <input id="user-email" className="form-control mb-2" type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} required/>
            <label className="form-label" htmlFor="user-password">Temporary password</label>
            <input id="user-password" className="form-control mb-2" type="password" value={form.password} onChange={event=>setForm({...form,password:event.target.value})} required minLength={8}/>
            <label className="form-label" htmlFor="user-role">Role</label>
            <select id="user-role" className="form-select mb-2" value={form.role} onChange={event=>setForm({...form,role:event.target.value,manager:''})}>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="SALES_EXECUTIVE">Sales Executive</option>
            </select>
            {form.role==='SALES_EXECUTIVE'&&<>
              <label className="form-label" htmlFor="user-manager">Manager</label>
              <select id="user-manager" className="form-select mb-3" value={form.manager} onChange={event=>setForm({...form,manager:event.target.value})}>
                <option value="">No manager</option>
                {users.filter(user=>user.role==='MANAGER'&&user.isActive).map(manager=><option key={manager._id} value={manager._id}>{manager.name} ({manager.email})</option>)}
              </select>
            </>}
            <button className="btn btn-primary">Create</button>
          </form>
        </div>
      </div>
      <div className="col-lg-8">
        <div className="card table-card p-3">
          <div className="table-responsive"><table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th>Status</th><th>Lockout</th></tr></thead>
            <tbody>{users.map(user=><tr key={user._id}>
              <td>{user.name}</td><td>{user.email}</td><td>{user.role}</td>
              <td>{user.role==='SALES_EXECUTIVE'
                ?<select className="form-select form-select-sm" aria-label={`Manager for ${user.name}`} value={user.manager?._id||''} onChange={event=>assignManager(user,event.target.value)}>
                  <option value="">No manager</option>
                  {users.filter(manager=>manager.role==='MANAGER'&&manager.isActive).map(manager=><option key={manager._id} value={manager._id}>{manager.name}</option>)}
                </select>
                :'-'}</td>
              <td><span className={`badge ${user.isActive?'bg-success':'bg-secondary'}`}>{user.isActive?'Active':'Inactive'}</span></td>
              <td>{user.lockoutEnd&&new Date(user.lockoutEnd)>new Date()?new Date(user.lockoutEnd).toLocaleTimeString():'-'}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  </>;
}
