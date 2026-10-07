import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import {audit} from '../services/auditService.js';
import {ROLES} from '../config/constants.js';
import {cleanEmail,emailRe} from '../utils/validation.js';

const safe=user=>({
  _id:user._id,name:user.name,email:user.email,role:user.role,manager:user.manager||null,
  isActive:user.isActive,failedLoginCount:user.failedLoginCount,lockoutEnd:user.lockoutEnd,createdAt:user.createdAt
});
const validPassword=password=>typeof password==='string'&&password.length>=8&&/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);

async function validateManager(managerId,userId){
  if(managerId==null||managerId==='')return {manager:null};
  if(!mongoose.isObjectIdOrHexString(managerId))return {error:'Manager must be a valid user ID'};
  if(userId&&String(managerId)===String(userId))return {error:'A user cannot be their own manager'};
  const manager=await User.findOne({_id:managerId,role:ROLES.MANAGER,isActive:true}).select('_id');
  return manager?{manager:manager._id}:{error:'Selected manager does not exist, is inactive, or is not a Manager'};
}

export async function listUsers(req,res){
  const users=await User.find().select('-passwordHash').sort('-createdAt').populate('manager','name email role');
  res.json({success:true,data:users});
}

export async function createUser(req,res){
  const body=req.body||{};
  const {name,password,role}=body;
  const email=cleanEmail(body.email);
  if(typeof name!=='string'||!name.trim()||!email||!password||!role)return res.status(400).json({success:false,message:'Name, email, password and role are required'});
  if(name.trim().length>100)return res.status(400).json({success:false,message:'Name cannot exceed 100 characters'});
  if(!emailRe.test(email))return res.status(400).json({success:false,message:'Enter a valid email address'});
  if(!validPassword(password))return res.status(400).json({success:false,message:'Password must be at least 8 characters and include upper, lower and number'});
  if(!Object.values(ROLES).includes(role))return res.status(400).json({success:false,message:'Invalid role'});
  const managerResult=role===ROLES.SALES_EXECUTIVE?await validateManager(body.manager):{manager:null};
  if(managerResult.error)return res.status(400).json({success:false,message:managerResult.error});
  if(await User.findOne({email}))return res.status(409).json({success:false,message:'Email already exists'});
  const user=await User.create({name:name.trim(),email,passwordHash:await bcrypt.hash(password,12),role,manager:managerResult.manager});
  await audit({req,userId:req.user._id,action:'CREATE',entityName:'User',recordId:user._id.toString(),newValue:{name:user.name,email:user.email,role:user.role,manager:user.manager}});
  res.status(201).json({success:true,data:safe(user)});
}

export async function updateUser(req,res){
  if(!mongoose.isObjectIdOrHexString(req.params.id))return res.status(400).json({success:false,message:'Invalid user ID'});
  const user=await User.findById(req.params.id);
  if(!user)return res.status(404).json({success:false,message:'User not found'});
  const oldValue={name:user.name,email:user.email,role:user.role,manager:user.manager,isActive:user.isActive};
  const body=req.body||{};
  if(body.name!==undefined){
    if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>100)return res.status(400).json({success:false,message:'Name is required and cannot exceed 100 characters'});
    user.name=body.name.trim();
  }
  if(body.email!==undefined){
    const email=cleanEmail(body.email);
    if(!emailRe.test(email))return res.status(400).json({success:false,message:'Enter a valid email address'});
    if(await User.exists({email,_id:{$ne:user._id}}))return res.status(409).json({success:false,message:'Email already exists'});
    user.email=email;
  }
  if(body.password!==undefined){
    if(!validPassword(body.password))return res.status(400).json({success:false,message:'Password must be at least 8 characters and include upper, lower and number'});
    user.passwordHash=await bcrypt.hash(body.password,12);
  }
  if(body.role!==undefined){
    if(!Object.values(ROLES).includes(body.role))return res.status(400).json({success:false,message:'Invalid role'});
    user.role=body.role;
    if(user.role!==ROLES.SALES_EXECUTIVE)user.manager=null;
  }
  if(body.manager!==undefined){
    const managerResult=user.role===ROLES.SALES_EXECUTIVE?await validateManager(body.manager,user._id):{manager:null};
    if(managerResult.error)return res.status(400).json({success:false,message:managerResult.error});
    user.manager=managerResult.manager;
  }
  await user.save();
  const newValue={name:user.name,email:user.email,role:user.role,manager:user.manager,isActive:user.isActive};
  if(oldValue.role!==user.role)await audit({req,userId:req.user._id,action:'ROLE_CHANGE',entityName:'User',recordId:user._id.toString(),oldValue:{role:oldValue.role},newValue:{role:user.role}});
  if(body.password!==undefined)await audit({req,userId:req.user._id,action:'PASSWORD_CHANGE',entityName:'User',recordId:user._id.toString(),details:'Password changed by administrator'});
  await audit({req,userId:req.user._id,action:'UPDATE',entityName:'User',recordId:user._id.toString(),oldValue,newValue});
  res.json({success:true,data:safe(user)});
}

export async function status(req,res){
  if(!mongoose.isObjectIdOrHexString(req.params.id))return res.status(400).json({success:false,message:'Invalid user ID'});
  if(typeof req.body?.isActive!=='boolean')return res.status(400).json({success:false,message:'isActive must be a boolean'});
  const user=await User.findById(req.params.id);
  if(!user)return res.status(404).json({success:false,message:'User not found'});
  const oldValue={isActive:user.isActive};
  user.isActive=req.body.isActive;
  await user.save();
  await audit({req,userId:req.user._id,action:user.isActive?'ACTIVATE':'DEACTIVATE',entityName:'User',recordId:user._id.toString(),oldValue,newValue:{isActive:user.isActive}});
  res.json({success:true,data:safe(user)});
}
