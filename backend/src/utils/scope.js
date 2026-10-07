export function ownerScope(user,field='owner'){if(user.role==='ADMIN')return {}; if(user.role==='MANAGER')return {}; return {[field]:user._id};}
export function assignedScope(user,field='assignedTo'){if(user.role==='ADMIN'||user.role==='MANAGER')return {};return {[field]:user._id};}
