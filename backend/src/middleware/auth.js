import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function auth(req,res,next){
  const token=req.cookies?.accessToken||req.headers.authorization?.replace(/^Bearer\s+/i,'');
  if(!token)return res.status(401).json({success:false,message:'Authentication required'});
  let payload;
  try{
    payload=jwt.verify(token,process.env.JWT_SECRET);
  }catch{
    return res.status(401).json({success:false,message:'Invalid or expired authentication'});
  }
  try{
    const user=await User.findById(payload.id);
    if(!user||!user.isActive)return res.status(401).json({success:false,message:'Account unavailable'});
    if(user.lockoutEnd&&user.lockoutEnd>Date.now())return res.status(423).json({success:false,message:'Account is temporarily locked'});
    req.user=user;
    next();
  }catch(error){
    next(error);
  }
}

export const requireRoles=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({success:false,message:'Access denied'});
