import {Router} from 'express';
import {auth,requireRoles} from '../middleware/auth.js';
import {listUsers,assignableUsers,createUser,updateUser,status,unlock} from '../controllers/userController.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
r.get('/assignable',auth,asyncHandler(assignableUsers));
r.use(auth,requireRoles('ADMIN'));
r.get('/',asyncHandler(listUsers));
r.post('/',asyncHandler(createUser));
r.put('/:id',asyncHandler(updateUser));
r.patch('/:id/status',asyncHandler(status));
r.patch('/:id/unlock',asyncHandler(unlock));
export default r;