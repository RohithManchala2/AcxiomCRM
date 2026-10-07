import AuditLog from '../models/AuditLog.js';

export async function audit({req,userId,action,entityName,recordId,oldValue,newValue,result='SUCCESS',details=''}){
  const serialize=value=>value===undefined?undefined:JSON.stringify(value);
  return AuditLog.create({
    user:userId,
    action,
    entityName,
    recordId,
    oldValue:serialize(oldValue),
    newValue:serialize(newValue),
    result,
    details,
    ipAddress:req?.ip
  });
}
