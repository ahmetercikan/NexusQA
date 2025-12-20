# Nexus QA - Quick Start Guide

## Current Project Status

✅ **Completed:**
- Frontend React structure with all 5 pages (Dashboard, TestSuites, Agents, Reports, Settings)
- React Router setup with 5 main routes
- WebSocket real-time communication hooks
- Global state management (Context API)
- API service layer (axios client)
- All reusable components (Sidebar, AgentCard, LiveConsole, Modal, etc.)
- Backend Express.js API structure with all routes
- Prisma ORM with complete database schema (7 models)
- Socket.io WebSocket server setup
- Python CrewAI multi-agent system with 4 specialized agents
- Docker Compose configuration for PostgreSQL
- Frontend `npm install` - 35 new packages added (272 total)

❌ **Not Yet Started:**
- PostgreSQL database (requires Docker Desktop to be running)
- Backend database schema creation (requires `npm run db:push`)
- Backend npm install
- Running backend server
- Running Python agents service
- WebSocket connection testing

---

## STEP 1: Start Docker Desktop & PostgreSQL

1. **Start Docker Desktop** (if not already running)
   - Windows: Open Docker Desktop application
   - Wait for it to fully initialize

2. **Start PostgreSQL Container:**
   ```bash
   cd c:\Users\ahmet.ercikan\nexus-qa2
   docker-compose up -d
   ```

3. **Verify it's running:**
   ```bash
   docker ps | findstr postgres
   ```
   You should see output showing `nexus-qa-db` container running

4. **Access Database UI (optional):**
   - URL: http://localhost:8080
   - Server: `postgres`
   - User: `postgres`
   - Password: `postgres`
   - Database: `nexus_qa`

---

## STEP 2: Setup Backend

```bash
cd c:\Users\ahmet.ercikan\nexus-qa2\backend

# Install dependencies
npm install

# Verify database is connected and create schema
npm run db:push

# (Optional) Load sample data
npm run db:seed

# Start backend server
npm run dev
```

**Expected output:**
```
[Server] Connected to PostgreSQL
[Server] Listening on http://localhost:3001
[Server] WebSocket initialized
```

**Test backend health:**
```bash
curl http://localhost:3001/api/health
```

---

## STEP 3: Setup Python Agents (in separate terminal)

```bash
cd c:\Users\ahmet.ercikan\nexus-qa2\agents

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your OpenAI API key
# (Edit agents/.env and add your OPENAI_API_KEY)

# Start CrewAI service
python main.py --server
```

**Expected output:**
```
[INFO] CrewAI FastAPI server starting on http://localhost:8000
[INFO] Connected to backend: http://localhost:3001
```

**Test CrewAI health:**
```bash
curl http://localhost:8000/api/health
```

---

## STEP 4: Start Frontend (in separate terminal)

```bash
cd c:\Users\ahmet.ercikan\nexus-qa2

# Start Vite dev server
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## STEP 5: Verify Everything is Connected

Visit http://localhost:5173 in your browser

**Check these indicators:**

1. **Top Right - WebSocket Status**
   - Green dot with "Bağlı" = Connected to backend ✅
   - Red dot with "Bağlantı Yok" = Not connected ❌

2. **Dashboard Page**
   - Should load statistics
   - Should display 4 AI agents (Alpha, Beta, Omega, Delta)
   - Should show real-time logs

3. **Agents Page**
   - Should list all 4 agents with their status
   - Should allow starting/stopping agents
   - Should show agent efficiency and costs

4. **Settings > Connections Tab**
   - Click "Yenile" (Refresh)
   - Should show:
     - ✅ Backend API - Bağlı
     - ✅ PostgreSQL - Bağlı
     - ✅ CrewAI Service - Bağlı

---

## Terminal Setup (Recommended)

Use 4 separate terminal windows:

**Terminal 1: Frontend**
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2
npm run dev
# Watches for changes, available at http://localhost:5173
```

**Terminal 2: Backend**
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2\backend
npm run dev
# Watches for changes, API at http://localhost:3001
```

**Terminal 3: Python Agents**
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2\agents
python main.py --server
# CrewAI FastAPI service at http://localhost:8000
```

**Terminal 4: Docker (if needed)**
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2
docker-compose up
# Shows PostgreSQL logs in real-time
```

---

## Testing the System

### Test 1: WebSocket Connection
1. Open frontend: http://localhost:5173
2. Check top-right corner for green "Bağlı" indicator
3. Open browser DevTools (F12)
4. Check Console for WebSocket messages

### Test 2: Agent Operations
1. Go to **Agents page**
2. Click "Başlat" button on any agent
3. Watch the agent status change to "WORKING" in real-time
4. Check **Dashboard > Ajan Logları** for live updates
5. Click "Durdur" to stop the agent

### Test 3: Test Suite Execution
1. Go to **Test Suites page**
2. Click "Oluştur Yeni" to create a test suite
3. Fill in:
   - **Ad (Name):** My Test Suite
   - **Tip (Type):** UI
   - Click "Oluştur"
4. Click "Çalıştır" on the created suite
5. Watch the test run in real-time on **Reports page**

### Test 4: Database
1. Open Adminer: http://localhost:8080
2. Login with postgres/postgres
3. Browse tables:
   - `Agent` - Should have 4 agents
   - `TestSuite` - Should be populated with your tests
   - `Log` - Should show real-time logs

---

## Common Issues & Fixes

### "Cannot connect to PostgreSQL"
- [ ] Ensure Docker Desktop is running
- [ ] Run `docker ps` to verify postgres container
- [ ] Check DATABASE_URL in `backend/.env`
- [ ] Run `docker-compose logs postgres` to see errors

### "Backend not connecting to frontend"
- [ ] Check CORS setting: `FRONTEND_URL=http://localhost:5173` in `backend/.env`
- [ ] Verify backend is running on port 3001
- [ ] Check browser DevTools for CORS errors

### "WebSocket connection failed"
- [ ] Verify backend server is running (`npm run dev`)
- [ ] Check if port 3001 is in use: `netstat -ano | findstr 3001`
- [ ] Restart backend server

### "Python agents not working"
- [ ] Verify virtual environment is activated: `(venv)` in terminal
- [ ] Check OPENAI_API_KEY is set in `agents/.env`
- [ ] Run `python main.py --test-demo` to test agent system
- [ ] Check `agents/logs/` directory for error logs

### "npm install fails"
- [ ] Update npm: `npm install -g npm@latest`
- [ ] Delete `node_modules` folder
- [ ] Clear npm cache: `npm cache clean --force`
- [ ] Run `npm install` again

---

## Development Tips

### Frontend Hot Reload
- Edit any file in `src/`
- Changes automatically appear in browser (HMR)
- No manual refresh needed

### Backend Hot Reload
- Edit any file in `backend/src/`
- Server automatically restarts (--watch flag)
- Re-run API tests

### Database Schema Changes
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run db:push` or `npm run db:migrate`
3. Backend server automatically reloads

### Viewing Database
```bash
cd backend
npm run db:studio
# Opens Prisma Studio UI at http://localhost:5555
```

---

## What You Can Do Now

✅ **Monitor agents in real-time**
✅ **Create and manage test suites**
✅ **Execute tests with AI agents**
✅ **View real-time logs and analytics**
✅ **Manage projects and configurations**
✅ **Track test execution across different types (UI, API, Security)**

---

## Next Steps After Setup

1. **Configure API Keys**
   - Add your OpenAI API key to `agents/.env`

2. **Create Your First Project**
   - Go to Settings > Projects
   - Create a new project with your app's URL

3. **Design Test Suites**
   - Go to Test Suites
   - Create test suite for your application
   - Let AI agents assist in test design

4. **Monitor Execution**
   - Go to Dashboard
   - Click "Otonom Testi Başlat" to start automated testing
   - Watch agents work in real-time

5. **Analyze Reports**
   - Go to Reports
   - View test trends and analytics
   - Export reports for documentation

---

## Support & Documentation

- **Main README:** [README.md](./README.md)
- **Backend README:** [backend/README.md](./backend/README.md)
- **Agents README:** [agents/README.md](./agents/README.md)

---

**Last Updated:** December 16, 2025
**Version:** 1.0.0 - Full Stack Integration Complete
