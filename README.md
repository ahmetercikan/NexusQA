# Nexus QA - AI-Powered Test Automation Platform

A comprehensive test automation platform powered by AI agents (CrewAI), with a modern React frontend, Node.js/Express backend, and PostgreSQL database.

## Architecture

```
Frontend (React 19 + Vite)
    ↓
REST API + WebSocket (Express.js on Node.js)
    ↓
Databases & Services
    ├── PostgreSQL (Test data, project configs, logs)
    └── CrewAI Python Service (AI agents for testing)
```

## Technology Stack

### Frontend
- **React 19** with Vite
- **React Router DOM** - Client-side routing
- **Socket.io Client** - Real-time WebSocket
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Prisma ORM** - Database management
- **PostgreSQL** - Database
- **Socket.io** - Real-time communication
- **Helmet** - Security middleware
- **Morgan** - HTTP logging

### AI Agents
- **Python 3.10+**
- **CrewAI** - Multi-agent orchestration
- **Playwright** - Web UI testing
- **httpx** - API testing
- **OpenAI GPT** - LLM backend
- **FastAPI** - Agent service API

## Project Structure

```
nexus-qa2/
├── src/                          # Frontend React app
│   ├── App.jsx                  # Main app with routing
│   ├── main.jsx                 # Entry point
│   ├── services/
│   │   └── api.js              # Axios API client
│   ├── hooks/
│   │   └── useWebSocket.js      # Socket.io hooks
│   ├── context/
│   │   └── AppContext.jsx       # Global state management
│   ├── components/              # Reusable components
│   │   ├── Sidebar.jsx
│   │   ├── AgentCard.jsx
│   │   ├── LiveConsole.jsx
│   │   ├── StatCard.jsx
│   │   ├── Modal.jsx
│   │   └── index.js
│   └── pages/                   # Page components
│       ├── Dashboard.jsx        # Main dashboard
│       ├── TestSuites.jsx       # Test management
│       ├── Agents.jsx           # Agent pool
│       ├── Reports.jsx          # Analytics & reports
│       ├── Settings.jsx         # Configuration
│       └── index.js
├── backend/                      # Node.js/Express backend
│   ├── src/
│   │   ├── app.js              # Express app
│   │   ├── server.js           # Server entry
│   │   ├── config/             # Configuration
│   │   ├── middleware/         # Express middleware
│   │   ├── controllers/        # Route handlers
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   └── websocket/          # WebSocket handlers
│   ├── prisma/
│   │   ├── schema.prisma       # Data models
│   │   └── seed.js             # Database seeding
│   ├── package.json
│   ├── .env
│   └── README.md
├── agents/                       # Python CrewAI agents
│   ├── agents/                 # Agent definitions
│   │   ├── orchestrator.py     # Manager Omega
│   │   ├── test_architect.py   # Agent Alpha
│   │   ├── developer_bot.py    # DevBot Beta
│   │   └── security_analyst.py # SecBot Delta
│   ├── tasks/                  # Task definitions
│   ├── tools/                  # Custom tools
│   │   ├── playwright_tool.py
│   │   ├── api_test_tool.py
│   │   └── code_analyzer.py
│   ├── crews/                  # Crew orchestration
│   ├── api/                    # FastAPI service
│   ├── config.py
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── README.md
├── docker-compose.yml           # Docker services
└── README.md                    # This file
```

## Setup Instructions

### Prerequisites

- **Node.js** 18+ (for frontend & backend)
- **Python** 3.10+ (for AI agents)
- **Docker Desktop** (for PostgreSQL)
- **Git**
- **OpenAI API Key** (for AI agents)

### 1. Frontend Setup

```bash
# Navigate to project root
cd nexus-qa2

# Install dependencies
npm install

# Create .env file (if needed)
echo "VITE_API_URL=http://localhost:3001/api" > .env
echo "VITE_WS_URL=ws://localhost:3001" >> .env

# Start dev server
npm run dev
# Frontend will be available at http://localhost:5173
```

### 2. Database Setup

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Verify PostgreSQL is running
docker ps | grep postgres

# Access database UI (optional)
# Adminer: http://localhost:8080
# Server: postgres
# User: postgres
# Password: postgres
# Database: nexus_qa
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Create database schema
npm run db:push

# Seed sample data (optional)
npm run db:seed

# Start backend server
npm run dev
# Backend API: http://localhost:3001
# API docs will be available at /api endpoints
```

### 4. Python Agents Setup

```bash
# Navigate to agents directory
cd agents

# Create Python virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with API keys
echo "OPENAI_API_KEY=sk-..." > .env
echo "BACKEND_API_URL=http://localhost:3001" >> .env

# Start CrewAI FastAPI server
python main.py --server
# CrewAI API: http://localhost:8000
```

### 5. Full System Check

```bash
# Verify all services are running:
# Frontend:  http://localhost:5173
# Backend:   http://localhost:3001
# CrewAI:    http://localhost:8000
# Adminer:   http://localhost:8080

# Check backend health
curl http://localhost:3001/api/health

# Check CrewAI health
curl http://localhost:8000/api/health
```

## Key Features

### Dashboard
- Real-time agent status monitoring
- Test execution orchestration
- Live activity logs
- Performance metrics and statistics

### Test Management
- Create and manage test suites (UI, API, Security, E2E)
- Define test cases with detailed steps
- Execute tests with AI agent assistance
- Track test results and coverage

### Agent Pool
- Monitor 4 specialized AI agents:
  - **Alpha** - Test Architect (test design & Playwright)
  - **Beta** - Developer Bot (error analysis & debugging)
  - **Omega** - Orchestrator (task management & coordination)
  - **Delta** - Security Analyst (OWASP & security testing)
- View agent efficiency and costs
- Control agent execution

### Reports & Analytics
- Test execution trends and statistics
- Pass/fail rate analysis
- Performance metrics
- Exportable reports

### Settings & Configuration
- System configuration management
- Project and connection management
- API endpoint configuration
- Debug mode and logging controls

## Development Workflow

### Making Changes

1. **Frontend Changes**
   - Edit files in `src/`
   - Hot module replacement (HMR) applies changes instantly
   - Changes to components automatically reload

2. **Backend Changes**
   - Edit files in `backend/src/`
   - Use `npm run dev` with --watch flag for auto-reload
   - Changes apply after file save

3. **Database Schema Changes**
   - Edit `backend/prisma/schema.prisma`
   - Run `npm run db:push` or `npm run db:migrate`

4. **Agent Changes**
   - Edit files in `agents/`
   - Restart the FastAPI server to apply changes
   - Test with `python main.py --test-demo`

### Testing

```bash
# Backend database
npm run db:studio     # Opens Prisma Studio UI

# Agents - demo runs
python main.py --test-demo       # Demo UI/API test
python main.py --security-demo   # Demo security scan
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

### Backend (.env)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexus_qa?schema=public
CREWAI_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-here
```

### Agents (.env)
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...  (optional)
BACKEND_API_URL=http://localhost:3001
```

## API Endpoints

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Agents
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/:id/start` - Start agent
- `POST /api/agents/:id/stop` - Stop agent
- `POST /api/agents/reset` - Reset all agents

### Tests
- `GET /api/tests/suites` - List test suites
- `POST /api/tests/suites` - Create test suite
- `POST /api/tests/suites/:id/run` - Run test suite
- `GET /api/tests/runs` - List test runs
- `GET /api/tests/logs` - Get test logs

### Dashboard
- `GET /api/dashboard/stats` - Get statistics

## WebSocket Events

### Agent Events
- `agent:status` - Agent status updated
- `agent:log` - Agent log message

### Test Events
- `test:started` - Test execution started
- `test:completed` - Test execution completed
- `test:failed` - Test execution failed

### Log Events
- `log:new` - New log entry

## Troubleshooting

### Docker Issues
```bash
# Check Docker status
docker ps

# View logs
docker logs nexus-qa-db

# Restart services
docker-compose restart

# Clean up and restart
docker-compose down
docker-compose up -d
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
npm run db:push -- --force-reset

# View database
npm run db:studio
```

### WebSocket Connection Issues
- Check CORS settings in `backend/src/app.js`
- Verify backend is running on port 3001
- Check frontend API URLs in `.env`

### Python Agent Issues
```bash
# Check if running
curl http://localhost:8000/api/health

# View logs
tail -f agents/logs/*.log

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## Performance Optimization

- Frontend: Vite builds optimized production bundles
- Backend: Prisma query optimization and caching
- Database: Indexed fields for common queries
- Agents: Async task execution and parallel processing

## Security Features

- Helmet.js for HTTP security headers
- CORS configuration for frontend access
- Environment variables for sensitive data
- Input validation on API endpoints
- Security analysis tools in CrewAI agents

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions, please create an issue in the repository.

---

**Last Updated:** December 16, 2025
**Status:** Development (All core components integrated)
#   N e x u s Q A  
 