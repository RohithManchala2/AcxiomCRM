import {Router} from 'express';
import {auth} from '../middleware/auth.js';
import {summary,leadStatus,opportunityPipeline,monthlySales,upcoming} from '../controllers/dashboardController.js';
import {asyncHandler} from '../utils/asyncHandler.js';

const r=Router();
r.use(auth);
r.get('/summary',asyncHandler(summary));
r.get('/lead-status',asyncHandler(leadStatus));
r.get('/opportunity-pipeline',asyncHandler(opportunityPipeline));
r.get('/monthly-sales',asyncHandler(monthlySales));
r.get('/upcoming-followups',asyncHandler(upcoming));
export default r;