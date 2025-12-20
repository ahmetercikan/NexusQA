# Nexus QA - Backend API

AI destekli test otomasyon platformu backend servisi.

## Teknolojiler

- **Runtime:** Node.js 20+
- **Framework:** Express.js 5
- **ORM:** Prisma
- **Database:** PostgreSQL
- **WebSocket:** Socket.io
- **Language:** ES Modules (JavaScript)

## Kurulum

### 1. Bagimliliklari Yukle

```bash
cd backend
npm install
```

### 2. Veritabani Baslat (Docker)

```bash
# Proje root klasorunden
docker-compose up -d postgres
```

### 3. Prisma Setup

```bash
# Prisma client olustur
npm run db:generate

# Veritabani tablolarini olustur
npm run db:push

# Ornek verileri yukle
npm run db:seed
```

### 4. Sunucuyu Baslat

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Projects
```
GET    /api/projects          - Tum projeleri listele
POST   /api/projects          - Yeni proje olustur
GET    /api/projects/:id      - Proje detayi
PUT    /api/projects/:id      - Proje guncelle
DELETE /api/projects/:id      - Proje sil
GET    /api/projects/:id/stats - Proje istatistikleri
```

### Agents
```
GET    /api/agents            - Tum ajanlari listele
GET    /api/agents/:id        - Ajan detayi
GET    /api/agents/:id/status - Ajan durumu
PUT    /api/agents/:id/status - Ajan durumu guncelle
POST   /api/agents/:id/start  - Ajani baslat
POST   /api/agents/:id/stop   - Ajani durdur
POST   /api/agents/reset      - Tum ajanlari sifirla
GET    /api/agents/:id/logs   - Ajan loglari
```

### Test Suites
```
GET    /api/tests/suites           - Tum test suite'leri
POST   /api/tests/suites           - Yeni suite olustur
GET    /api/tests/suites/:id       - Suite detayi
PUT    /api/tests/suites/:id       - Suite guncelle
DELETE /api/tests/suites/:id       - Suite sil
POST   /api/tests/suites/:id/run   - Suite'i calistir
```

### Test Cases
```
GET    /api/tests/suites/:suiteId/cases - Test case'leri listele
POST   /api/tests/suites/:suiteId/cases - Yeni test case
PUT    /api/tests/cases/:id             - Test case guncelle
DELETE /api/tests/cases/:id             - Test case sil
```

### Test Runs
```
GET    /api/tests/runs           - Tum test kosumlari
GET    /api/tests/runs/:id       - Kosum detayi
GET    /api/tests/runs/:id/logs  - Kosum loglari
POST   /api/tests/runs/:id/cancel - Kosumu iptal et
```

### Dashboard
```
GET    /api/tests/dashboard - Dashboard istatistikleri
```

### Logs
```
GET    /api/tests/logs      - Tum loglar
POST   /api/tests/logs      - Log olustur (webhook)
```

## WebSocket Events

Baglanti: `ws://localhost:3001`

### Client -> Server
```javascript
socket.emit('subscribe:agents');   // Ajan guncellemelerine abone ol
socket.emit('subscribe:logs');     // Log guncellemelerine abone ol
socket.emit('subscribe:tests');    // Test guncellemelerine abone ol
```

### Server -> Client
```javascript
socket.on('agent:status', (agent) => {});    // Ajan durumu degisti
socket.on('log:new', (log) => {});           // Yeni log
socket.on('test:started', (testRun) => {});  // Test basladi
socket.on('test:completed', (testRun) => {}); // Test tamamlandi
socket.on('test:failed', (testRun) => {});   // Test basarisiz
```

## Environment Variables

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexus_qa?schema=public
CREWAI_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key
```

## NPM Scripts

```bash
npm run dev         # Development server (auto-reload)
npm start           # Production server
npm run db:generate # Prisma client olustur
npm run db:push     # DB schema sync
npm run db:migrate  # Migration olustur
npm run db:studio   # Prisma Studio (DB GUI)
npm run db:seed     # Ornek veri yukle
```

## Klasor Yapisi

```
backend/
├── prisma/
│   ├── schema.prisma    # Veritabani semasi
│   └── seed.js          # Ornek veri
├── src/
│   ├── config/
│   │   ├── database.js  # Prisma client
│   │   └── env.js       # Environment config
│   ├── controllers/
│   │   ├── agentController.js
│   │   ├── projectController.js
│   │   └── testController.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── agentRoutes.js
│   │   ├── projectRoutes.js
│   │   └── testRoutes.js
│   ├── services/
│   │   └── crewAIBridge.js
│   ├── websocket/
│   │   └── socketHandler.js
│   ├── app.js           # Express app
│   └── server.js        # Server entry
├── .env
├── .env.example
└── package.json
```
