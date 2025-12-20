# Nexus QA - CrewAI Agents

AI destekli test otomasyon ajanları.

## Ajanlar

| Ajan | Rol | Görev |
|------|-----|-------|
| **Manager Omega** | Orkestra Şefi | Ekip koordinasyonu, görev dağıtımı |
| **Agent Alpha** | Test Mimarı | Test senaryoları, Playwright scriptleri |
| **DevBot Beta** | Yazılımcı | Hata analizi, düzeltme önerileri |
| **SecBot Delta** | Güvenlik Analisti | OWASP testleri, güvenlik taraması |

## Kurulum

### 1. Virtual Environment

```bash
cd agents
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Bağımlılıkları Yükle

```bash
pip install -r requirements.txt
```

### 3. Playwright Browsers

```bash
playwright install
```

### 4. Environment Variables

```bash
# .env dosyasını düzenle
# OPENAI_API_KEY=sk-your-key-here
```

## Kullanım

### API Server

```bash
# Sunucuyu başlat (default: localhost:8000)
python main.py --server

# Farklı port
python main.py --server --port 8080
```

### Demo

```bash
# Test demo
python main.py --test-demo

# Güvenlik demo
python main.py --security-demo
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Agent Listesi
```
GET /api/agents
```

### Agent Çalıştır
```
POST /api/run
{
  "agent_type": "test_architect",
  "suite_id": 1,
  "options": {}
}
```

### Test Crew Çalıştır
```
POST /api/crew/test
{
  "crew_type": "test",
  "project": {
    "name": "My Project",
    "base_url": "https://example.com"
  },
  "test_suite": {
    "name": "Login Tests",
    "type": "UI"
  }
}
```

### Security Crew Çalıştır
```
POST /api/crew/security
{
  "crew_type": "security",
  "project": {...},
  "security_target": {
    "url": "https://example.com",
    "endpoints": ["/api/login"],
    "forms": ["login_form"]
  }
}
```

### Task Durumu
```
GET /api/tasks/{task_id}
```

## Klasör Yapısı

```
agents/
├── agents/                 # Ajan tanımları
│   ├── orchestrator.py     # Manager Omega
│   ├── test_architect.py   # Agent Alpha
│   ├── developer_bot.py    # DevBot Beta
│   └── security_analyst.py # SecBot Delta
├── crews/                  # Crew tanımları
│   ├── test_crew.py        # UI/API Test Crew
│   └── security_crew.py    # Security Crew
├── tasks/                  # Görev tanımları
│   ├── ui_test_tasks.py
│   ├── api_test_tasks.py
│   └── security_tasks.py
├── tools/                  # Özel araçlar
│   ├── playwright_tool.py  # Web UI test aracı
│   ├── api_test_tool.py    # API test aracı
│   └── code_analyzer.py    # Kod analiz aracı
├── api/                    # FastAPI endpoints
│   └── endpoints.py
├── config.py               # Konfigürasyon
├── main.py                 # Ana giriş noktası
├── requirements.txt        # Bağımlılıklar
└── .env                    # Environment variables
```

## Swagger Docs

API başlatıldıktan sonra:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)
