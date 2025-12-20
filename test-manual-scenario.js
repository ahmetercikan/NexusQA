/**
 * Test Manual Scenario Generation
 * Manuel test case'lerden Playwright script'i oluşturmayı test eder
 */

const API_BASE = 'http://localhost:3001/api';

async function test() {
  console.log('🧪 Test Case Generator - Manuel Senaryo Otomasyonu Test Başladı\n');

  try {
    // 1. Test Suite oluştur
    console.log('📌 1. Test Suite oluşturuluyor...');
    const suiteRes = await fetch(`${API_BASE}/tests/suites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Manual Scenario Suite',
        description: 'Manuel test case\'lerinden oluşturulan suite',
        type: 'UI',
        baseUrl: 'https://www.google.com',
      }),
    });
    const suiteData = await suiteRes.json();
    const suiteId = suiteData.data.id;
    console.log(`✓ Suite oluşturuldu: ID=${suiteId}\n`);

    // 2. Manuel senaryo oluştur (Google Search)
    console.log('📌 2. Manuel senaryo oluşturuluyor...');
    const scenarioRes = await fetch(`${API_BASE}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suiteId: suiteId,
        title: 'Google Search Testi',
        description: 'Google\'da "Playwright testing" araması yapıp sonuçları doğrula',
        steps: [
          { number: 1, description: 'Google sayfasına git' },
          { number: 2, description: 'Arama kutusuna "Playwright testing" yaz' },
          { number: 3, description: 'Enter tuşuna bas' },
          { number: 4, description: 'Arama sonuçlarının görüldüğünü doğrula' },
        ],
        expectedResult: 'Playwright hakkında sonuçlar gösterilir',
        preconditions: 'İnternet bağlantısı aktif olmalı',
        testData: {
          searchQuery: 'Playwright testing',
          expectedTitle: 'Playwright',
        },
        priority: 'HIGH',
      }),
    });
    const scenarioData = await scenarioRes.json();
    const scenarioId = scenarioData.scenario.id;
    console.log(`✓ Senaryo oluşturuldu: ID=${scenarioId}\n`);

    // 3. Senaryoyu otomatikleştir
    console.log('📌 3. Senaryo otomatikleştiriliyor (Playwright script oluşturuluyor)...');
    const automateRes = await fetch(`${API_BASE}/scenarios/${scenarioId}/automate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        automationType: 'PLAYWRIGHT',
      }),
    });
    const automateData = await automateRes.json();
    console.log(`✓ Otomasyon tamamlandı!`);
    console.log(`  - Status: ${automateData.scenario.status}`);
    console.log(`  - isAutomated: ${automateData.scenario.isAutomated}`);
    console.log(`  - automationType: ${automateData.scenario.automationType}`);
    console.log(`  - Script Path: ${automateData.scenario.scriptPath}\n`);

    // 4. Oluşturulan senaryoyu getir (script'i görmek için)
    console.log('📌 4. Otomatikleştirilmiş senaryo detayları alınıyor...');
    const detailRes = await fetch(`${API_BASE}/scenarios/${scenarioId}`);
    const detailData = await detailRes.json();
    const scenario = detailData.scenario;
    
    console.log(`✓ Senaryo Detayları:`);
    console.log(`  - Title: ${scenario.title}`);
    console.log(`  - Status: ${scenario.status}`);
    console.log(`  - isAutomated: ${scenario.isAutomated}`);
    console.log(`  - automationType: ${scenario.automationType}`);
    console.log(`  - Script Path: ${scenario.scriptPath}\n`);

    if (scenario.scriptContent) {
      console.log('📄 Oluşturulan Playwright Script İlk 50 Satırı:');
      console.log('─'.repeat(60));
      const lines = scenario.scriptContent.split('\n');
      lines.slice(0, 50).forEach(line => console.log(line));
      if (lines.length > 50) {
        console.log(`... (toplam ${lines.length} satır)`);
      }
      console.log('─'.repeat(60) + '\n');
    }

    // 5. Başarılı/başarısız senaryoları listele
    console.log('📌 5. Tüm senaryolar listesi alınıyor...');
    const listRes = await fetch(`${API_BASE}/scenarios`);
    const listData = await listRes.json();
    console.log(`✓ Toplam ${listData.count} senaryo bulundu`);
    console.log('\nOtomasyonu Yapılanlar:');
    listData.scenarios.filter(s => s.isAutomated).forEach(s => {
      console.log(`  ✓ ${s.title} (${s.automationType})`);
    });
    console.log('\nOtomasyonu Yapılmayanlar:');
    listData.scenarios.filter(s => !s.isAutomated).forEach(s => {
      console.log(`  ✗ ${s.title}`);
    });

    console.log('\n✅ Tüm testler başarıyla tamamlandı!');

  } catch (error) {
    console.error('❌ Hata oluştu:', error.message);
    if (error.response) {
      const errorData = await error.response.json();
      console.error('API Error:', errorData);
    }
  }
}

// Run test
test().catch(console.error);
