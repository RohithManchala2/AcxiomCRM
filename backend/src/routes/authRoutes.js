import {Router} from 'express';
import {login,logout,me,register} from '../controllers/authController.js';
import {auth} from '../middleware/auth.js';
import {authLimiter} from '../middleware/security.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
const requireStringFields=(...fields)=>(req,res,next)=>{
  if(fields.some(field=>typeof req.body[field]!=='string'))return res.status(400).json({success:false,message:`${fields.join(', ')} must be strings`});
  next();
};
r.post('/register',authLimiter,requireStringFields('name','email','password'),asyncHandler(register));
r.post('/login',authLimiter,requireStringFields('email','password'),asyncHandler(login));
r.post('/logout',auth,asyncHandler(logout));
r.get('/me',auth,asyncHandler(me));
export default r;