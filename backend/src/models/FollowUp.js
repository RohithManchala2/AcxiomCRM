import mongoose from 'mongoose';
const schema=new mongoose.Schema({customer:{type:mongoose.Schema.Types.ObjectId,ref:'Customer'},lead:{type:mongoose.Schema.Types.ObjectId,ref:'Lead'},opportunity:{type:mongoose.Schema.Types.ObjectId,ref:'Opportunity'},followUpDate:{type:Date,required:true},followUpType:{type:String,enum:['Call','Meeting','Email','Task'],required:true},subject:{type:String,required:true,maxLength:160},remarks:{type:String,maxLength:1000},status:{type:String,enum:['Planned','Completed','Missed','Cancelled'],default:'Planned'},assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
schema.index({followUpDate:1});schema.index({assignedTo:1});
export default mongoose.model('FollowUp',schema);
