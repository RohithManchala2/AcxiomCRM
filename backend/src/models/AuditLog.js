import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},action:{type:String,required:true},entityName:{type:String},recordId:{type:String},oldValue:{type:String},newValue:{type:String},result:{type:String,default:'SUCCESS'},details:{type:String},ipAddress:{type:String}},{timestamps:{createdAt:true,updatedAt:false}}); schema.index({createdAt:-1}); schema.index({user:1});
export default mongoose.model('AuditLog',schema);
