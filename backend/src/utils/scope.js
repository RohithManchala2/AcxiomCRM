import User from '../models/User.js';

export async function assignedScope(user,field='assignedTo'){
  if(user.role==='ADMIN')return {};
  if(user.role==='MANAGER'){
    const reports=await User.find({manager:user._id}).distinct('_id');
    return {[field]:{$in:[user._id,...reports]}};
  }
  return {[field]:user._id};
}

export const ownerScope=(user,field='owner')=>assignedScope(user,field);
