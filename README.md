

## Run
Prerequisites: Node.js 20+, MongoDB 6+.

### Backend
```bash
cd backend
npm install
```
Create a private local environment file (PowerShell):
```powershell
Copy-Item .env.example .env
```
Before starting, set `MONGO_URI` and replace `JWT_SECRET` in `backend/.env`. Generate a secret locally with:
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```
Keep the generated value private and do not commit `backend/.env`. Backend: http://localhost:5000
Start the backend from the `backend` directory:
```bash
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

For Manager team-scoped records and reports, assign Sales Executive accounts to a Manager in the admin User Management page.
