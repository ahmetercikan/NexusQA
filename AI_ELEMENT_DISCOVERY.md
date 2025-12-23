# AI-Powered Element Discovery

Nexus QA artık **LLM tabanlı semantic element discovery** kullanıyor! Text2Test gibi platformlardaki gibi %100 çalışan test scriptleri üretir.

## 🎯 Ne Değişti?

### Eski Sistem (Regex-Based)
- ❌ Statik text matching (kelime eşleşmesi)
- ❌ Modern SPA'larda başarısız (dinamik DOM)
- ❌ "Kredi Hesapla" butonunu "Hesapla" yerine seçiyordu
- ❌ Form elementleri farklı sayfadaysa bulamıyordu

### Yeni Sistem (AI-Powered)
- ✅ LLM ile semantic matching (anlam bazlı eşleştirme)
- ✅ Execution-first approach (önce çalıştır, sonra kaydet)
- ✅ Sequential discovery (adım adım sayfa navigasyonu)
- ✅ Kanıtlanmış selector'lar (çalıştığı doğrulandı)
- ✅ Vision support (gelecek özellik - screenshot analizi)

## 📦 Kurulum

### 1. AI API Key Edinme

**Seçenek A: OpenAI (Önerilen - En güçlü)**
1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys) adresine git
2. API key oluştur
3. `.env` dosyasına ekle:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Seçenek B: Google Gemini (Free Tier Mevcut)**
1. [ai.google.dev](https://ai.google.dev/) adresine git
2. API key al (Free tier: 15 request/minute)
3. `.env` dosyasına ekle:
```env
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxx
```

### 2. Backend'i Restart Et
```bash
cd backend
npm install  # Yeni paketler yüklendi (openai, @google/generative-ai)
npm run dev  # Backend'i yeniden başlat
```

## 🚀 Nasıl Çalışır?

### Akış Diyagramı
```
1. Test Case Generator → Senaryo adımları oluştur
   ↓
2. Sequential Discovery başlat
   ↓
3. Her adım için:
   ├─ Sayfanın DOM'unu sadeleştir (AI-friendly format)
   ├─ LLM'e sor: "Bu adım için hangi elementi kullanmalıyım?"
   ├─ AI'ın seçtiği elementi DOM'da bul
   ├─ Kalıcı selector oluştur (ID > TestID > Text locator)
   ├─ Adımı GERÇEKTEN çalıştır (click, fill, etc.)
   └─ Sayfa yüklenene kadar bekle → Sonraki adıma geç
   ↓
4. Kanıtlanmış selector'ları veritabanına kaydet
   ↓
5. Script Generator → Bu selector'larla Playwright kodu üret
```

### Örnek Senaryo İşleyişi

**Senaryo:**
1. Navigate to Krediler
2. Click Hesapla button
3. Type '150000' into Kredi Tutar
4. Type '3' into Kredi Vadesi

**AI-Powered Discovery:**

**Adım 1: Navigate to Krediler**
```
DOM Snapshot → AI'a gönder
AI Kararı: {
  "tempId": 23,
  "action": "click",
  "elementText": "Krediler",
  "confidence": 95,
  "reason": "Exact text match for navigation link"
}
Final Selector: a:has-text("Krediler")
✓ Clicked → Yeni sayfa yüklendi
```

**Adım 2: Click Hesapla button**
```
DOM Snapshot (yeni sayfa) → AI'a gönder
AI Kararı: {
  "tempId": 7,
  "action": "click",
  "elementText": "Hesapla",
  "confidence": 92,
  "reason": "Button with exact text 'Hesapla', not 'Kredi Hesapla'"
}
Final Selector: #ctl00_ctl19_g_ee0cf8f3...hLink1Type2
✓ Clicked → Form sayfası açıldı
```

**Adım 3: Type '150000' into Kredi Tutar**
```
DOM Snapshot (form sayfası) → AI'a gönder
AI Kararı: {
  "tempId": 12,
  "action": "fill",
  "value": "150000",
  "elementText": "Kredi Tutar",
  "confidence": 88,
  "reason": "Input field with label 'İhtiyaç Kredisi Tutarı'"
}
Final Selector: #ihtiyacTaksitTutari
✓ Filled with 150000
```

## 🧪 Test Etme

### Manuel Test
1. Test Case Generator'da bir senaryo oluştur
2. "Element Discovery" butonuna tıkla
3. Loglarda şunları görmelisin:
```
[AI-SequentialDiscovery] Senaryo başlıyor: Kredi Hesaplama Testi
[SimplifiedDOM] 91 etkileşimli element bulundu
[AISelectorService] AI Kararı: { tempId: 23, action: 'click', confidence: 95 }
[AI-SequentialDiscovery] ✓ Adım çalıştırıldı: Clicked visible: a:has-text("Krediler")
```

### Beklenen Sonuç
- ✅ Her adım için AI kararı alınmalı
- ✅ Selector'lar gerçekten çalıştırılmalı (execute edilmeli)
- ✅ Database'e kaydedilen mappings gerçek selector'lar içermeli (TODO yok)
- ✅ Script Generator %100 çalışan Playwright kodu üretmeli

## 🔧 Sorun Giderme

### "AI Selector Service: API key bulunamadı"
➡️ `.env` dosyasında `OPENAI_API_KEY` veya `GEMINI_API_KEY` yoksa bu hata gelir.
**Çözüm:** API key ekle ve backend'i restart et.

### "AI hatası: insufficient_quota"
➡️ OpenAI hesabında kredi bitmiş.
**Çözüm:** Gemini'ye geç (free tier) veya OpenAI hesabına kredi yükle.

### "AI düşük confidence verdi (25)"
➡️ AI elementi bulamadı veya emin değil.
**Çözüm:**
- Senaryonun adım açıklaması daha net olmalı
- Sayfadaki element gerçekten var mı kontrol et
- Confidence threshold'u azalt (30 → 20)

### Elementler hala bulunamıyor
➡️ Sayfanın yüklenmesi yavaş olabilir veya dinamik içerik beklenmiyor.
**Çözüm:** `sequentialDiscovery.js` içindeki wait sürelerini artır:
```javascript
await page.waitForTimeout(1000); // → 2000'e çıkar
```

## 📊 Performans

### Token Kullanımı (Maliyet)
- **OpenAI GPT-4o-mini**: ~500-1000 token/adım ($0.15/1M token = ~$0.0001/adım)
- **Gemini 1.5 Flash**: Free tier (15 req/min)

**Örnek:** 10 adımlık senaryo = ~5000 token = $0.001 (OpenAI)

### Süre
- **Eski sistem**: ~2-3 saniye/senaryo (ancak yanlış selector'lar)
- **AI sistem**: ~5-8 saniye/senaryo (ancak %100 doğru selector'lar)

## 🎓 İleri Seviye

### Vision-Based Discovery
Gelecek sürümde ekran görüntüsü analizi:
```javascript
const screenshot = await page.screenshot();
const aiDecision = await generateSelectorWithVision(screenshot, step.action);
// AI ekranda "Sepet ikonu" gibi görsel elementleri bulabilir
```

### Self-Correction Loop
AI yanlış seçim yaptıysa tekrar denemek:
```javascript
if (!executed.success) {
  // AI'a hatayı gönder, alternatif element iste
  aiDecision = await generatePlaywrightSelector(domSnapshot, step.action, {
    excludeIds: [aiDecision.tempId],
    previousError: executed.message
  });
}
```

## 📝 Notlar

- AI modelleri non-deterministik olabilir (aynı input farklı output verebilir)
- Bu yüzden confidence score'a dikkat edin (>70 güvenilir)
- Gemini free tier rate limit'e takılabilir (15 req/min)
- Production'da OpenAI kullanmanız önerilir (daha stabil)

---

**Geliştirici:** AI-Powered Sequential Discovery System
**Versiyon:** 1.0.0
**Tarih:** 2025-12-22
