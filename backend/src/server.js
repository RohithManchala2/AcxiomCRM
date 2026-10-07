import 'dotenv/config';import app from './app.js';import {connectDB} from './config/db.js';
if(!process.env.MONGO_URI)throw new Error('MONGO_URI must be set in the backend environment.');
if(Buffer.byteLength(process.env.JWT_SECRET||'','utf8')<32)throw new Error('JWT_SECRET must be at least 32 bytes. Set a unique random secret in the backend environment.');
const port=process.env.PORT||5000;connectDB().then(()=>app.listen(port,'0.0.0.0',()=>console.log(`AcxiomCRM backend listening on ${port}`))).catch(e=>{console.error(e);process.exit(1)});
