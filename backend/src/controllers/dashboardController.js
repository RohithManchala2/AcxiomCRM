import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Opportunity from '../models/Opportunity.js';
import FollowUp from '../models/FollowUp.js';
import {assignedScope} from '../utils/scope.js';
import {parseDateRange,scopedFilter} from '../utils/query.js';

function dateFilter(req,res,field='createdAt'){
  const {filter,errors}=parseDateRange(req.query,field);
  if(Object.keys(errors).length){
    res.status(400).json({success:false,message:'Invalid dashboard date range',errors});
    return null;
  }
  return filter;
}

export async function summary(req,res){
  const dates=dateFilter(req,res);
  if(!dates)return;
  const [customerScope,recordScope]=await Promise.all([assignedScope(req.user,'owner'),assignedScope(req.user)]);
  const customerQuery=scopedFilter(customerScope,dates);
  const recordQuery=scopedFilter(recordScope,dates);
  const [customers,leads,openLeads,opps,openOpps,won,lost,pipe]=await Promise.all([
    Customer.countDocuments(customerQuery),
    Lead.countDocuments(recordQuery),
    Lead.countDocuments(scopedFilter(recordQuery,{status:{$nin:['Lost','Converted']}})),
    Opportunity.countDocuments(recordQuery),
    Opportunity.countDocuments(scopedFilter(recordQuery,{status:'Open'})),
    Opportunity.countDocuments(scopedFilter(recordQuery,{status:'Won'})),
    Opportunity.countDocuments(scopedFilter(recordQuery,{status:'Lost'})),
    Opportunity.aggregate([{$match:scopedFilter(recordQuery,{status:'Open'})},{$group:{_id:null,total:{$sum:'$amount'}}}])
  ]);
  res.json({success:true,data:{totalCustomers:customers,totalLeads:leads,openLeads,totalOpportunities:opps,openOpportunities:openOpps,wonOpportunities:won,lostOpportunities:lost,totalPipelineValue:pipe[0]?.total||0}});
}

export async function leadStatus(req,res){
  const dates=dateFilter(req,res);
  if(!dates)return;
  const scope=await assignedScope(req.user);
  const data=await Lead.aggregate([{$match:scopedFilter(scope,dates)},{$group:{_id:'$status',count:{$sum:1}}},{$sort:{_id:1}}]);
  res.json({success:true,data});
}

export async function opportunityPipeline(req,res){
  const dates=dateFilter(req,res);
  if(!dates)return;
  const scope=await assignedScope(req.user);
  const data=await Opportunity.aggregate([{$match:scopedFilter(scope,dates)},{$group:{_id:'$stage',amount:{$sum:'$amount'},count:{$sum:1},weighted:{$sum:{$multiply:['$amount',{$divide:['$probability',100]}]}}}},{$sort:{_id:1}}]);
  res.json({success:true,data});
}

export async function monthlySales(req,res){
  const dates=dateFilter(req,res,'updatedAt');
  if(!dates)return;
  const scope=await assignedScope(req.user);
  const data=await Opportunity.aggregate([{$match:scopedFilter(scope,{...dates,status:'Won'})},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$updatedAt'}},amount:{$sum:'$amount'},count:{$sum:1}}},{$sort:{_id:1}}]);
  res.json({success:true,data});
}

export async function upcoming(req,res){
  const dates=dateFilter(req,res,'followUpDate');
  if(!dates)return;
  const scope=await assignedScope(req.user);
  const range=dates.followUpDate||{};
  const now=new Date();
  const followUpDate={$gte:range.$gte&&range.$gte>now?range.$gte:now};
  if(range.$lte)followUpDate.$lte=range.$lte;
  const data=await FollowUp.find(scopedFilter(scope,{followUpDate,status:'Planned'})).sort('followUpDate').limit(5).populate('customer assignedTo');
  res.json({success:true,data});
}
