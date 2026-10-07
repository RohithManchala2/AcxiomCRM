import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Opportunity from '../models/Opportunity.js';
import FollowUp from '../models/FollowUp.js';
import Activity from '../models/Activity.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import {assignedScope} from '../utils/scope.js';
import {parseDateRange,parsePagination,scopedFilter} from '../utils/query.js';

const models={
  customers:[Customer,'owner'],
  leads:[Lead,'assignedTo'],
  opportunities:[Opportunity,'assignedTo'],
  followups:[FollowUp,'assignedTo'],
  activities:[Activity,'assignedTo']
};

function requestFilters(query,type){
  const filter={};
  const fields=type==='customers'?['status','owner']:type==='leads'?['status','priority','assignedTo']:type==='opportunities'?['status','stage','assignedTo','customer','lead']:type==='followups'?['status','followUpType','assignedTo','customer','lead','opportunity']:['status','activityType','assignedTo','customer','lead','opportunity'];
  for(const field of fields){
    if(!query[field])continue;
    if(['owner','assignedTo','customer','lead','opportunity'].includes(field)){
      if(!mongoose.isObjectIdOrHexString(query[field]))return {filter,errors:{[field]:`${field} must be a valid ID`}};
    }
    filter[field]=query[field];
  }
  return {filter,errors:{}};
}

function sortSpec(value,defaultValue='-createdAt'){
  const field=String(value||defaultValue);
  return /^-?[a-zA-Z][a-zA-Z0-9]*$/.test(field)?field:null;
}

export async function report(req,res){
  const {type}=req.params;
  const role=req.user.role;
  if(type==='audit'&&role!=='ADMIN')return res.status(403).json({success:false,message:'Audit reports are restricted to administrators'});
  if(type==='user-activity'&&role==='SALES_EXECUTIVE')return res.status(403).json({success:false,message:'User activity reports are not available to Sales Executives'});

  const {page,limit,errors:pageErrors}=parsePagination(req.query,20);
  if(Object.keys(pageErrors).length)return res.status(400).json({success:false,message:'Invalid pagination',errors:pageErrors});
  const sort=sortSpec(req.query.sort,type==='pipeline'?'-amount':type==='user-activity'?'-count':'-createdAt');
  if(!sort)return res.status(400).json({success:false,message:'Invalid sort field'});

  if(type==='audit'){
    const date=parseDateRange(req.query,'createdAt');
    const query={};
    for(const field of ['action','entityName','result'])if(req.query[field])query[field]=req.query[field];
    if(req.query.recordId)query.recordId=String(req.query.recordId).slice(0,100);
    if(req.query.user){
      if(!mongoose.isObjectIdOrHexString(req.query.user))return res.status(400).json({success:false,message:'user must be a valid ID'});
      query.user=req.query.user;
    }
    if(Object.keys(date.errors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:date.errors});
    Object.assign(query,date.filter);
    const [data,total]=await Promise.all([
      AuditLog.find(query).sort(sort).skip((page-1)*limit).limit(limit).populate('user','name email role'),
      AuditLog.countDocuments(query)
    ]);
    return res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }

  if(type==='user-activity'){
    const date=parseDateRange(req.query,'createdAt');
    if(Object.keys(date.errors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:date.errors});
    const userIds=role==='ADMIN'?null:[req.user._id,...await User.find({manager:req.user._id}).distinct('_id')];
    const match={...date.filter};
    if(userIds)match.user={$in:userIds};
    if(req.query.user){
      if(!mongoose.isObjectIdOrHexString(req.query.user))return res.status(400).json({success:false,message:'user must be a valid ID'});
      if(userIds&&!userIds.some(id=>String(id)===String(req.query.user)))return res.status(403).json({success:false,message:'User is outside your team scope'});
      match.user=userIds?{$in:[new mongoose.Types.ObjectId(req.query.user)]}:new mongoose.Types.ObjectId(req.query.user);
    }
    if(req.query.action)match.action=req.query.action;
    const aggregation=[
      {$match:match},
      {$group:{_id:'$user',count:{$sum:1}}},
      {$sort:{count:sort.startsWith('-')?-1:1}},
      {$facet:{data:[{$skip:(page-1)*limit},{$limit:limit}],total:[{$count:'count'}]}}
    ];
    const [result]=await AuditLog.aggregate(aggregation);
    const data=result?.data||[];
    const total=result?.total?.[0]?.count||0;
    return res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }

  if(type==='pipeline'||type==='conversion'){
    if(type==='conversion'){
      const scope=await assignedScope(req.user);
      const {filter,errors}=requestFilters(req.query,'leads');
      if(Object.keys(errors).length)return res.status(400).json({success:false,message:'Invalid report filter',errors});
      const date=parseDateRange(req.query,'createdAt');
      if(Object.keys(date.errors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:date.errors});
      const criteria=scopedFilter(scope,scopedFilter(filter,date.filter));
      const [total,converted]=await Promise.all([
        Lead.countDocuments(criteria),
        Lead.countDocuments(scopedFilter(criteria,{status:'Converted'}))
      ]);
      return res.json({success:true,data:{total,converted,notConverted:total-converted,conversionRate:total?Math.round(converted/total*100):0}});
    }
    const scope=await assignedScope(req.user);
    const {filter,errors}=requestFilters(req.query,'opportunities');
    if(Object.keys(errors).length)return res.status(400).json({success:false,message:'Invalid report filter',errors});
    const date=parseDateRange(req.query,'createdAt');
    if(Object.keys(date.errors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:date.errors});
    const criteria=scopedFilter(scope,scopedFilter(filter,date.filter));
    const pipeline=[
      {$match:criteria},
      {$group:{_id:{stage:'$stage',assignedTo:'$assignedTo'},amount:{$sum:'$amount'},weighted:{$sum:{$multiply:['$amount',{$divide:['$probability',100]}]}},count:{$sum:1}}},
      {$sort:{[sort.replace(/^-/, '')]:sort.startsWith('-')?-1:1}},
      {$facet:{data:[{$skip:(page-1)*limit},{$limit:limit}],total:[{$count:'count'}]}}
    ];
    const [result]=await Opportunity.aggregate(pipeline);
    const data=result?.data||[];
    const total=result?.total?.[0]?.count||0;
    return res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
  }

  const pair=models[type];
  if(!pair)return res.status(404).json({success:false,message:'Report not found'});
  const {filter,errors}=requestFilters(req.query,type);
  if(Object.keys(errors).length)return res.status(400).json({success:false,message:'Invalid report filter',errors});
  const date=parseDateRange(req.query,type==='followups'?'followUpDate':type==='activities'?'activityDate':'createdAt');
  if(Object.keys(date.errors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:date.errors});
  const scope=await assignedScope(req.user,pair[1]);
  const criteria=scopedFilter(scope,scopedFilter(filter,date.filter));
  const [data,total]=await Promise.all([
    pair[0].find(criteria).sort(sort).skip((page-1)*limit).limit(limit).populate('owner assignedTo customer lead opportunity','name email companyName customerName opportunityName'),
    pair[0].countDocuments(criteria)
  ]);
  res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
}
