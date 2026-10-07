import {Router} from 'express';
import {auth,requireRoles} from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
r.get('/',auth,requireRoles('ADMIN'),asyncHandler(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1);
  const limit=Math.min(100,Number(req.query.limit)||20);
  const query={};
  if(req.query.action)query.action=req.query.action;
  if(req.query.user)query.user=req.query.user;
  const [data,total]=await Promise.all([
    AuditLog.find(query).sort('-createdAt').skip((page-1)*limit).limit(limit).populate('user','name email role'),
    AuditLog.countDocuments(query)
  ]);
  res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
}));
export default r;