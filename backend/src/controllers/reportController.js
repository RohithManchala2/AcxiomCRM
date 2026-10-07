import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Opportunity from '../models/Opportunity.js';
import FollowUp from '../models/FollowUp.js';
import Activity from '../models/Activity.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import {assignedScope} from '../utils/scope.js';

const models={
  customers:[Customer,'owner'],
  leads:[Lead,'assignedTo'],
  opportunities:[Opportunity,'assignedTo'],
  followups:[FollowUp,'assignedTo'],
  activities:[Activity,'assignedTo']
};

export async function report(req,res){
  const {type}=req.params;
  const role=req.user.role;
  if(type==='audit'&&role!=='ADMIN')return res.status(403).json({success:false,message:'Audit reports are restricted to administrators'});
  if(type==='user-activity'&&role==='SALES_EXECUTIVE')return res.status(403).json({success:false,message:'User activity reports are not available to Sales Executives'});
  if(type==='pipeline'){
    const scope=await assignedScope(req.user);
    const data=await Opportunity.aggregate([{$match:scope},{$group:{_id:'$stage',amount:{$sum:'$amount'},weighted:{$sum:{$multiply:['$amount',{$divide:['$probability',100]}]}}}}]);
    return res.json({success:true,data});
  }
  if(type==='conversion'){
    const scope=await assignedScope(req.user);
    const [total,converted]=await Promise.all([Lead.countDocuments(scope),Lead.countDocuments({...scope,status:'Converted'})]);
    return res.json({success:true,data:{total,converted,notConverted:total-converted,conversionRate:total?Math.round(converted/total*100):0}});
  }
  if(type==='audit'){
    const data=await AuditLog.find().sort('-createdAt').limit(500).populate('user','name email role');
    return res.json({success:true,data});
  }
  if(type==='user-activity'){
    const users=role==='ADMIN'?null:[req.user._id,...await User.find({manager:req.user._id}).distinct('_id')];
    const pipeline=[];
    if(users)pipeline.push({$match:{user:{$in:users}}});
    pipeline.push({$group:{_id:'$user',count:{$sum:1}}},{$sort:{count:-1}});
    const data=await AuditLog.aggregate(pipeline);
    return res.json({success:true,data});
  }
  const pair=models[type];
  if(!pair)return res.status(404).json({success:false,message:'Report not found'});
  const scope=await assignedScope(req.user,pair[1]);
  const data=await pair[0].find(scope).sort('-createdAt').limit(1000).populate('owner assignedTo customer lead opportunity','name email companyName customerName opportunityName');
  res.json({success:true,data});
}
