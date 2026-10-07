import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxLength:100},email:{type:String,required:true,lowercase:true,trim:true},passwordHash:{type:String,required:true,select:false},role:{type:String,enum:['ADMIN','MANAGER','SALES_EXECUTIVE'],required:true},manager:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},isActive:{type:Boolean,default:true},failedLoginCount:{type:Number,default:0},lockoutEnd:{type:Date,default:null}},{timestamps:true});
schema.index({email:1},{unique:true});
schema.index({manager:1});
export default mongoose.model('User',schema);
