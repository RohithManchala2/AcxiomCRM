import {Router} from 'express';
import {auth,requireRoles} from '../middleware/auth.js';
import {listUsers,createUser,updateUser,status} from '../controllers/userController.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
r.use(auth,requireRoles('ADMIN'));
r.get('/',asyncHandler(listUsers));
r.post('/',asyncHandler(createUser));
r.put('/:id',asyncHandler(updateUser));
r.patch('/:id/status',asyncHandler(status));
export default r;