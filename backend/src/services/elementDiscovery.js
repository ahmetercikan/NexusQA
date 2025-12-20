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

  // Aksiyon türünü belirle
  const actionType = inferActionType(actionText);
  const targetHints = inferTargetElement(actionText);

  // Sayfadaki elementleri keşfet
  const clickables = await playwrightService.discoverClickableElements(page);
  const formFields = await playwrightService.discoverFormFields(page);

  const candidates = [];

  // Aksiyon türüne göre aday elementleri filtrele
  if (['fill', 'check'].includes(actionType)) {
    // Form alanlarında ara
    for (const field of formFields) {
      let score = 0;
      const fieldText = `${field.label} ${field.name} ${field.placeholder} ${field.id}`.toLowerCase();

      // Hedef element ipuçlarıyla eşleştir
      if (targetHints) {
        for (const hint of targetHints) {
          if (fieldText.includes(hint)) {
            score += 50;
          }
        }
      }

      // Step metnindeki kelimeleri ara
      const stepWords = actionText.toLowerCase().split(/\s+/);
      for (const word of stepWords) {
        if (word.length > 2 && fieldText.includes(word)) {
          score += 10;
        }
      }

      // Input türü eşleşmesi
      if (targetHints?.includes('email') && field.type === 'email') score += 30;
      if (targetHints?.includes('password') && field.type === 'password') score += 30;

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
      const elementText = `${clickable.text} ${clickable.id} ${clickable.name} ${clickable.className}`.toLowerCase();

      // Hedef element ipuçlarıyla eşleştir
      if (targetHints) {
        for (const hint of targetHints) {
          if (elementText.includes(hint)) {
            score += 50;
          }
        }
      }

      // Step metnindeki kelimeleri ara
      const stepWords = actionText.toLowerCase().split(/\s+/);
      for (const word of stepWords) {
        if (word.length > 2 && elementText.includes(word)) {
          score += 10;
        }
      }

      // Buton türü bonus
      if (clickable.tag === 'button') score += 5;
      if (clickable.type === 'submit') score += 10;

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
export async function discoverElementsForScenario(page, scenario, project) {
  const { steps, targetUrl } = scenario;
  const baseUrl = targetUrl || project.baseUrl;

  const results = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    baseUrl,
    mappings: [],
    unmappedSteps: [],
    overallConfidence: 0
  };

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return {
      ...results,
      error: 'Senaryo adımları bulunamadı'
    };
  }

  // Her adım için element keşfi yap
  let totalConfidence = 0;

  for (const step of steps) {
    const stepResult = await matchStepToElements(page, step);

    if (stepResult.bestMatch && stepResult.confidence > 20) {
      results.mappings.push({
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
      });
      totalConfidence += stepResult.confidence;
    } else {
      results.unmappedSteps.push({
        stepNumber: step.number,
        action: step.action,
        reason: stepResult.confidence === 0 ? 'Eşleşen element bulunamadı' : 'Düşük güven skoru'
      });
    }
  }

  // Ortalama güven skoru
  results.overallConfidence = steps.length > 0 ? Math.round(totalConfidence / steps.length) : 0;

  return results;
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
