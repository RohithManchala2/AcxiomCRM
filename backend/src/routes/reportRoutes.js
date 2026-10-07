import {Router} from 'express';
import {auth} from '../middleware/auth.js';
import {report} from '../controllers/reportController.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
r.get('/:type',auth,asyncHandler(report));
export default r;