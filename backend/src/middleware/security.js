import helmet from 'helmet'; import cors from 'cors'; import rateLimit from 'express-rate-limit';
export const security=[helmet(),cors({origin:process.env.CLIENT_URL,credentials:true})];
export const authLimiter=rateLimit({windowMs:15*60*1000,max:30,standardHeaders:true,legacyHeaders:false,message:{success:false,message:'Too many authentication attempts. Try again later.'}});
