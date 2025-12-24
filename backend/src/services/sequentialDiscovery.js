/**
 * AI-Powered Sequential Element Discovery Service
 * LLM kullanarak her adımı sırayla çalıştırarak elementleri keşfeder - Text2Test tarzı
 */

import playwrightService from './playwrightService.js';
import { generatePlaywrightSelector, generateSelectorWithVision } from './aiSelectorService.js';

/**
 * Senaryoyu adım adım çalıştırarak elementleri keşfet
 * Her adımda AI ile DOM analizi yap, elementi bul, çalıştır
 */
export async function discoverElementsSequentially(page, scenario, project) {
  const { steps, targetUrl } = scenario;
  const baseUrl = targetUrl || project.baseUrl;

  console.log(`[AI-SequentialDiscovery] Senaryo başlıyor: ${scenario.title}`);
  console.log(`[AI-SequentialDiscovery] ${steps?.length || 0} adım AI ile keşfedilecek`);

  const results = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    baseUrl,
    mappings: [],
    unmappedSteps: [],
    overallConfidence: 0,
    executionLog: [],
    aiDecisions: [] // AI'ın her adım için verdiği kararlar
  };

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return { ...results, error: 'Senaryo adımları bulunamadı' };
  }

  let totalConfidence = 0;

  // Her adımı sırayla çalıştır
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const actionText = step.action || step.description || '';

    console.log(`\n[AI-SequentialDiscovery] === Adım ${step.number}: ${actionText} ===`);

    try {
      // 1. Sayfayı beklet - DOM stabilize olsun
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000); // Dinamik içerik için

      // 2. Sayfanın sadeleştirilmiş DOM yapısını al
      const domSnapshot = await playwrightService.getSimplifiedDOM(page);
      console.log(`[AI-SequentialDiscovery] DOM snapshot alındı (${domSnapshot.length} karakter)`);

      // 3. AI'a sor: "Bu DOM'da, şu adımı gerçekleştirmek için hangi elemente ne yapmalıyım?"
      let aiDecision;
      try {
        aiDecision = await generatePlaywrightSelector(domSnapshot, actionText);
        console.log(`[AI-SequentialDiscovery] AI Kararı:`, aiDecision);

        results.aiDecisions.push({
          stepNumber: step.number,
          decision: aiDecision
        });
      } catch (aiError) {
        console.error(`[AI-SequentialDiscovery] AI Hatası:`, aiError.message);
        results.unmappedSteps.push({
          stepNumber: step.number,
          action: step.action,
          reason: `AI hatası: ${aiError.message}`
        });
        break; // AI çalışmıyorsa devam edemeyiz
      }

      // 4. Navigation action kontrolü
      if (aiDecision && aiDecision.action === 'navigate') {
        console.log(`[AI-SequentialDiscovery] ⏩ Navigation action, element gerekmiyor - sonraki adıma geçiliyor`);
        // Navigation action'ları için element keşfi gerekmez, devam et
        continue;
      }

      // 5. AI element bulamadıysa → VISION FALLBACK
      if (!aiDecision || aiDecision.tempId === null || aiDecision.confidence < 30) {
        console.warn(`[AI-SequentialDiscovery] ⚠️ Confidence düşük (${aiDecision?.confidence || 0}), Vision Layer aktifleştiriliyor...`);

        // 🎯 LAYER 2: VISION - Ekran görüntüsü ile element bulma
        try {
          const screenshot = await page.screenshot();
          const visionResult = await generateSelectorWithVision(screenshot, actionText);
          console.log(`[AI-SequentialDiscovery] 🎯 Vision sonucu:`, visionResult);

          // Vision başarılı olduysa koordinatları kullan
          if (visionResult.confidence >= 50 && visionResult.coordinates) {
            console.log(`[AI-SequentialDiscovery] ✓ Vision ile element bulundu (confidence: ${visionResult.confidence})`);

            // Koordinatlara göre tıklama yap (Vision Layer özel işlem)
            await page.mouse.click(visionResult.coordinates.x, visionResult.coordinates.y);
            console.log(`[AI-SequentialDiscovery] ✓ Vision koordinatlarına tıklandı: (${visionResult.coordinates.x}, ${visionResult.coordinates.y})`);

            // Mapping kaydet (Vision-based)
            results.mappings.push({
              stepNumber: step.number,
              action: step.action,
              actionType: aiDecision.action || 'click',
              selector: `Vision: (${visionResult.coordinates.x}, ${visionResult.coordinates.y})`,
              locatorType: 'vision-coordinates',
              elementText: visionResult.description || 'Vision-detected element',
              confidence: visionResult.confidence,
              aiReason: `Vision Layer - ${visionResult.description}`
            });

            totalConfidence += visionResult.confidence;

            // Sayfa değişikliğini bekle
            await page.waitForTimeout(1500);
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            continue; // Vision başarılı, sonraki adıma geç
          } else {
            // Vision da bulamadı veya düşük confidence
            results.unmappedSteps.push({
              stepNumber: step.number,
              action: step.action,
              reason: `AI ve Vision düşük confidence (DOM: ${aiDecision?.confidence || 0}%, Vision: ${visionResult.confidence || 0}%)`
            });
            console.warn(`[AI-SequentialDiscovery] ✗ Vision da yeterli confidence vermedi (${visionResult.confidence || 0}%)`);
            break;
          }
        } catch (visionError) {
          console.error(`[AI-SequentialDiscovery] Vision hatası:`, visionError.message);
          results.unmappedSteps.push({
            stepNumber: step.number,
            action: step.action,
            reason: `AI düşük confidence (${aiDecision?.confidence || 0}%), Vision başarısız: ${visionError.message}`
          });
          console.warn(`[AI-SequentialDiscovery] ✗ AI bulamadı, Vision de çalışmadı`);
          break; // Element bulunamadıysa daha ileri gidemeyiz
        }
      }

      // 5. Geçici AI ID'den kalıcı selector oluştur
      const selectorInfo = await playwrightService.generateRobustSelector(page, aiDecision.tempId);

      if (!selectorInfo) {
        results.unmappedSteps.push({
          stepNumber: step.number,
          action: step.action,
          reason: 'Kalıcı selector oluşturulamadı'
        });
        console.warn(`[AI-SequentialDiscovery] ✗ Selector oluşturulamadı`);
        break;
      }

      // 6. Final selector'ı belirle
      let finalSelector;
      let locatorType = 'css';

      if (selectorInfo.type === 'text') {
        // Text-based locator (Playwright'ın getByText kullanır)
        finalSelector = `text=${selectorInfo.text}`;
        locatorType = 'text';
      } else {
        finalSelector = selectorInfo.selector;
        locatorType = selectorInfo.type;
      }

      console.log(`[AI-SequentialDiscovery] Final Selector: ${finalSelector} (type: ${locatorType})`);

      // 7. Mapping kaydet
      const mapping = {
        stepNumber: step.number,
        action: step.action,
        actionType: aiDecision.action,
        selector: finalSelector,
        locatorType: locatorType,
        elementText: aiDecision.elementText,
        confidence: aiDecision.confidence,
        aiReason: aiDecision.reason
      };

      results.mappings.push(mapping);
      totalConfidence += aiDecision.confidence;

      // 8. Adımı GERÇEKTEN çalıştır - sonraki adım için sayfa güncellensin
      const executed = await executeStepWithAI(page, aiDecision, finalSelector, locatorType);

      results.executionLog.push({
        stepNumber: step.number,
        executed: executed.success,
        selector: finalSelector,
        message: executed.message
      });

      if (executed.success) {
        console.log(`[AI-SequentialDiscovery] ✓ Adım çalıştırıldı: ${executed.message}`);

        // Adım çalıştırıldıktan sonra sayfanın yüklenmesini bekle
        await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500); // Dinamik içerik için ek bekleme
      } else {
        console.warn(`[AI-SequentialDiscovery] ⚠ Adım çalıştırılamadı ama devam ediliyor: ${executed.message}`);
        // Bazı adımlar (verify gibi) çalıştırılamayabilir, devam et
      }

    } catch (error) {
      console.error(`[AI-SequentialDiscovery] Adım ${step.number} hatası:`, error.message);
      results.unmappedSteps.push({
        stepNumber: step.number,
        action: step.action,
        reason: `Hata: ${error.message}`
      });
      // Hata olursa dur
      break;
    }
  }

  results.overallConfidence = results.mappings.length > 0
    ? Math.round(totalConfidence / results.mappings.length)
    : 0;

  console.log(`\n[AI-SequentialDiscovery] Toplam ${results.mappings.length} mapping bulundu`);
  console.log(`[AI-SequentialDiscovery] Ortalama confidence: ${results.overallConfidence}%`);
  console.log(`[AI-SequentialDiscovery] Unmapped steps: ${results.unmappedSteps.length}`);

  return results;
}

/**
 * Bir adımı AI kararına göre gerçekten çalıştır
 */
async function executeStepWithAI(page, aiDecision, selector, locatorType) {
  const { action, value } = aiDecision;

  try {
    switch (action) {
      case 'click':
      case 'navigate':
        // Tıklama aksiyonu
        try {
          if (locatorType === 'text') {
            // Text locator - sadece visible olanı seç
            const textValue = selector.replace('text=', '');
            // Tüm matching elementleri bul ve visible olanı seç
            const allMatches = await page.getByText(textValue, { exact: false }).all();

            let visibleElement = null;
            for (const element of allMatches) {
              if (await element.isVisible()) {
                visibleElement = element;
                break;
              }
            }

            if (!visibleElement) {
              throw new Error(`Text "${textValue}" found but all elements are hidden`);
            }

            await visibleElement.click({ timeout: 5000 });
            return { success: true, message: `Clicked visible (text): ${textValue}` };
          } else {
            // CSS selector - önce görünür elementi dene
            try {
              const visibleLocator = page.locator(selector).locator('visible=true').first();
              await visibleLocator.click({ timeout: 5000 });
              return { success: true, message: `Clicked visible: ${selector}` };
            } catch (visError) {
              // Force click fallback
              console.log(`[ExecuteStepAI] Görünür element yok, force click deneniyor...`);
              await page.locator(selector).first().click({ force: true, timeout: 5000 });
              return { success: true, message: `Force clicked: ${selector}` };
            }
          }
        } catch (clickError) {
          return { success: false, message: `Click error: ${clickError.message}` };
        }

      case 'fill':
        // Input doldurma
        const fillValue = value || 'test123';
        try {
          if (locatorType === 'text') {
            return { success: false, message: 'Fill action with text locator not supported' };
          }

          await page.fill(selector, fillValue, { timeout: 5000 });
          return { success: true, message: `Filled: ${selector} = ${fillValue}` };
        } catch (fillError) {
          return { success: false, message: `Fill error: ${fillError.message}` };
        }

      case 'select':
        // Dropdown seçimi
        try {
          await page.selectOption(selector, value || '0', { timeout: 5000 });
          return { success: true, message: `Selected: ${selector} = ${value}` };
        } catch (selectError) {
          return { success: false, message: `Select error: ${selectError.message}` };
        }

      case 'check':
        // Checkbox işaretleme
        try {
          await page.check(selector, { timeout: 5000 });
          return { success: true, message: `Checked: ${selector}` };
        } catch (checkError) {
          return { success: false, message: `Check error: ${checkError.message}` };
        }

      default:
        // Wait, verify gibi aksiyonları atla
        return { success: false, message: `Skipped: ${action} (not executable)` };
    }
  } catch (error) {
    console.error(`[ExecuteStepAI] Hata: ${error.message}`);
    return { success: false, message: `Error: ${error.message}` };
  }
}

export default {
  discoverElementsSequentially
};
