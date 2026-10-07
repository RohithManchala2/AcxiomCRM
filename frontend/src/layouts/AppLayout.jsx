import {useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

const items=[['/dashboard','Dashboard'],['/customers','Customers'],['/leads','Leads'],['/opportunities','Opportunities'],['/followups','Follow-Ups'],['/activities','Activities']];

export default function AppLayout(){
  const{user,logout}=useAuth();
  const nav=useNavigate();
  const[menuOpen,setMenuOpen]=useState(false);
  const closeMenu=()=>setMenuOpen(false);
  return <div className="app-shell">
    {menuOpen&&<button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={closeMenu}/>}
    <aside className={`sidebar text-white p-3 ${menuOpen?'sidebar-open':''}`}>
      <div className="brand fs-4 mb-4">AcxiomCRM</div>
      <nav aria-label="Main navigation">
        {items.map(([path,label])=><NavLink key={path} to={path} onClick={closeMenu} className="d-block rounded p-2 mb-1">{label}</NavLink>)}
        {user.role==='ADMIN'&&<><hr/><NavLink to="/users" onClick={closeMenu} className="d-block rounded p-2 mb-1">Users & Roles</NavLink><NavLink to="/audit-logs" onClick={closeMenu} className="d-block rounded p-2 mb-1">Audit Logs</NavLink></>}
        {(user.role==='ADMIN'||user.role==='MANAGER')&&<NavLink to="/reports" onClick={closeMenu} className="d-block rounded p-2 mb-1">Reports</NavLink>}
      </nav>
      <button className="btn btn-outline-light btn-sm w-100 mt-4" onClick={async()=>{await logout();nav('/login')}}>Logout</button>
    </aside>
    <main className="app-main">
      <header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2"><button type="button" className="btn btn-outline-secondary btn-sm mobile-menu-button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}>Menu</button><span className="fw-semibold">CRM Workspace</span></div>
        <span>{user.name} <span className="badge bg-primary ms-2">{user.role}</span></span>
      </header>
      <div className="container-fluid p-4"><Outlet/></div>
    </main>
  </div>;
}
