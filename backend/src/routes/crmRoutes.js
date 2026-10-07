import {Router} from 'express';
import {auth} from '../middleware/auth.js';
import {list,getOne,create,update,remove,convertLead} from '../controllers/crmController.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
const resources=['customers','leads','opportunities','followups','activities'];
const resourceParam=resource=>(req,res,next)=>{req.params.resource=resource;next()};
resources.forEach(resource=>{
  const bind=resourceParam(resource);
  r.get('/'+resource,auth,bind,asyncHandler(list));
  r.post('/'+resource,auth,bind,asyncHandler(create));
  r.get('/'+resource+'/:id',auth,bind,asyncHandler(getOne));
  r.put('/'+resource+'/:id',auth,bind,asyncHandler(update));
  r.delete('/'+resource+'/:id',auth,bind,asyncHandler(remove));
});
r.post('/leads/:id/convert',auth,asyncHandler(convertLead));
export default r;