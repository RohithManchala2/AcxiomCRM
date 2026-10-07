import mongoose from 'mongoose';
const schema=new mongoose.Schema({activityType:{type:String,enum:['Call','Meeting','Email','Task'],required:true},subject:{type:String,required:true,maxLength:160},description:{type:String,maxLength:1000},activityDate:{type:Date,required:true},customer:{type:mongoose.Schema.Types.ObjectId,ref:'Customer'},lead:{type:mongoose.Schema.Types.ObjectId,ref:'Lead'},opportunity:{type:mongoose.Schema.Types.ObjectId,ref:'Opportunity'},assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},status:{type:String,enum:['Planned','Completed','Cancelled'],default:'Planned'}},{timestamps:true});
schema.index({activityDate:1});schema.index({assignedTo:1});
export default mongoose.model('Activity',schema);
