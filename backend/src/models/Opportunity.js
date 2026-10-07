import mongoose from 'mongoose';
const schema=new mongoose.Schema({opportunityName:{type:String,required:true,trim:true,maxLength:150},customer:{type:mongoose.Schema.Types.ObjectId,ref:'Customer'},lead:{type:mongoose.Schema.Types.ObjectId,ref:'Lead'},amount:{type:Number,required:true,min:0},stage:{type:String,enum:['Qualification','Proposal','Negotiation','Won','Lost'],default:'Qualification'},probability:{type:Number,min:0,max:100,required:true},expectedCloseDate:{type:Date,required:true},status:{type:String,enum:['Open','Won','Lost'],default:'Open'},assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},notes:{type:String,maxLength:1000}},{timestamps:true});
schema.index({stage:1});schema.index({assignedTo:1});
schema.virtual('weightedAmount').get(function(){return this.amount*this.probability/100}); schema.set('toJSON',{virtuals:true});
export default mongoose.model('Opportunity',schema);
