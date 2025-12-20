# Nexus QA - Setup Checklist

## Pre-Flight Checks

- [ ] Windows/PC with at least 8GB RAM
- [ ] Node.js 18+ installed (`node -v`)
- [ ] npm 9+ installed (`npm -v`)
- [ ] Python 3.10+ installed (`python --version`)
- [ ] Git installed (for version control)
- [ ] OpenAI API key ready (for CrewAI agents)
- [ ] Docker Desktop installed and available

---

## Project Files Verification

### Frontend Files ✅ COMPLETE
- [x] `src/App.jsx` - Main router component
- [x] `src/main.jsx` - Entry point
- [x] `src/services/api.js` - API client
- [x] `src/hooks/useWebSocket.js` - WebSocket hooks
- [x] `src/context/AppContext.jsx` - State management
- [x] `src/components/` - 5 reusable components (Sidebar, AgentCard, LiveConsole, StatCard, Modal)
- [x] `src/pages/` - 5 page components (Dashboard, TestSuites, Agents, Reports, Settings)
- [x] `package.json` - Frontend dependencies
- [x] `.env` - Frontend environment variables

### Backend Files ✅ COMPLETE
- [x] `backend/src/app.js` - Express application
- [x] `backend/src/server.js` - Server entry point
- [x] `backend/src/config/` - Database and environment config
- [x] `backend/src/middleware/` - Error handling
- [x] `backend/src/controllers/` - 3 main controllers (project, agent, test)
- [x] `backend/src/routes/` - 4 route files
- [x] `backend/src/services/crewAIBridge.js` - CrewAI integration
- [x] `backend/src/websocket/socketHandler.js` - Socket.io setup
- [x] `backend/prisma/schema.prisma` - Database schema
- [x] `backend/prisma/seed.js` - Sample data
- [x] `backend/package.json` - Backend dependencies
- [x] `backend/.env` - Backend environment variables

### Python Agents Files ✅ COMPLETE
- [x] `agents/agents/` - 4 agent definitions (Orchestrator, TestArchitect, DeveloperBot, SecurityAnalyst)
- [x] `agents/tasks/` - Task definitions for testing
- [x] `agents/tools/` - 3 custom tools (Playwright, API, CodeAnalyzer)
- [x] `agents/crews/` - 2 crew orchestrations
- [x] `agents/api/endpoints.py` - FastAPI service
- [x] `agents/config.py` - Configuration and LLM setup
- [x] `agents/main.py` - CLI entry point
- [x] `agents/requirements.txt` - Python dependencies
- [x] `agents/.env` - Agent environment variables

### Documentation Files ✅ COMPLETE
- [x] `README.md` - Main documentation (430+ lines)
- [x] `QUICKSTART.md` - Quick start guide (200+ lines)
- [x] `PROJECT_STATUS.md` - Project status report
- [x] `SETUP_CHECKLIST.md` - This file
- [x] `docker-compose.yml` - Docker configuration

---

## Installation Checklist

### Step 1: Frontend Dependencies ✅ DONE
- [x] `npm install` in project root
- [x] Result: 35 new packages added (272 total)
- [x] Status: **No vulnerabilities, ready to run**

### Step 2: Backend Dependencies ✅ DONE
- [x] `npm install` in backend directory
- [x] Result: 145 packages installed
- [x] Status: **No vulnerabilities, ready to run**

### Step 3: Database Setup ⏳ PENDING
- [ ] Docker Desktop is running
- [ ] `docker-compose up -d` executed
- [ ] PostgreSQL container started (`docker ps | grep postgres`)
- [ ] Run `npm run db:push` in backend directory
- [ ] (Optional) Run `npm run db:seed` for sample data

### Step 4: Python Agents Setup ⏳ PENDING
- [ ] Python 3.10+ verified
- [ ] Virtual environment created (optional): `python -m venv venv`
- [ ] Virtual environment activated: `venv\Scripts\activate` (Windows)
- [ ] Requirements installed: `pip install -r requirements.txt`
- [ ] OpenAI API key added to `agents/.env`

---

## Runtime Checklist (4 Terminal Windows)

### Terminal 1: Frontend
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2
npm run dev
```
- [ ] Command entered
- [ ] Output shows: "Local: http://localhost:5173/"
- [ ] No errors
- [ ] **Status:** Ready to access

### Terminal 2: Backend
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2\backend
npm run dev
```
- [ ] Command entered
- [ ] Output shows: "Connected to PostgreSQL"
- [ ] Output shows: "Listening on http://localhost:3001"
- [ ] Output shows: "WebSocket initialized"
- [ ] No errors
- [ ] **Status:** Ready to serve API

### Terminal 3: Python Agents
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2\agents
python main.py --server
```
- [ ] Command entered
- [ ] Output shows: "CrewAI FastAPI server starting"
- [ ] Output shows: "Listening on http://localhost:8000"
- [ ] No errors about OpenAI API key
- [ ] **Status:** Ready to process tasks

### Terminal 4: Docker (Optional - for logs)
```bash
cd c:\Users\ahmet.ercikan\nexus-qa2
docker-compose up
```
- [ ] Command entered (non-detached mode shows logs)
- [ ] Shows PostgreSQL starting
- [ ] Shows "database system is ready to accept connections"
- [ ] **Status:** Database running

---

## Browser Access Checklist

### Frontend (http://localhost:5173)
- [ ] Page loads successfully
- [ ] Top-right shows WebSocket status
  - [ ] Green dot = "Bağlı" (Connected) ✅
  - [ ] Red dot = "Bağlantı Yok" (Not connected) ❌
- [ ] Navigation sidebar visible
- [ ] All 5 pages accessible:
  - [ ] Dashboard
  - [ ] Test Suites
  - [ ] Agents
  - [ ] Reports
  - [ ] Settings

### Dashboard Page
- [ ] 4 statistics cards visible
- [ ] Agent cards showing
- [ ] Monthly chart visible
- [ ] Live console visible
- [ ] "Otonom Testi Başlat" button present

### Agents Page
- [ ] 4 agents visible (Alpha, Beta, Omega, Delta)
- [ ] Agent statistics showing
- [ ] Start/Stop buttons functional
- [ ] Agent logs updating in real-time

### Settings > Connections Tab
- [ ] Click "Yenile" button
- [ ] Verify status checks:
  - [ ] Backend API - Bağlı ✅
  - [ ] PostgreSQL - Bağlı ✅
  - [ ] CrewAI Service - Bağlı ✅

### Database Access (Optional)
- [ ] Adminer at http://localhost:8080
- [ ] Login with postgres/postgres
- [ ] Tables visible:
  - [ ] Agent (4 rows)
  - [ ] TestSuite
  - [ ] TestCase
  - [ ] TestRun
  - [ ] TestResult
  - [ ] Log

---

## API Health Checks

### Backend Health
```bash
curl http://localhost:3001/api/health
```
- [ ] Returns 200 OK
- [ ] Response includes version and timestamp
- [ ] **Status:** API healthy

### CrewAI Health
```bash
curl http://localhost:8000/api/health
```
- [ ] Returns 200 OK
- [ ] Response shows agent count
- [ ] **Status:** Agent system healthy

### Get Agents
```bash
curl http://localhost:3001/api/agents
```
- [ ] Returns 200 OK
- [ ] Response includes array of 4 agents
- [ ] Agents have: id, name, role, status, type

### Get Projects
```bash
curl http://localhost:3001/api/projects
```
- [ ] Returns 200 OK (or empty array if no projects)

---

## Functionality Testing Checklist

### Test 1: Create Test Suite
- [ ] Go to Test Suites page
- [ ] Click "Yeni Proje" button
- [ ] Fill form:
  - [ ] Name: "My First Test"
  - [ ] Type: "UI"
  - [ ] Description: "Test description"
- [ ] Click "Oluştur"
- [ ] Test suite appears in list

### Test 2: Start Agent
- [ ] Go to Agents page
- [ ] Click "Başlat" button on any agent
- [ ] Agent status changes to "WORKING"
- [ ] Check Dashboard logs - see real-time logs
- [ ] Status changes back to "IDLE" automatically

### Test 3: WebSocket Real-Time
- [ ] Go to Dashboard
- [ ] Open browser DevTools (F12)
- [ ] Go to Network > WS (WebSocket)
- [ ] Should see connection to localhost:3001
- [ ] Start an agent and see log messages arrive in real-time

### Test 4: Database Operations
- [ ] Create a project in Settings
- [ ] Open Adminer (http://localhost:8080)
- [ ] Query Project table
- [ ] Verify new project appears

---

## Troubleshooting Checklist

### Issue: "Cannot connect to PostgreSQL"
- [ ] Check Docker Desktop is running
- [ ] Run `docker ps | findstr postgres`
- [ ] Verify container is listed
- [ ] Check backend/.env DATABASE_URL
- [ ] Run `docker logs nexus-qa-db`

### Issue: "WebSocket connection failed"
- [ ] Backend is running on port 3001?
- [ ] Frontend .env has correct API URL?
- [ ] Browser DevTools shows connection errors?
- [ ] Try restarting backend

### Issue: "Python agents won't start"
- [ ] Python 3.10+ is installed?
- [ ] Virtual environment activated?
- [ ] OpenAI API key set in agents/.env?
- [ ] All requirements installed? `pip list | findstr crewai`

### Issue: "npm install fails"
- [ ] Update npm: `npm install -g npm@latest`
- [ ] Clear cache: `npm cache clean --force`
- [ ] Delete node_modules: `rm -r node_modules`
- [ ] Try again: `npm install`

---

## Final Verification (Green Light Check)

Before considering the setup complete:

- [ ] All 4 terminal windows show no errors
- [ ] Frontend loads at http://localhost:5173
- [ ] WebSocket shows "Bağlı" (green)
- [ ] Can see all 4 agents
- [ ] Settings > Connections shows all 3 services as "Bağlı"
- [ ] Can create a test suite
- [ ] Can start an agent and see logs in real-time
- [ ] Database is accessible via Adminer

**If all checked:** ✅ **System is fully operational!**

---

## Next Activities

After setup is complete, you can:

1. **Create Your First Project**
   - Go to Settings > Projects
   - Add your application's URL

2. **Design Test Suites**
   - Create test suites for your application
   - Let AI agents assist in design

3. **Execute Tests**
   - Go to Dashboard
   - Click "Otonom Testi Başlat"
   - Watch agents work in real-time

4. **Monitor & Analyze**
   - View Reports for trends
   - Check agent efficiency metrics
   - Export test results

5. **Configure Settings**
   - Adjust auto-refresh interval
   - Enable/disable notifications
   - Set API URLs if needed

---

## Support Files

If you get stuck, refer to:
- **QUICKSTART.md** - Step-by-step setup with expected outputs
- **README.md** - Complete documentation
- **PROJECT_STATUS.md** - Project overview and structure
- **backend/README.md** - Backend API documentation
- **agents/README.md** - Python agents documentation

---

## Estimated Timeline

| Step | Time | Status |
|------|------|--------|
| Prerequisites | 10 min | ✅ Complete |
| Docker setup | 5 min | ⏳ Pending |
| Database setup | 2 min | ⏳ Pending |
| Backend startup | 1 min | ⏳ Pending |
| Python startup | 1 min | ⏳ Pending |
| Frontend startup | 1 min | ⏳ Pending |
| Verification | 5 min | ⏳ Pending |
| **TOTAL** | **~25 minutes** | |

---

**You're ready! Follow the QUICKSTART.md guide to get everything running.** 🚀
