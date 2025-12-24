/**
 * Element Discovery Service
 * Senaryo adımları için otomatik element keşfi
 */

import playwrightService from './playwrightService.js';

// Aksiyon anahtar kelimeleri ve element türü eşleştirmesi
const ACTION_PATTERNS = {
  click: {
    keywords: ['tıkla', 'tikla', 'click', 'bas', 'seç', 'sec', 'aç', 'ac', 'kapat', 'gönder', 'gonder', 'submit', 'kaydet', 'sil', 'ekle', 'güncelle', 'guncelle'],
    elementTypes: ['button', 'a', 'input[type="submit"]', 'input[type="button"]', '[role="button"]']
  },
  fill: {
    keywords: ['gir', 'yaz', 'doldur', 'enter', 'input', 'type', 'email', 'şifre', 'sifre', 'password', 'kullanıcı', 'kullanici', 'ad', 'soyad', 'telefon', 'adres'],
    elementTypes: ['input', 'textarea']
  },
  select: {
    keywords: ['seç', 'sec', 'select', 'dropdown', 'listeden', 'menüden', 'menuден'],
    elementTypes: ['select', '[role="listbox"]', '[role="combobox"]']
  },
  check: {
    keywords: ['işaretle', 'isaretle', 'check', 'checkbox', 'onay', 'kutucuk'],
    elementTypes: ['input[type="checkbox"]', 'input[type="radio"]']
  },
  navigate: {
    keywords: ['git', 'navigate', 'aç', 'ac', 'sayfa', 'url', 'adres', 'yönlen', 'yonlen'],
    elementTypes: ['a', 'nav a']
  },
  verify: {
    keywords: ['kontrol', 'doğrula', 'dogrula', 'verify', 'assert', 'görünmeli', 'gorunmeli', 'olmalı', 'olmali', 'bekle'],
    elementTypes: ['*']
  },
  wait: {
    keywords: ['bekle', 'wait', 'yüklen', 'yuklen', 'load'],
    elementTypes: ['*']
  }
};

// Türkçe - İngilizce element eşleştirme
const ELEMENT_LABELS = {
  // Form alanları
  'email': ['email', 'e-posta', 'eposta', 'mail'],
  'password': ['şifre', 'sifre', 'password', 'parola'],
  'username': ['kullanıcı', 'kullanici', 'username', 'user'],
  'name': ['ad', 'isim', 'name', 'ad soyad', 'fullname'],
  'phone': ['telefon', 'phone', 'tel', 'gsm', 'mobile'],
  'address': ['adres', 'address'],
  'search': ['ara', 'search', 'arama'],

  // Butonlar
  'submit': ['gönder', 'gonder', 'submit', 'kaydet', 'save', 'tamam', 'ok', 'onayla'],
  'login': ['giriş', 'giris', 'login', 'sign in', 'oturum aç'],
  'register': ['kayıt', 'kayit', 'register', 'sign up', 'üye ol'],
  'logout': ['çıkış', 'cikis', 'logout', 'sign out', 'çık'],
  'cancel': ['iptal', 'cancel', 'vazgeç', 'vazgec'],
  'delete': ['sil', 'delete', 'kaldır', 'kaldir', 'remove'],
  'edit': ['düzenle', 'duzenle', 'edit', 'güncelle', 'guncelle', 'update'],
  'add': ['ekle', 'add', 'yeni', 'new', 'oluştur', 'olustur', 'create']
};

/**
 * Senaryo adımından aksiyon türünü çıkar
 */
export function inferActionType(stepText) {
  const lowerText = stepText.toLowerCase();

  for (const [actionType, config] of Object.entries(ACTION_PATTERNS)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        return actionType;
      }
    }
  }

  return 'unknown';
}

/**
 * Step metninden hedef elementi tahmin et
 */
export function inferTargetElement(stepText) {
  const lowerText = stepText.toLowerCase();
  const targets = [];

  for (const [elementKey, aliases] of Object.entries(ELEMENT_LABELS)) {
    for (const alias of aliases) {
      if (lowerText.includes(alias)) {
        targets.push(elementKey);
      }
    }
  }

  return targets.length > 0 ? targets : null;
}

/**
 * Sayfadaki elementleri senaryo adımıyla eşleştir
 */
export async function matchStepToElements(page, step) {
  const { action, number } = step;
  const actionText = typeof action === 'string' ? action : (action?.description || '');

  console.log(`[MatchStep] Step ${number}: "${actionText}"`);

  // Aksiyon türünü belirle
  const actionType = inferActionType(actionText);
  const targetHints = inferTargetElement(actionText);

  console.log(`[MatchStep] ActionType: ${actionType}, TargetHints: ${targetHints ? targetHints.join(', ') : 'none'}`);

  // Sayfadaki elementleri keşfet
  const clickables = await playwrightService.discoverClickableElements(page);
  const formFields = await playwrightService.discoverFormFields(page);

  console.log(`[MatchStep] Bulunan elementler: ${clickables.length} clickable, ${formFields.length} form field`);

  const candidates = [];

  // Aksiyon türüne göre aday elementleri filtrele
  if (['fill', 'check'].includes(actionType)) {
    // Form alanlarında ara
    for (const field of formFields) {
      let score = 0;
      const fieldLabel = (field.label || '').toLowerCase();
      const fieldName = (field.name || '').toLowerCase();
      const fieldPlaceholder = (field.placeholder || '').toLowerCase();
      const fieldId = (field.id || '').toLowerCase();
      const allFieldText = `${fieldLabel} ${fieldName} ${fieldPlaceholder} ${fieldId}`;

      // Hedef element ipuçlarıyla eşleştir
      if (targetHints) {
        for (const hint of targetHints) {
          if (allFieldText.includes(hint)) {
            score += 50;
          }
        }
      }

      // Step metnindeki önemli kelimeleri ara
      const stepWords = actionText
        .toLowerCase()
        .replace(/type|gir|yaz|doldur|into|field|alan/gi, '') // Noise kelimeleri kaldır
        .replace(/['"]/g, '') // Tırnak işaretlerini kaldır
        .split(/\s+/)
        .filter(w => w.length > 2);

      for (const word of stepWords) {
        // Label'da tam eşleşme - yüksek skor
        if (fieldLabel === word) {
          score += 60;
        }
        // Label veya placeholder'da kelime var - orta skor
        else if (fieldLabel.includes(word) || fieldPlaceholder.includes(word)) {
          score += 30;
        }
        // Name veya ID'de var - düşük skor
        else if (fieldName.includes(word) || fieldId.includes(word)) {
          score += 15;
        }
      }

      // Input türü eşleşmesi
      if (targetHints?.includes('email') && field.type === 'email') score += 30;
      if (targetHints?.includes('password') && field.type === 'password') score += 30;

      // Özel kelime eşleşmeleri
      if (actionText.toLowerCase().includes('email') && field.type === 'email') score += 25;
      if (actionText.toLowerCase().includes('şifre') || actionText.toLowerCase().includes('password')) {
        if (field.type === 'password') score += 25;
      }

      if (score > 0) {
        candidates.push({
          ...field,
          score,
          actionType,
          elementCategory: 'form'
        });
      }
    }
  }

  if (['click', 'navigate'].includes(actionType)) {
    // Tıklanabilir elementlerde ara
    for (const clickable of clickables) {
      let score = 0;
      const elementText = (clickable.text || '').toLowerCase();
      const elementId = (clickable.id || '').toLowerCase();
      const elementName = (clickable.name || '').toLowerCase();
      const elementClassName = (clickable.className || '').toLowerCase();
      const allText = `${elementText} ${elementId} ${elementName} ${elementClassName}`;

      // Hedef element ipuçlarıyla eşleştir
      if (targetHints) {
        for (const hint of targetHints) {
          if (allText.includes(hint)) {
            score += 50;
          }
        }
      }

      // Step metnindeki önemli kelimeleri ara
      const stepWords = actionText
        .toLowerCase()
        .replace(/click|tıkla|tikla|button|butonu/gi, '') // Noise kelimeleri kaldır
        .split(/\s+/)
        .filter(w => w.length > 2);

      for (const word of stepWords) {
        // Tam tam eşleşme (tüm step metni element text ile eşleşiyor) - ÇOK yüksek skor
        const cleanStepText = stepWords.join(' ');
        if (elementText === cleanStepText) {
          score += 100;
        }
        // Tek kelime tam eşleşme - yüksek skor
        else if (elementText === word) {
          score += 80;
        }
        // Element text sadece bu kelimeden oluşuyor - çok yüksek skor
        else if (elementText.trim() === word) {
          score += 90;
        }
        // Text içinde kelime var - orta skor
        else if (elementText.includes(word)) {
          score += 20;
        }
        // ID veya name'de var - düşük skor
        else if (elementId.includes(word) || elementName.includes(word)) {
          score += 10;
        }
        // ClassName'de var - çok düşük skor
        else if (elementClassName.includes(word)) {
          score += 3;
        }
      }

      // Buton türü bonus
      if (clickable.tag === 'button') score += 5;
      if (clickable.type === 'submit') score += 10;

      // Viewport'ta olan elementlere bonus - daha erişilebilir
      if (clickable.isInViewport) score += 15;

      if (score > 0) {
        candidates.push({
          ...clickable,
          score,
          actionType,
          elementCategory: 'clickable'
        });
      }
    }
  }

  // Sıralama: en yüksek skora göre
  candidates.sort((a, b) => b.score - a.score);

  // En iyi eşleşmeyi döndür
  const bestMatch = candidates.length > 0 ? candidates[0] : null;

  console.log(`[MatchStep] ${candidates.length} aday bulundu, bestMatch: ${bestMatch ? `${bestMatch.selector} (score: ${bestMatch.score})` : 'YOK'}`);

  if (bestMatch) {
    console.log(`[MatchStep] Best match detayları: text="${bestMatch.text || bestMatch.label || 'N/A'}", tag="${bestMatch.tag || 'N/A'}", type="${bestMatch.type || 'N/A'}"`);
  }

  return {
    stepNumber: number,
    actionText,
    actionType,
    targetHints,
    bestMatch,
    alternativeCandidates: candidates.slice(1, 4), // İlk 3 alternatif
    confidence: bestMatch ? Math.min(100, bestMatch.score) : 0
  };
}

/**
 * Tüm senaryo adımları için element keşfi yap
 */
export async function discoverElementsForScenario(page, scenario, project, options = {}) {
  const { sequential = false } = options; // Sequential mode: her adımı execute ederek ilerle
  const { steps, targetUrl } = scenario;
  const baseUrl = targetUrl || project.baseUrl;

  console.log(`[ElementDiscovery] Senaryo için element keşfi başlıyor: ${scenario.title}`);
  console.log(`[ElementDiscovery] ${steps?.length || 0} adım keşfedilecek (sequential: ${sequential})`);

  const results = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    baseUrl,
    mappings: [],
    unmappedSteps: [],
    overallConfidence: 0
  };

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    console.log('[ElementDiscovery] Senaryo adımları bulunamadı!');
    return {
      ...results,
      error: 'Senaryo adımları bulunamadı'
    };
  }

  // Her adım için element keşfi yap
  let totalConfidence = 0;

  for (const step of steps) {
    console.log(`[ElementDiscovery] Adım ${step.number} eşleştiriliyor: ${step.action}`);

    try {
      const stepResult = await matchStepToElements(page, step);
      console.log(`[ElementDiscovery] Adım ${step.number} sonucu: confidence=${stepResult.confidence}, bestMatch=${stepResult.bestMatch ? 'var' : 'yok'}`);

      if (stepResult.bestMatch && stepResult.confidence >= 10) {
        const mapping = {
          stepNumber: step.number,
          action: step.action,
          actionType: stepResult.actionType,
          selector: stepResult.bestMatch.selector,
          xpath: stepResult.bestMatch.xpath,
          elementType: stepResult.bestMatch.tag || stepResult.bestMatch.type,
          elementText: stepResult.bestMatch.text || stepResult.bestMatch.label,
          confidence: stepResult.confidence,
          alternatives: stepResult.alternativeCandidates?.map(c => ({
            selector: c.selector,
            text: c.text || c.label,
            score: c.score
          }))
        };
        results.mappings.push(mapping);
        totalConfidence += stepResult.confidence;
        console.log(`[ElementDiscovery] ✓ Adım ${step.number} eşleştirildi: ${mapping.selector} (confidence: ${stepResult.confidence})`);

        // Sequential mode: Adımı execute et (sayfa değişirse sonraki adımlar yeni sayfada aranır)
        if (sequential) {
          console.log(`[ElementDiscovery] Sequential mode: Adım ${step.number} execute ediliyor...`);
          try {
            await executeStep(page, mapping);
            // Sayfa değişikliğini bekle
            await page.waitForTimeout(1000);
            await page.waitForLoadState('domcontentloaded').catch(() => {});

            const newUrl = page.url();
            console.log(`[ElementDiscovery] Adım execute edildi, mevcut URL: ${newUrl}`);
          } catch (execError) {
            console.warn(`[ElementDiscovery] Adım ${step.number} execute edilemedi: ${execError.message}`);
            // Execute hatasında devam et ama bir sonraki adımda sorun olabilir
          }
        }
      } else {
        results.unmappedSteps.push({
          stepNumber: step.number,
          action: step.action,
          reason: stepResult.confidence === 0 ? 'Eşleşen element bulunamadı' : `Düşük güven skoru (${stepResult.confidence})`
        });
        console.log(`[ElementDiscovery] ✗ Adım ${step.number} eşleştirilemedi: ${stepResult.confidence === 0 ? 'element yok' : `düşük skor (${stepResult.confidence})`}`);

        // Sequential mode'da bir adım bulunamazsa durakla (sonraki adımlar yanlış sayfada olabilir)
        if (sequential) {
          console.warn(`[ElementDiscovery] Sequential mode: Adım ${step.number} bulunamadığı için duraklatılıyor`);
          break; // Sonraki adımlara geçme
        }
      }
    } catch (error) {
      console.error(`[ElementDiscovery] Adım ${step.number} hatası:`, error);
      results.unmappedSteps.push({
        stepNumber: step.number,
        action: step.action,
        reason: `Hata: ${error.message}`
      });

      if (sequential) {
        console.warn(`[ElementDiscovery] Sequential mode: Hata nedeniyle duraklatılıyor`);
        break;
      }
    }
  }

  // Ortalama güven skoru
  results.overallConfidence = steps.length > 0 ? Math.round(totalConfidence / steps.length) : 0;

  console.log(`[ElementDiscovery] Toplam ${results.mappings.length} mapping, ${results.unmappedSteps.length} unmapped, confidence: ${results.overallConfidence}%`);

  return results;
}

/**
 * Bir adımı execute et (sequential discovery için)
 */
async function executeStep(page, mapping) {
  const { actionType, selector, elementText } = mapping;

  console.log(`[ExecuteStep] Executing ${actionType} on ${selector}`);

  try {
    if (actionType === 'fill') {
      // Input field'a değer gir
      // Eğer step action'ında bir değer varsa onu kullan, yoksa test datası
      const value = extractValueFromAction(mapping.action) || 'test@example.com';
      await page.fill(selector, value);
      console.log(`[ExecuteStep] Filled ${selector} with "${value}"`);
    }
    else if (actionType === 'click') {
      // Element'e tıkla
      await page.click(selector);
      console.log(`[ExecuteStep] Clicked ${selector}`);
    }
    else if (actionType === 'check') {
      // Checkbox/radio seç
      await page.check(selector);
      console.log(`[ExecuteStep] Checked ${selector}`);
    }
    else if (actionType === 'select') {
      // Dropdown'dan seç
      await page.selectOption(selector, { index: 1 });
      console.log(`[ExecuteStep] Selected option from ${selector}`);
    }
    // navigate, verify, wait için execute etme - sadece keşif yap
  } catch (error) {
    console.error(`[ExecuteStep] Error executing step: ${error.message}`);
    throw error;
  }
}

/**
 * Action metninden değer çıkar (örn: "Type 'test@example.com' into email field" -> "test@example.com")
 */
function extractValueFromAction(actionText) {
  const matches = actionText.match(/['"]([^'"]+)['"]/);
  return matches ? matches[1] : null;
}

/**
 * Akıllı element önerisi - AI destekli
 */
export async function suggestElementForAction(page, actionDescription, context = {}) {
  const actionType = inferActionType(actionDescription);
  const targetHints = inferTargetElement(actionDescription);

  // Sayfayı analiz et
  const pageStructure = await playwrightService.analyzePageStructure(page);

  // Bağlama göre filtreleme
  let relevantElements = [];

  if (['fill', 'check'].includes(actionType)) {
    relevantElements = pageStructure.formFields;
  } else if (['click', 'navigate'].includes(actionType)) {
    relevantElements = pageStructure.clickableElements;
  } else {
    relevantElements = [...pageStructure.clickableElements, ...pageStructure.formFields];
  }

  // Skor hesapla ve sırala
  const scored = relevantElements.map(el => {
    let score = 0;
    const elText = `${el.text || ''} ${el.label || ''} ${el.id || ''} ${el.name || ''}`.toLowerCase();

    if (targetHints) {
      for (const hint of targetHints) {
        if (elText.includes(hint)) score += 40;
      }
    }

    // Aksiyon kelimelerini ara
    const actionWords = actionDescription.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const word of actionWords) {
      if (elText.includes(word)) score += 15;
    }

    return { ...el, score };
  }).filter(el => el.score > 0).sort((a, b) => b.score - a.score);

  return {
    action: actionDescription,
    actionType,
    suggestions: scored.slice(0, 5).map(el => ({
      selector: el.selector,
      xpath: el.xpath,
      text: el.text || el.label,
      elementType: el.tag || el.type,
      confidence: Math.min(100, el.score)
    }))
  };
}

/**
 * Navigasyon gerektiren sayfaları tespit et
 */
export async function detectNavigationNeeds(scenario, project) {
  const steps = scenario.steps || [];
  const navigations = [];

  for (const step of steps) {
    const actionText = typeof step.action === 'string' ? step.action : step.action?.description || '';
    const lowerAction = actionText.toLowerCase();

    // Sayfa geçişi gerektiren adımları tespit et
    if (
      lowerAction.includes('sayfası') ||
      lowerAction.includes('sayfasına') ||
      lowerAction.includes('menü') ||
      lowerAction.includes('menu') ||
      lowerAction.includes('git') ||
      lowerAction.includes('aç') ||
      lowerAction.includes('navigate')
    ) {
      navigations.push({
        stepNumber: step.number,
        action: actionText,
        potentialUrl: extractPotentialUrl(actionText, project.baseUrl)
      });
    }
  }

  return navigations;
}

/**
 * Aksiyon metninden potansiyel URL çıkar
 */
function extractPotentialUrl(actionText, baseUrl) {
  const urlPatterns = {
    'login': '/login',
    'giriş': '/login',
    'giris': '/login',
    'kayıt': '/register',
    'kayit': '/register',
    'profil': '/profile',
    'ayarlar': '/settings',
    'settings': '/settings',
    'dashboard': '/dashboard',
    'ana sayfa': '/',
    'anasayfa': '/',
    'home': '/'
  };

  const lowerAction = actionText.toLowerCase();

  for (const [key, path] of Object.entries(urlPatterns)) {
    if (lowerAction.includes(key)) {
      return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
    }
  }

  return null;
}

export default {
  inferActionType,
  inferTargetElement,
  matchStepToElements,
  discoverElementsForScenario,
  suggestElementForAction,
  detectNavigationNeeds
};
