import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Opportunity from '../models/Opportunity.js';
import FollowUp from '../models/FollowUp.js';
import Activity from '../models/Activity.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import {audit} from '../services/auditService.js';
import {assignedScope} from '../utils/scope.js';
import {emailRe,phoneRe,todayStart,cleanEmail} from '../utils/validation.js';
import {parseDateRange,parsePagination,scopedFilter} from '../utils/query.js';

const models={customers:Customer,leads:Lead,opportunities:Opportunity,followups:FollowUp,activities:Activity};
const ownerField={customers:'owner',leads:'assignedTo',opportunities:'assignedTo',followups:'assignedTo',activities:'assignedTo'};
const populate={customers:'owner createdBy',leads:'assignedTo convertedCustomer convertedOpportunity',opportunities:'customer lead assignedTo',followups:'customer lead opportunity assignedTo',activities:'customer lead opportunity assignedTo'};
const auditNames={customers:'Customer',leads:'Lead',opportunities:'Opportunity',followups:'FollowUp',activities:'Activity'};
const allowedFields={
  customers:['customerName','email','phone','companyName','address','city','state','status','owner'],
  leads:['leadName','email','phone','companyName','source','status','priority','expectedValue','assignedTo'],
  opportunities:['opportunityName','customer','lead','amount','stage','probability','expectedCloseDate','status','assignedTo','notes'],
  followups:['customer','lead','opportunity','followUpDate','followUpType','subject','remarks','status','assignedTo'],
  activities:['customer','lead','opportunity','activityType','subject','description','activityDate','assignedTo','status']
};
const relatedModels={
  opportunities:{customer:[Customer,'owner'],lead:[Lead,'assignedTo']},
  followups:{customer:[Customer,'owner'],lead:[Lead,'assignedTo'],opportunity:[Opportunity,'assignedTo']},
  activities:{customer:[Customer,'owner'],lead:[Lead,'assignedTo'],opportunity:[Opportunity,'assignedTo']}
};

function buildFilter(key,q){
  const filter={};
  if(q.search){
    const expression=q.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const regex={$regex:expression,$options:'i'};
    const fields={
      customers:['customerName','email','phone','companyName'],
      leads:['leadName','companyName','status'],
      opportunities:['opportunityName','stage','status'],
      followups:['subject','status','followUpType'],
      activities:['subject','status','activityType']
    }[key];
    filter.$or=fields.map(field=>({[field]:regex}));
  }
  for(const field of ['status','stage','priority','assignedTo','owner','followUpType','activityType','customer','lead','opportunity']){
    if(q[field]){
      if(key==='followups'&&field==='status'&&q.status==='Overdue'){
        filter.status='Planned';
        filter.followUpDate={$lt:todayStart()};
        continue;
      }
      if(['assignedTo','owner','customer','lead','opportunity'].includes(field)){
        if(!mongoose.isObjectIdOrHexString(q[field]))filter.__invalidObjectId=field;
        else filter[field]=q[field];
      }else filter[field]=q[field];
    }
  }
  return filter;
}

function validate(key,body){
  const errors={};
  const validDate=value=>value&&Number.isFinite(new Date(value).getTime());
  if(key==='customers'){
    if(typeof body.customerName!=='string'||!body.customerName.trim())errors.customerName='Customer Name is required';
    if(!body.email||!emailRe.test(cleanEmail(body.email)))errors.email='Enter a valid email address';
    if(!body.phone||!phoneRe.test(String(body.phone).replace(/\s/g,'')))errors.phone='Enter a valid 10-digit Indian phone number';
  }
  if(key==='leads'){
    if(typeof body.leadName!=='string'||!body.leadName.trim())errors.leadName='Lead name is required';
    if(body.status==='Converted')errors.status='Use the lead conversion action to convert a lead';
    if(body.email&&!emailRe.test(cleanEmail(body.email)))errors.email='Enter a valid email address';
    if(body.phone&&!phoneRe.test(String(body.phone).replace(/\s/g,'')))errors.phone='Enter a valid 10-digit Indian phone number';
    if(body.expectedValue!=null&&(!Number.isFinite(Number(body.expectedValue))||Number(body.expectedValue)<0))errors.expectedValue='Expected value cannot be negative';
  }
  if(key==='opportunities'){
    if(typeof body.opportunityName!=='string'||!body.opportunityName.trim())errors.opportunityName='Opportunity name is required';
    if(body.amount==null||!Number.isFinite(Number(body.amount))||Number(body.amount)<=0)errors.amount='Opportunity Amount must be greater than 0';
    if(body.probability==null||!Number.isFinite(Number(body.probability))||Number(body.probability)<0||Number(body.probability)>100)errors.probability='Probability must be between 0 and 100';
    if(!validDate(body.expectedCloseDate))errors.expectedCloseDate='A valid Expected Close Date is required';
    else if(new Date(body.expectedCloseDate)<todayStart()&&!['Won','Lost'].includes(body.status)&&!['Won','Lost'].includes(body.stage))errors.expectedCloseDate='Expected Close Date cannot be in the past for an active opportunity';
    const expectedStatus=body.stage==='Won'?'Won':body.stage==='Lost'?'Lost':'Open';
    if(body.status&&body.status!==expectedStatus)errors.status='Opportunity status must match its stage';
  }
  if(key==='followups'){
    if(!validDate(body.followUpDate))errors.followUpDate='A valid follow-up date is required';
    else if(new Date(body.followUpDate)<todayStart()&&(!body.status||body.status==='Planned'))errors.followUpDate='Follow-up date cannot be earlier than today';
    if(body.followUpType&&!['Call','Meeting','Email','Task'].includes(body.followUpType))errors.followUpType='Invalid follow-up type';
    if(body.status&&!['Planned','Completed','Missed','Cancelled'].includes(body.status))errors.status='Invalid follow-up status';
  }
  if(key==='activities'){
    if(!body.activityType)errors.activityType='Activity type is required';
    if(typeof body.subject!=='string'||!body.subject.trim())errors.subject='Subject is required';
    if(!validDate(body.activityDate))errors.activityDate='A valid activity date is required';
  }
  return errors;
}

function assignedField(key){return key==='customers'?'owner':'assignedTo'}

function pickedFields(key,body){
  return Object.fromEntries(allowedFields[key].filter(field=>body[field]!==undefined).map(field=>[field,body[field]]));
}

async function validateReferences(key,body,user){
  const errors={};
  const field=assignedField(key);
  const assignment=body[field];
  if(assignment!=null&&assignment!==''){
    if(!mongoose.isObjectIdOrHexString(assignment)){
      errors[field]='Assigned user must be a valid user ID';
    }else{
      const assignee=await User.findById(assignment).select('_id role manager isActive');
      if(!assignee||!assignee.isActive)errors[field]='Assigned user does not exist or is inactive';
      else if(user.role==='SALES_EXECUTIVE'&&String(assignee._id)!==String(user._id))errors[field]='Sales Executives can only assign records to themselves';
      else if(user.role==='MANAGER'&&String(assignee._id)!==String(user._id)&&String(assignee.manager)!==String(user._id))errors[field]='Managers can only assign records to themselves or their direct reports';
    }
  }
  for(const [name,[Model,scopeField]] of Object.entries(relatedModels[key]||{})){
    const id=body[name];
    if(id==null||id==='')continue;
    if(!mongoose.isObjectIdOrHexString(id)){errors[name]=`${name} must be a valid ID`;continue}
    const query={_id:id,...await assignedScope(user,scopeField)};
    if(!await Model.exists(query))errors[name]=`${name} does not exist or is outside your assigned scope`;
  }
  return errors;
}

export async function list(req,res){
  const key=req.params.resource,M=models[key];
  if(!M)return res.status(404).json({success:false,message:'Resource not found'});
  const {page,limit,errors:pageErrors}=parsePagination(req.query,10);
  if(Object.keys(pageErrors).length)return res.status(400).json({success:false,message:'Invalid pagination',errors:pageErrors});
  const filter=buildFilter(key,req.query);
  if(filter.__invalidObjectId){const field=filter.__invalidObjectId;delete filter.__invalidObjectId;return res.status(400).json({success:false,message:`${field} must be a valid ID`})}
  const dateField=key==='followups'?'followUpDate':key==='activities'?'activityDate':'createdAt';
  const {filter:dateFilter,errors:dateErrors}=parseDateRange(req.query,dateField);
  if(Object.keys(dateErrors).length)return res.status(400).json({success:false,message:'Invalid date range',errors:dateErrors});
  const scope=await assignedScope(req.user,ownerField[key]);
  const criteria=scopedFilter(scope,scopedFilter(filter,dateFilter));
  const sortField=String(req.query.sort||'-createdAt');
  if(!/^-?[a-zA-Z][a-zA-Z0-9]*$/.test(sortField))return res.status(400).json({success:false,message:'Invalid sort field'});
  const total=await M.countDocuments(criteria);
  let query=M.find(criteria).sort(sortField).skip((page-1)*limit).limit(limit);
  if(populate[key])query=query.populate(populate[key]);
  const data=await query.lean();
  res.json({success:true,data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
}

export async function getOne(req,res){
  const key=req.params.resource,M=models[key];
  if(!M)return res.status(404).json({success:false,message:'Resource not found'});
  if(!mongoose.isObjectIdOrHexString(req.params.id))return res.status(400).json({success:false,message:'Invalid record ID'});
  const doc=await M.findOne(scopedFilter(await assignedScope(req.user,ownerField[key]),{_id:req.params.id})).populate(populate[key]||'');
  if(!doc)return res.status(404).json({success:false,message:'Record not found'});
  res.json({success:true,data:doc});
}

export async function create(req,res){
  const key=req.params.resource,M=models[key];
  if(!M)return res.status(404).json({success:false,message:'Resource not found'});
  const body=pickedFields(key,req.body||{});
  const field=assignedField(key);
  if(req.user.role==='SALES_EXECUTIVE')body[field]=req.user._id;
  else body[field]??=req.user._id;
  if(key==='customers'){body.email=cleanEmail(body.email||'');body.phone=String(body.phone||'').replace(/\s/g,'');body.createdBy=req.user._id;body.customerCode='CUS-'+Date.now().toString(36).toUpperCase()}
  if(key==='leads'){if(body.email)body.email=cleanEmail(body.email);if(body.phone)body.phone=String(body.phone).replace(/\s/g,'');body.leadCode='LED-'+Date.now().toString(36).toUpperCase()}
  if(key==='opportunities')body.status=body.stage==='Won'?'Won':body.stage==='Lost'?'Lost':'Open';
  const errors={...validate(key,body),...await validateReferences(key,body,req.user)};
  if(Object.keys(errors).length)return res.status(400).json({success:false,message:'Validation failed',errors});
  const doc=await M.create(body);
  await audit({req,userId:req.user._id,action:'CREATE',entityName:auditNames[key],recordId:doc._id.toString(),newValue:doc.toObject()});
  res.status(201).json({success:true,message:`${auditNames[key]} created successfully`,data:doc});
}

export async function update(req,res){
  const key=req.params.resource,M=models[key];
  if(!M)return res.status(404).json({success:false,message:'Resource not found'});
  if(!mongoose.isObjectIdOrHexString(req.params.id))return res.status(400).json({success:false,message:'Invalid record ID'});
  const current=await M.findOne(scopedFilter(await assignedScope(req.user,ownerField[key]),{_id:req.params.id}));
  if(!current)return res.status(404).json({success:false,message:'Record not found'});
  if(key==='leads'&&current.status==='Converted')return res.status(400).json({success:false,message:'Converted leads cannot be edited'});
  const body=pickedFields(key,req.body||{});
  if(key==='leads'&&body.status==='Converted')return res.status(400).json({success:false,message:'Use the lead conversion action to convert a lead'});
  if(req.user.role==='SALES_EXECUTIVE'){delete body.owner;delete body.assignedTo}
  if(key==='customers'&&body.email)body.email=cleanEmail(body.email);
  if(key==='customers'&&body.phone)body.phone=String(body.phone).replace(/\s/g,'');
  if(key==='leads'&&body.email)body.email=cleanEmail(body.email);
  if(key==='leads'&&body.phone)body.phone=String(body.phone).replace(/\s/g,'');
  const merged={...current.toObject(),...body};
  if(key==='opportunities'){
    if(body.stage)merged.status=body.stage==='Won'?'Won':body.stage==='Lost'?'Lost':'Open';
    else if(body.status)merged.stage=body.status==='Won'?'Won':body.status==='Lost'?'Lost':(['Won','Lost'].includes(current.stage)?'Qualification':current.stage);
  }
  const errors={...validate(key,merged),...await validateReferences(key,merged,req.user)};
  if(Object.keys(errors).length)return res.status(400).json({success:false,message:'Validation failed',errors});
  const oldValue=current.toObject();
  Object.assign(current,body);
  if(key==='opportunities'){
    if(body.stage)current.status=body.stage==='Won'?'Won':body.stage==='Lost'?'Lost':'Open';
    else if(body.status)current.stage=body.status==='Won'?'Won':body.status==='Lost'?'Lost':(['Won','Lost'].includes(current.stage)?'Qualification':current.stage);
  }
  const doc=await current.save();
  await audit({req,userId:req.user._id,action:'UPDATE',entityName:auditNames[key],recordId:doc._id.toString(),oldValue,newValue:doc.toObject()});
  res.json({success:true,message:`${auditNames[key]} updated successfully`,data:doc});
}

export async function remove(req,res){
  const key=req.params.resource,M=models[key];
  if(!M)return res.status(404).json({success:false,message:'Resource not found'});
  if(!mongoose.isObjectIdOrHexString(req.params.id))return res.status(400).json({success:false,message:'Invalid record ID'});
  const current=await M.findOne(scopedFilter(await assignedScope(req.user,ownerField[key]),{_id:req.params.id}));
  if(!current)return res.status(404).json({success:false,message:'Record not found'});
  if(key==='leads'&&current.status==='Converted')return res.status(409).json({success:false,message:'Converted leads cannot be deactivated'});
  const oldValue=current.toObject();
  if(key==='customers')current.status='Inactive';
  else if(key==='leads')current.status='Lost';
  else if(key==='opportunities'){current.status='Lost';current.stage='Lost'}
  else current.status='Cancelled';
  await current.save();
  await audit({req,userId:req.user._id,action:'DELETE',entityName:auditNames[key],recordId:current._id.toString(),oldValue,newValue:current.toObject(),details:'Soft delete/deactivation'});
  res.json({success:true,message:'Record deactivated successfully'});
}

export async function convertLead(req,res){
  if(!mongoose.isObjectIdOrHexString(req.params.id))return res.status(400).json({success:false,message:'Invalid lead ID'});
  const lead=await Lead.findOne({...await assignedScope(req.user,'assignedTo'),_id:req.params.id});
  if(!lead)return res.status(404).json({success:false,message:'Lead not found'});
  if(lead.status==='Converted')return res.status(409).json({success:false,message:'Lead has already been converted'});
  if(lead.status!=='Qualified')return res.status(400).json({success:false,message:'Only Qualified leads can be converted'});
  const errors={};
  if(!lead.leadName?.trim())errors.leadName='Lead name is required before conversion';
  if(!lead.email||!emailRe.test(cleanEmail(lead.email)))errors.email='A valid lead email is required before conversion';
  if(!lead.phone||!phoneRe.test(String(lead.phone).replace(/\s/g,'')))errors.phone='A valid 10-digit lead phone is required before conversion';
  if(!Number.isFinite(Number(lead.expectedValue))||Number(lead.expectedValue)<=0)errors.expectedValue='A positive expected value is required to create the opportunity';
  if(Object.keys(errors).length)return res.status(400).json({success:false,message:'Lead cannot be converted',errors});
  const assignedTo=await User.findById(lead.assignedTo).select('_id isActive');
  if(!assignedTo?.isActive)return res.status(400).json({success:false,message:'Lead assignee does not exist or is inactive'});
  const duplicate=await Customer.findOne({$or:[{email:cleanEmail(lead.email)},{phone:String(lead.phone).replace(/\s/g,'')}]});
  if(duplicate)return res.status(409).json({success:false,message:'A customer with this email or phone already exists'});
  const oldLead=lead.toObject();
  const reservedLead=await Lead.findOneAndUpdate(
    {_id:lead._id,status:'Qualified'},
    {$set:{status:'Converted'}},
    {new:true}
  );
  if(!reservedLead)return res.status(409).json({success:false,message:'Lead has already been converted'});
  let customer;
  let opportunity;
  try{
    customer=await Customer.create({
      customerCode:'CUS-'+Date.now().toString(36).toUpperCase(),
      customerName:lead.leadName,email:cleanEmail(lead.email),phone:String(lead.phone).replace(/\s/g,''),
      companyName:lead.companyName,status:'Prospect',owner:lead.assignedTo,createdBy:req.user._id
    });
    opportunity=await Opportunity.create({
      opportunityName:`${lead.leadName} Opportunity`,customer:customer._id,lead:lead._id,
      amount:Number(lead.expectedValue),stage:'Qualification',probability:20,
      expectedCloseDate:new Date(Date.now()+30*86400000),status:'Open',assignedTo:lead.assignedTo
    });
    lead.status='Converted';
    lead.convertedCustomer=customer._id;
    lead.convertedOpportunity=opportunity._id;
    await lead.save();
    await audit({req,userId:req.user._id,action:'CREATE',entityName:'Customer',recordId:customer._id.toString(),newValue:customer.toObject(),details:'Created during lead conversion'});
    await audit({req,userId:req.user._id,action:'CREATE',entityName:'Opportunity',recordId:opportunity._id.toString(),newValue:opportunity.toObject(),details:'Created during lead conversion'});
    await audit({req,userId:req.user._id,action:'CONVERSION',entityName:'Lead',recordId:lead._id.toString(),oldValue:oldLead,newValue:lead.toObject(),details:'Lead converted to customer and opportunity'});
  }catch(error){
    const rollback=[
      Lead.updateOne({_id:lead._id,status:'Converted'},{$set:{status:oldLead.status},$unset:{convertedCustomer:1,convertedOpportunity:1}})
    ];
    if(customer){
      rollback.push(Customer.deleteOne({_id:customer._id}));
      rollback.push(AuditLog.deleteMany({recordId:customer._id.toString(),details:'Created during lead conversion'}));
    }
    if(opportunity){
      rollback.push(Opportunity.deleteOne({_id:opportunity._id}));
      rollback.push(AuditLog.deleteMany({recordId:opportunity._id.toString(),details:'Created during lead conversion'}));
    }
    rollback.push(AuditLog.deleteMany({recordId:lead._id.toString(),details:'Lead converted to customer and opportunity'}));
    const cleanupResults=await Promise.allSettled(rollback);
    const cleanupErrors=cleanupResults.filter(result=>result.status==='rejected').map(result=>({name:result.reason?.name,code:result.reason?.code}));
    if(cleanupErrors.length)console.error('Lead conversion rollback incomplete',{leadId:lead._id.toString(),cleanupErrors});
    throw error;
  }
  res.json({success:true,message:'Lead converted successfully',data:{lead,customer,opportunity}});
}
