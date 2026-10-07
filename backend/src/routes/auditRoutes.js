import {Router} from 'express';
import {auth,requireRoles} from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import mongoose from 'mongoose';
import {parseDateRange,parsePagination} from '../utils/query.js';

const r=Router();
r.get('/',auth,requireRoles('ADMIN'),asyncHandler(async(req,res)=>{
  const {page,limit,errors:pageErrors}=parsePagination(req.query,20);
  if(Object.keys(pageErrors).length)return res.status(400).json({success:false,message:'Invalid pagination',errors:pageErrors});
  const sort=String(req.query.sort||'-createdAt');
  if(!/^-?[a-zA-Z][a-zA-Z0-9]*$/.test(sort))return res.status(400).json({success:false,message:'Invalid sort field'});
  const query={};
  for(const field of ['action','entityName','result'])if(req.query[field])query[field]=req.query[field];
  if(req.query.recordId)query.recordId=String(req.query.recordId).slice(0,100);
  if(req.query.user){
    if(!mongoose.isObjectIdOrHexString(req.query.user))return res.status(400).json({success:false,message:'user must be a valid ID'});
    query.user=req.query.user;
  }
  const dates=parseDateRange(req.query,'createdAt');
  if(Object.keys(dates.errors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:dates.errors});
  Object.assign(query,dates.filter);
  const [data,total]=await Promise.all([
    AuditLog.find(query).sort(sort).skip((page-1)*limit).limit(limit).populate('user','name email role'),
    AuditLog.countDocuments(query)
  ]);
  res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
}));
export default r;