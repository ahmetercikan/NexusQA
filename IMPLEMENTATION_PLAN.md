# Nexus QA - Gerçek Otomasyon İş Akışı Uygulama Planı

## Özet
Belge yüklemeden test koşumuna kadar uçtan uca gerçek otomasyon iş akışı.

---

## Mevcut Durum Analizi

### Var Olan Bileşenler:
- ✅ Belge yükleme ve parse etme
- ✅ CrewAI entegrasyonu (simülasyon modunda)
- ✅ Senaryo çıkarma (temel seviye)
- ✅ WebSocket ile gerçek zamanlı güncellemeler
- ✅ Agent yönetim sistemi

### Eksik Bileşenler:
- ❌ Proje kimlik bilgileri (login credentials) depolama
- ❌ Playwright tarayıcı otomasyonu
- ❌ Ekran keşfi ve element tespiti
- ❌ Gerçek AI ile senaryo analizi
- ❌ Otomatik test script üretimi
- ❌ Test koşum motoru

---

## Uygulama Planı

### Faz 1: Veritabanı Şeması Güncellemesi
**Dosya:** `backend/prisma/schema.prisma`

```prisma
model Project {
  // Mevcut alanlar...

  // YENİ: Proje konfigürasyonu
  loginUrl      String?   @map("login_url")
  loginUsername String?   @map("login_username")
  loginPassword String?   @map("login_password")  // Şifrelenmiş
  loginSelectors Json?    @map("login_selectors") // {username: "#email", password: "#pass", submit: "#login-btn"}
  customHeaders  Json?    @map("custom_headers")
  cookies        Json?
}

model Scenario {
  // Mevcut alanlar...

  // YENİ: Element eşlemeleri
  elementMappings Json?   @map("element_mappings") // [{step: 1, selector: "#btn", xpath: "//button"}]
  screenshotPath  String? @map("screenshot_path")
  lastRunStatus   String? @map("last_run_status")
  lastRunAt       DateTime? @map("last_run_at")
}
```

### Faz 2: Playwright Servisi Oluşturma
**Yeni Dosya:** `backend/src/services/playwrightService.js`

```javascript
// Ana fonksiyonlar:
- launchBrowser(options)           // Tarayıcı başlat
- navigateToUrl(page, url)         // Sayfaya git
- login(page, project)             // Otomatik giriş yap
- discoverElements(page, scenario) // Element keşfi
- captureSelectors(page, element)  // ID/XPath al
- generateScript(scenario)         // Playwright kodu üret
- runTest(scenario)                // Testi koş
- takeScreenshot(page, path)       // Ekran görüntüsü
```

### Faz 3: Otomasyon Orkestratörü
**Yeni Dosya:** `backend/src/services/automationOrchestrator.js`

```javascript
// Tam iş akışı yönetimi:
class AutomationOrchestrator {
  async startFullWorkflow(projectId, documentId) {
    // 1. Analist Ajan: Belgeyi analiz et
    // 2. Test Mimarı: Senaryoları tasarla
    // 3. Orkestra Şefi: Element keşfi koordine et
    // 4. Test Mimarı: Script üret
    // 5. Orkestra Şefi: Testleri koş
  }
}
```

### Faz 4: Backend API Endpoint'leri
**Dosya:** `backend/src/routes/automationRoutes.js`

```
POST /api/automation/start
  - projectId, documentId alır
  - Tam otomasyon iş akışını başlatır

POST /api/automation/discover/:scenarioId
  - Tek senaryo için element keşfi

POST /api/automation/generate/:scenarioId
  - Playwright script üret

POST /api/automation/run/:scenarioId
  - Testi koş

GET /api/automation/status/:workflowId
  - İş akışı durumu
```

### Faz 5: Frontend Güncellemeleri

#### 5.1 Proje Ayarları Sayfası Güncelleme
**Dosya:** `src/pages/Settings.jsx` veya yeni `ProjectSettings.jsx`

- Login URL girişi
- Kullanıcı adı/şifre alanları
- Login selector'ları (opsiyonel, otomatik tespit edilebilir)
- Test butonu (bağlantıyı test et)

#### 5.2 Senaryo Detay Modalı Güncelleme
**Dosya:** `src/pages/TestScenarios.jsx`

- Element eşlemelerini göster
- "Elementleri Keşfet" butonu
- "Script Üret" butonu
- "Testi Koş" butonu
- Ekran görüntüsü önizleme

#### 5.3 Dashboard'a Otomasyon İş Akışı Paneli
**Dosya:** `src/pages/Dashboard.jsx`

- "Tam Otomasyon Başlat" butonu
- Proje seçimi
- Belge seçimi
- İlerleme göstergesi

---

## Agent Görev Dağılımı

### 1. Analist Ajan (ANALYST)
- Belgeyi oku ve analiz et
- Test senaryolarını çıkar
- Öncelikleri belirle

### 2. Test Mimarı (TEST_ARCHITECT)
- Senaryoları Playwright script'ine dönüştür
- Element selector'ları optimize et
- Test assertion'ları oluştur

### 3. Orkestra Şefi (ORCHESTRATOR)
- İş akışını koordine et
- Agent'lar arası iletişimi yönet
- Hata durumlarını ele al

### 4. Güvenlik Analisti (SECURITY_ANALYST)
- Güvenlik test senaryoları oluştur (opsiyonel)
- XSS, SQL Injection testleri ekle

---

## Detaylı Uygulama Adımları

### Adım 1: Proje Şemasını Güncelle
1. `schema.prisma`'ya yeni alanları ekle
2. Migration oluştur
3. Seed dosyasını güncelle

### Adım 2: Playwright Paketini Kur
```bash
cd backend
npm install playwright @playwright/test
npx playwright install chromium
```

### Adım 3: Playwright Servisini Yaz
- Tarayıcı yönetimi
- Sayfa navigasyonu
- Element keşfi algoritması
- Screenshot alma
- Script üretici

### Adım 4: Otomasyon Orkestratörünü Yaz
- Agent koordinasyonu
- WebSocket event'leri
- Hata yönetimi
- İlerleme takibi

### Adım 5: API Route'larını Ekle
- automationRoutes.js oluştur
- Controller fonksiyonları yaz
- Route'u ana router'a ekle

### Adım 6: Frontend'i Güncelle
- Proje ayarları formu
- Senaryo element görüntüleyici
- Otomasyon kontrol paneli

---

## Teknik Detaylar

### Element Keşfi Algoritması
```javascript
async function discoverElements(page, scenarioSteps) {
  const mappings = [];

  for (const step of scenarioSteps) {
    // 1. Step açıklamasından element tipini çıkar
    const elementType = inferElementType(step.action);

    // 2. Sayfada ilgili elementleri bul
    const candidates = await findCandidateElements(page, elementType, step);

    // 3. En uygun elementi seç
    const bestMatch = await selectBestMatch(candidates, step);

    // 4. Selector'ları al
    if (bestMatch) {
      mappings.push({
        stepNumber: step.number,
        selector: await getSelector(bestMatch),
        xpath: await getXPath(bestMatch),
        elementType,
        confidence: bestMatch.confidence
      });
    }
  }

  return mappings;
}
```

### Script Üretici Şablonu
```javascript
function generatePlaywrightScript(scenario, elementMappings) {
  return `
import { test, expect } from '@playwright/test';

test('${scenario.title}', async ({ page }) => {
  // Preconditions
  ${scenario.preconditions ? `// ${scenario.preconditions}` : ''}

  // Navigate to base URL
  await page.goto(process.env.BASE_URL);

  // Test Steps
  ${generateSteps(scenario.steps, elementMappings)}

  // Expected Result
  ${generateAssertion(scenario.expectedResult)}
});
`;
}
```

---

## WebSocket Event'leri

```javascript
// Yeni event'ler:
'automation:started'      // İş akışı başladı
'automation:step'         // Adım tamamlandı
'automation:element'      // Element keşfedildi
'automation:script'       // Script üretildi
'automation:test:start'   // Test başladı
'automation:test:pass'    // Test geçti
'automation:test:fail'    // Test başarısız
'automation:completed'    // İş akışı tamamlandı
'automation:error'        // Hata oluştu
```

---

## Dosya Yapısı (Yeni)

```
backend/
├── src/
│   ├── services/
│   │   ├── playwrightService.js      [YENİ]
│   │   ├── automationOrchestrator.js [YENİ]
│   │   ├── elementDiscovery.js       [YENİ]
│   │   ├── scriptGenerator.js        [YENİ]
│   │   └── crewAIBridge.js           [GÜNCELLE]
│   ├── routes/
│   │   └── automationRoutes.js       [YENİ]
│   └── controllers/
│       └── automationController.js   [YENİ]
├── tests/                            [YENİ]
│   └── generated/                    # Üretilen test dosyaları
└── playwright.config.js              [YENİ]

src/
├── pages/
│   ├── ProjectSettings.jsx           [YENİ]
│   └── Dashboard.jsx                 [GÜNCELLE]
└── components/
    ├── AutomationPanel.jsx           [YENİ]
    └── ElementMappingViewer.jsx      [YENİ]
```

---

## Kullanıcı Akışı

1. **Proje Oluştur/Düzenle**
   - URL, login bilgileri gir
   - "Bağlantıyı Test Et" ile doğrula

2. **Belge Yükle**
   - PDF/Word/Excel yükle
   - Otomatik senaryo çıkarımı

3. **Senaryoları İncele**
   - Çıkarılan senaryoları gör
   - Gerekirse düzenle

4. **Otomasyon Başlat**
   - "Tam Otomasyon" butonuna tıkla
   - Agent'lar sırayla çalışır:
     a. Analist → Belge analizi
     b. Orkestra Şefi → Ekranlara git
     c. Test Mimarı → Element keşfi + Script üretimi

5. **Test Koşumu**
   - Üretilen testleri koş
   - Sonuçları görüntüle
   - Hataları raporla

---

## Tahmini Geliştirme Sırası

1. [x] Schema güncellemesi
2. [ ] Playwright kurulumu
3. [ ] playwrightService.js
4. [ ] elementDiscovery.js
5. [ ] scriptGenerator.js
6. [ ] automationOrchestrator.js
7. [ ] automationRoutes.js + controller
8. [ ] Frontend: ProjectSettings
9. [ ] Frontend: AutomationPanel
10. [ ] Test ve entegrasyon

---

## Onay Bekleniyor

Bu plan sizin istediğiniz iş akışını kapsıyor mu? Değişiklik veya ekleme yapmamı ister misiniz?
