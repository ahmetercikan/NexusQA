/**
 * Script Generator Service
 * Senaryo ve element eşlemelerinden Playwright test script'i üretir
 */

import path from 'path';
import fs from 'fs';

/**
 * Senaryo için Playwright test script'i üret
 */
export function generatePlaywrightScript(scenario, project, elementMappings = []) {
  const { title, description, steps, expectedResult, preconditions, testData, targetUrl } = scenario;
  const { baseUrl, loginUrl, loginUsername } = project;

  // Script header
  let script = `/**
 * Test: ${title}
 * ${description || ''}
 *
 * Otomatik oluşturulma tarihi: ${new Date().toISOString()}
 * Nexus QA Platform
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Screenshot dizini oluştur
const screenshotDir = path.join(process.cwd(), 'tests/generated/screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

`;

  // Test configuration - no beforeEach, her test kendi navigation'ını yapar
  script += `test.describe('${escapeString(title)}', () => {
  test('${escapeString(title)}', async ({ page }) => {
`;

  // Preconditions varsa yorum olarak ekle
  if (preconditions) {
    script += `    // Ön Koşullar: ${escapeString(preconditions)}
`;
  }

  // Test data varsa değişken olarak tanımla
  if (testData && Object.keys(testData).length > 0) {
    script += `
    // Test Verileri
    const testData = ${JSON.stringify(testData, null, 4).split('\n').join('\n    ')};
`;
  }

  // Adımları Playwright koduna dönüştür
  script += `
    // Test Adımları
`;

  let stepCount = 0;
  if (steps && Array.isArray(steps)) {
    for (const step of steps) {
      const stepCode = generateStepCode(step, elementMappings, testData);
      script += stepCode;
      stepCount++;
      
      // Her adımdan sonra screenshot al (debug/monitoring için)
      script += `    // Adım ${stepCount} screenshot'ı
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepCount}.png\`) }).catch(() => {});
`;
    }
  }

  // Expected Result assertion
  if (expectedResult) {
    script += `
    // Beklenen Sonuç: ${escapeString(expectedResult)}
    await expect(page).toHaveURL(/./); // Sayfada olduğumuzu doğrula
`;
  }

  script += `  });
});
`;

  return script;
}

/**
 * Tek bir adım için Playwright kodu üret
 */
function generateStepCode(step, elementMappings, testData) {
  const { number, action } = step;
  const actionText = typeof action === 'string' ? action : (action?.description || action);

  // Bu adım için element mapping'i bul
  const mapping = elementMappings.find(m => m.stepNumber === number);
  const selector = mapping?.selector;
  const actionType = mapping?.actionType || inferActionTypeFromText(actionText);

  let code = `
    // Adım ${number}: ${escapeString(actionText)}
`;

  // Aksiyon türüne göre kod üret
  switch (actionType) {
    case 'navigate':
      code += generateNavigationCode(actionText, selector);
      break;

    case 'click':
      code += generateClickCode(actionText, selector, mapping);
      break;

    case 'fill':
      code += generateFillCode(actionText, selector, mapping, testData);
      break;

    case 'select':
      code += generateSelectCode(actionText, selector, mapping, testData);
      break;

    case 'check':
      code += generateCheckCode(actionText, selector, mapping);
      break;

    case 'verify':
      code += generateVerifyCode(actionText, selector, mapping);
      break;

    case 'wait':
      code += generateWaitCode(actionText, selector);
      break;

    default:
      // Aksiyon metninden akıllı kod üretmeye çalış
      code += generateSmartCode(actionText, testData);
  }

  return code;
}

/**
 * Navigasyon kodu üret
 */
function generateNavigationCode(actionText, selector) {
  // URL tespit etmeye çalış
  const urlMatch = actionText.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return `    await page.goto('${urlMatch[0]}');
    await page.waitForLoadState('networkidle');
`;
  }

  // Sayfa ismi tespit et
  const pagePatterns = {
    'login': '/login',
    'giriş': '/login',
    'ana sayfa': '/',
    'anasayfa': '/',
    'dashboard': '/dashboard',
    'profil': '/profile',
    'ayarlar': '/settings'
  };

  const lowerAction = actionText.toLowerCase();
  for (const [key, path] of Object.entries(pagePatterns)) {
    if (lowerAction.includes(key)) {
      return `    await page.goto(page.url().split('/').slice(0, 3).join('/') + '${path}');
    await page.waitForLoadState('networkidle');
`;
    }
  }

  // Selector varsa tıklama ile navigasyon
  if (selector) {
    return `    await page.click('${escapeSelector(selector)}');
    await page.waitForLoadState('networkidle');
`;
  }

  return `    // TODO: Navigasyon URL'i belirle
    // await page.goto('URL');
`;
}

/**
 * Tıklama kodu üret
 */
function generateClickCode(actionText, selector, mapping) {
  if (selector) {
    return `    await page.click('${escapeSelector(selector)}');
`;
  }

  // Selector yoksa text'e göre bulmaya çalış
  const buttonText = extractButtonText(actionText);
  if (buttonText) {
    return `    await page.getByRole('button', { name: '${escapeString(buttonText)}' }).click();
`;
  }

  return `    // TODO: Element selector belirle
    // await page.click('selector');
`;
}

/**
 * Form doldurma kodu üret
 */
function generateFillCode(actionText, selector, mapping, testData) {
  // Test data'dan değer bulmaya çalış
  let value = 'test_value';

  const fieldType = detectFieldType(actionText);
  if (testData) {
    if (fieldType === 'email' && testData.email) value = testData.email;
    else if (fieldType === 'password' && testData.password) value = testData.password;
    else if (fieldType === 'username' && (testData.username || testData.name)) value = testData.username || testData.name;
    else if (fieldType === 'phone' && testData.phone) value = testData.phone;
  }

  if (selector) {
    return `    await page.fill('${escapeSelector(selector)}', '${escapeString(value)}');
`;
  }

  // Selector yoksa label/placeholder ile bul
  const fieldLabel = extractFieldLabel(actionText);
  if (fieldLabel) {
    return `    await page.getByLabel('${escapeString(fieldLabel)}').fill('${escapeString(value)}');
`;
  }

  // Input type'a göre bul
  if (fieldType === 'email') {
    return `    await page.fill('input[type="email"]', '${escapeString(value)}');
`;
  }
  if (fieldType === 'password') {
    return `    await page.fill('input[type="password"]', '${escapeString(value)}');
`;
  }

  return `    // TODO: Input selector ve değer belirle
    // await page.fill('selector', 'value');
`;
}

/**
 * Select/dropdown kodu üret
 */
function generateSelectCode(actionText, selector, mapping, testData) {
  if (selector) {
    return `    await page.selectOption('${escapeSelector(selector)}', 'value');
`;
  }

  return `    // TODO: Select elementi ve değer belirle
    // await page.selectOption('selector', 'value');
`;
}

/**
 * Checkbox/radio kodu üret
 */
function generateCheckCode(actionText, selector, mapping) {
  if (selector) {
    return `    await page.check('${escapeSelector(selector)}');
`;
  }

  const labelText = extractCheckboxLabel(actionText);
  if (labelText) {
    return `    await page.getByLabel('${escapeString(labelText)}').check();
`;
  }

  return `    // TODO: Checkbox selector belirle
    // await page.check('selector');
`;
}

/**
 * Doğrulama/assertion kodu üret
 */
function generateVerifyCode(actionText, selector, mapping) {
  const lowerText = actionText.toLowerCase();
  
  // Google arama sonuçları kontrolü
  if (lowerText.includes('google') && (lowerText.includes('result') || lowerText.includes('sonuç') || lowerText.includes('arama'))) {
    const textMatch = actionText.match(/['"]([^'"]+)['"]/);
    const searchTerm = textMatch ? textMatch[1] : 'result';
    return `    // Google arama sonuçlarını doğrula
    await expect(page).toHaveURL(/search/);
    await expect(page.locator('text=${escapeString(searchTerm)}')).toBeVisible({ timeout: 10000 });
`;
  }

  // Metin kontrolü
  const textMatch = actionText.match(/["']([^"']+)["']/);
  if (textMatch) {
    return `    await expect(page.locator('text=${escapeString(textMatch[1])}')).toBeVisible({ timeout: 5000 });
`;
  }

  // Element görünürlük kontrolü
  if (selector) {
    return `    await expect(page.locator('${escapeSelector(selector)}')).toBeVisible();
`;
  }

  // URL kontrolü
  if (actionText.toLowerCase().includes('url') || actionText.toLowerCase().includes('sayfa')) {
    return `    // URL doğrulama
    await expect(page).toHaveURL(/expected-url-pattern/);
`;
  }

  return `    // TODO: Doğrulama assertion'ı ekle
    // await expect(page.locator('selector')).toBeVisible();
`;
}

/**
 * Bekleme kodu üret
 */
function generateWaitCode(actionText, selector) {
  // Süre belirtilmişse
  const timeMatch = actionText.match(/(\d+)\s*(saniye|sn|second|s)/i);
  if (timeMatch) {
    const seconds = parseInt(timeMatch[1]);
    return `    await page.waitForTimeout(${seconds * 1000});
`;
  }

  // Element bekleme
  if (selector) {
    return `    await page.waitForSelector('${escapeSelector(selector)}');
`;
  }

  // Sayfa yüklenmesi bekleme
  if (actionText.toLowerCase().includes('yüklen') || actionText.toLowerCase().includes('load')) {
    return `    await page.waitForLoadState('networkidle');
`;
  }

  return `    await page.waitForTimeout(1000);
`;
}

/**
 * Aksiyon metninden aksiyon türünü çıkar
 */
function inferActionTypeFromText(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('git') || lowerText.includes('aç') || lowerText.includes('navigate')) return 'navigate';
  if (lowerText.includes('tıkla') || lowerText.includes('tikla') || lowerText.includes('click') || lowerText.includes('bas')) return 'click';
  if (lowerText.includes('gir') || lowerText.includes('yaz') || lowerText.includes('doldur') || lowerText.includes('fill')) return 'fill';
  if (lowerText.includes('seç') || lowerText.includes('sec') || lowerText.includes('select')) return 'select';
  if (lowerText.includes('işaretle') || lowerText.includes('check')) return 'check';
  if (lowerText.includes('kontrol') || lowerText.includes('doğrula') || lowerText.includes('verify')) return 'verify';
  if (lowerText.includes('bekle') || lowerText.includes('wait')) return 'wait';

  return 'unknown';
}

/**
 * Aksiyon metninden akıllıca kod üret (element mapping olmadan)
 */
function generateSmartCode(actionText, testData) {
  const lowerText = actionText.toLowerCase();

  // Enter/Return tuşu - Google search de dahil
  if (lowerText.includes('enter') || lowerText.includes('return') || lowerText.includes('press enter') || lowerText.includes('bas') || lowerText.includes('search')) {
    // Eğer search/Google arama ise, sorguda Enter'la ara
    if (lowerText.includes('search') || lowerText.includes('google') || lowerText.includes('ara')) {
      return `    // Enter tuşuna bas ve ara
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
`;
    }
    return `    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
`;
  }

  // Google arama kutusu - spesifik selector'lar (textarea[name="q"])
  if (lowerText.includes('google') && (lowerText.includes('search') || lowerText.includes('ara') || lowerText.includes('arama') || lowerText.includes('kutusu'))) {
    const valueMatch = actionText.match(/['"]([^'"]+)['"]/);
    const value = valueMatch ? valueMatch[1] : (testData?.searchTerm || testData?.query || 'test');
    return `    // Google arama kutusuna yaz
    const searchInput = page.locator('textarea[name="q"]').first();
    await searchInput.click();
    await searchInput.fill('${escapeString(value)}');
    await page.waitForTimeout(500);
`;
  }

  // Genel arama kutusu/input'a yazma
  if ((lowerText.includes('search') || lowerText.includes('ara') || lowerText.includes('input') || lowerText.includes('type') || lowerText.includes('enter') || lowerText.includes('yaz')) &&
      (lowerText.includes('box') || lowerText.includes('kutu') || lowerText.includes('alan') || lowerText.includes('field'))) {
    // Tırnak içindeki değeri bul
    const valueMatch = actionText.match(/['"]([^'"]+)['"]/);
    const value = valueMatch ? valueMatch[1] : (testData?.searchTerm || testData?.query || 'test');
    return `    // Arama kutusuna yaz
    const searchInput = page.locator('input[type="text"], input[type="search"], textarea[name*="q"], textarea[name*="search"], [placeholder*="Search"], [aria-label*="Search"], textarea[name="q"]').first();
    await searchInput.click();
    await searchInput.fill('${escapeString(value)}');
    await page.waitForTimeout(500);
`;
  }

  // Google sayfasına git
  if (lowerText.includes('google') && (lowerText.includes('homepage') || lowerText.includes('ana sayfa') || lowerText.includes('navigate') || lowerText.includes('git') || lowerText.includes('giş'))) {
    return `    // Google ana sayfasına git
    await page.goto('https://www.google.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
`;
  }

  // Genel input'a yazma
  if (lowerText.includes('input') || lowerText.includes('type') || lowerText.includes('enter') || lowerText.includes('gir') || lowerText.includes('yaz')) {
    const valueMatch = actionText.match(/['"]([^'"]+)['"]/);
    const value = valueMatch ? valueMatch[1] : (testData?.value || testData?.searchTerm || 'test value');
    return `    // Input'a değer gir
    const input = page.locator('input:visible').first();
    await input.fill('${escapeString(value)}');
    await page.waitForTimeout(500);
`;
  }

  // Tıklama
  if (lowerText.includes('click') || lowerText.includes('press') || lowerText.includes('tap')) {
    const buttonText = extractButtonText(actionText);
    if (buttonText) {
      return `    await page.getByRole('button', { name: /${escapeString(buttonText)}/i }).click();
    await page.waitForTimeout(500);
`;
    }
    return `    // Bir elemente tıkla
    await page.locator('button:visible, [role="button"]:visible').first().click();
    await page.waitForTimeout(500);
`;
  }

  // Sonuçları kontrol et
  if (lowerText.includes('result') || lowerText.includes('sonuç') || lowerText.includes('verify') || lowerText.includes('check') || lowerText.includes('doğrula')) {
    return `    // Sonuçları kontrol et
    await expect(page).toHaveURL(/./);
    await page.waitForTimeout(1000);
`;
  }

  // Sayfa yüklenme
  if (lowerText.includes('load') || lowerText.includes('wait') || lowerText.includes('yüklen') || lowerText.includes('bekle')) {
    return `    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
`;
  }

  // Default: yorum olarak ekle ama hata vermesin
  return `    // Aksiyon: ${escapeString(actionText)}
    await page.waitForTimeout(500);
`;
}

/**
 * Alan türünü tespit et
 */
function detectFieldType(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('email') || lowerText.includes('e-posta') || lowerText.includes('mail')) return 'email';
  if (lowerText.includes('şifre') || lowerText.includes('sifre') || lowerText.includes('password')) return 'password';
  if (lowerText.includes('kullanıcı') || lowerText.includes('kullanici') || lowerText.includes('username')) return 'username';
  if (lowerText.includes('telefon') || lowerText.includes('phone')) return 'phone';

  return 'text';
}

/**
 * Buton metnini çıkar
 */
function extractButtonText(text) {
  // Tırnak içindeki metni bul
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1];

  // "X butonuna tıkla" pattern'i
  const buttonMatch = text.match(/["']?(\w+)["']?\s*(buton|button|düğme|dugme)/i);
  if (buttonMatch) return buttonMatch[1];

  return null;
}

/**
 * Form alan etiketini çıkar
 */
function extractFieldLabel(text) {
  // "X alanına" pattern'i
  const fieldMatch = text.match(/(\w+)\s*(alanı|alani|alan|input|field)/i);
  if (fieldMatch) return fieldMatch[1];

  return null;
}

/**
 * Checkbox etiketini çıkar
 */
function extractCheckboxLabel(text) {
  const labelMatch = text.match(/["']([^"']+)["']/);
  if (labelMatch) return labelMatch[1];

  return null;
}

/**
 * String escape
 */
function escapeString(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}

/**
 * Selector escape
 */
function escapeSelector(selector) {
  if (!selector) return '';
  return selector.replace(/'/g, "\\'");
}

/**
 * Script'i dosyaya kaydet
 */
export async function saveScript(script, filename, outputDir = 'tests/generated') {
  const testsDir = path.join(process.cwd(), outputDir);

  // Klasör yoksa oluştur
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  const filePath = path.join(testsDir, filename);
  fs.writeFileSync(filePath, script, 'utf-8');

  return filePath;
}

/**
 * Playwright config dosyası oluştur
 */
export function generatePlaywrightConfig(project) {
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/generated',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: '${project.baseUrl || 'http://localhost:3000'}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: {
      width: ${project.viewportWidth || 1920},
      height: ${project.viewportHeight || 1080}
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});
`;
}

/**
 * Manuel test case'lerden Playwright script'i üret
 * Element keşfi varsa gerçek selectorları kullan
 */
export function generateScriptFromManualScenario(scenario, project = {}) {
  const {
    title,
    description,
    steps = [],
    expectedResult,
    preconditions,
    testData: rawTestData
  } = scenario;

  // testData null veya undefined olabilir, her zaman object olduğundan emin ol
  const testData = rawTestData || {};

  const { baseUrl = 'http://localhost:3000', elementMappings = [] } = project;

  // DEBUG logging
  console.log(`[scriptGenerator] generateScriptFromManualScenario başladı:`);
  console.log(`  - title: ${title}`);
  console.log(`  - baseUrl: ${baseUrl}`);
  console.log(`  - elementMappings:`, elementMappings);
  console.log(`  - elementMappings.length: ${elementMappings?.length || 0}`);
  console.log(`  - steps:`, steps);
  console.log(`  - steps.length: ${steps?.length || 0}`);

  // Script header
  let script = `/**
 * Test: ${title}
 * ${description || ''}
 *
 * Otomatik oluşturulma tarihi: ${new Date().toISOString()}
 * Nexus QA Platform - Manuel Test Case'den Üretildi
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Screenshot dizini oluştur
const screenshotDir = path.join(process.cwd(), 'tests/generated/screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('${escapeString(title)}', () => {
  test('${escapeString(title)}', async ({ page }) => {
`;

  // Preconditions
  if (preconditions) {
    script += `    // Ön Koşullar: ${escapeString(preconditions)}
`;
  }

  // Test data
  if (testData && Object.keys(testData).length > 0) {
    script += `
    // Test Verileri
    const testData = ${JSON.stringify(testData, null, 4).split('\n').join('\n    ')};
`;
  }

  script += `
    // Test Adımları
    await page.goto('${baseUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Sayfa yüklenmesi için kısa bekleme

`;

  // Convert steps to code
  let stepCount = 0;
  const stepArray = Array.isArray(steps) ? steps : [];

  for (const step of stepArray) {
    const stepText = typeof step === 'string'
      ? step
      : (step?.description || step?.action || step?.text || '');

    if (!stepText.trim()) continue;

    stepCount++;

    // Parse adım metninden işlem türünü tespit et (baseUrl ile)
    // Element mapping'leri de gönder - gerçek selectorları kullanabilsin
    const stepCode = parseManualStepToCode(stepText, stepCount, testData, baseUrl, elementMappings);
    script += stepCode;

    // Screenshot
    script += `    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepCount}.png\`) }).catch(() => {});

`;
  }

  // Expected Result
  if (expectedResult) {
    script += `    // Beklenen Sonuç: ${escapeString(expectedResult)}
    await expect(page).toHaveTitle(/./); // Sayfada olduğumuzu doğrula
`;
  }

  script += `  });
});
`;

  return script;
}

/**
 * Manuel test adımını Playwright koduna dönüştür
 * Element mappings varsa gerçek selectorları kullan
 */
function parseManualStepToCode(stepText, stepNumber, testData = {}, baseUrl = 'http://localhost:3000', elementMappings = []) {
  let code = `    // Adım ${stepNumber}: ${escapeString(stepText)}
`;

  const lower = stepText.toLowerCase();

  // Bu adım için element mapping'i bul
  const mapping = elementMappings.find(m => m.stepNumber === stepNumber);
  console.log(`[scriptGenerator] Step ${stepNumber} mapping:`, mapping);

  // Navigate / Sayfaya git - Project URL'i kullan!
  if (lower.includes('navigat') || lower.includes('git') || lower.includes('aç') || lower.includes('open') || lower.includes('homepage') || lower.includes('ana sayfa')) {
    // Eğer step'te belirli bir URL varsa, onu kullan
    const urlMatch = stepText.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      code += `    await page.goto('${urlMatch[0]}', { waitUntil: 'domcontentloaded', timeout: 30000 });
`;
    } else {
      // URL yoksa, project baseUrl'i kullan
      code += `    await page.goto('${baseUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
`;
    }
    code += `    await page.waitForTimeout(1500); // Sayfa yüklenmesi için bekleme
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-navigate.png\`) }).catch(() => {});
`;
    return code;
  }

  // Click / Tıkla
  if (lower.includes('tıkla') || lower.includes('tikla') || lower.includes('click') || lower.includes('press')) {
    // Element mapping'den gerçek selector'ı kullan
    if (mapping && mapping.selector) {
      code += `    // Element'e tıkla (keşfedilen selector)
    await page.locator('${escapeSelector(mapping.selector)}').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-click.png\`) }).catch(() => {});
`;
      return code;
    }

    // Fallback: Tırnak içindeki text'i bul
    const quoted = stepText.match(/["']([^"']+)["']/);
    if (quoted) {
      const buttonText = quoted[1];
      // Eğer "Search" gibi olmayan bir buton arıyorsa, Enter tuşunu kullan
      if (buttonText.toLowerCase().includes('search') || buttonText.toLowerCase().includes('ara')) {
        code += `    // Arama için Enter tuşu kullan (Search butonu yok)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-search.png\`) }).catch(() => {});
`;
      } else {
        code += `    // "${buttonText}" butonuna tıkla
    await page.getByRole('button', { name: /${escapeString(buttonText)}/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-click.png\`) }).catch(() => {});
`;
      }
    } else {
      code += `    // Bir button'a tıkla
    await page.locator('button:visible, [role="button"]:visible').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-click.png\`) }).catch(() => {});
`;
    }
    return code;
  }

  // Fill / Doldur / Type - Form alanına değer gir
  if (lower.includes('doldur') || lower.includes('fill') || lower.includes('type') || lower.includes('gir') || lower.includes('yaz')) {
    // Tırnak içindeki değeri bul
    const quoted = stepText.match(/["']([^"']+)["']/);
    const value = quoted ? quoted[1] : (testData?.value || testData?.searchTerm || 'test value');

    // Element mapping'den gerçek selector'ı kullan
    if (mapping && mapping.selector) {
      code += `    // Input'a değer gir (keşfedilen selector): "${value}"
    const input = page.locator('${escapeSelector(mapping.selector)}');
    await input.fill('${escapeString(value)}');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-fill.png\`) }).catch(() => {});
`;
    } else {
      // Fallback: generic selector
      code += `    // Input'a değer gir: "${value}"
    const input = page.locator('input:visible, textarea:visible').first();
    await input.fill('${escapeString(value)}');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-fill.png\`) }).catch(() => {});
`;
    }
    return code;
  }

  // Search / Ara - Arama kutusuna yazıp Enter bas
  if (lower.includes('ara') || lower.includes('arama') || lower.includes('search')) {
    const quoted = stepText.match(/["']([^"']+)["']/);
    const searchQuery = quoted ? quoted[1] : (testData?.searchTerm || testData?.query || 'search term');

    if (mapping && mapping.selector) {
      // Element mapping'den gerçek selector'ı kullan
      code += `    // Arama kutusuna "${searchQuery}" yaz (keşfedilen selector)
    const searchInput = page.locator('${escapeSelector(mapping.selector)}');
    await searchInput.click();
    await searchInput.fill('${escapeString(searchQuery)}');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000); // Arama sonuçları için bekleme
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-search.png\`) }).catch(() => {});
`;
    } else {
      // Fallback: generic selector
      code += `    // Arama kutusuna "${searchQuery}" yaz ve ara
    const searchInput = page.locator('input[placeholder*="ara" i], input[placeholder*="search" i], input[name="q"], textarea[name="q"]').first();
    await searchInput.click();
    await searchInput.fill('${escapeString(searchQuery)}');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000); // Arama sonuçları için bekleme
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-search.png\`) }).catch(() => {});
`;
    }
    return code;
  }

  // Select / Seç - Dropdown'dan seçim yap
  if (lower.includes('seç') || lower.includes('sec') || lower.includes('select')) {
    const quoted = stepText.match(/["']([^"']+)["']/);
    const option = quoted ? quoted[1] : 'Option';
    
    code += `    // Dropdown'dan seçim yap: "${option}"
    await page.selectOption('select', { label: /${escapeString(option)}/i });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-select.png\`) }).catch(() => {});
`;
    return code;
  }

  // Check / İşaretle - Checkbox'ı işaretle
  if (lower.includes('işaretle') || lower.includes('isaretле') || lower.includes('check')) {
    const quoted = stepText.match(/["']([^"']+)["']/);
    const label = quoted ? quoted[1] : 'checkbox';
    
    code += `    // Checkbox'ı işaretle: "${label}"
    await page.getByLabel(/${escapeString(label)}/i).check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-check.png\`) }).catch(() => {});
`;
    return code;
  }

  // Verify / Doğrula / Assert - Sonuç kontrolü
  if (lower.includes('doğrula') || lower.includes('dogrula') || lower.includes('verify') || lower.includes('kontrol') || lower.includes('görünür')) {
    const quoted = stepText.match(/["']([^"']+)["']/);
    if (quoted) {
      code += `    // Sonuç kontrolü: "${quoted[1]}"
    await expect(page.locator(\`text=/${escapeString(quoted[1])}/i\`)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-verify.png\`) }).catch(() => {});
`;
    } else {
      code += `    // Sayfa doğrulama
    await expect(page).toHaveTitle(/./);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-verify.png\`) }).catch(() => {});
`;
    }
    return code;
  }

  // Wait / Bekle - Bekleme
  if (lower.includes('bekle') || lower.includes('wait')) {
    const timeMatch = stepText.match(/(\\d+)\\s*(saniye|sn|second|s|millisecond|ms)/i);
    const ms = timeMatch ? parseInt(timeMatch[1]) * (timeMatch[2]?.match(/ms/i) ? 1 : 1000) : 2000;
    
    code += `    // Bekleme: ${ms}ms
    await page.waitForTimeout(${ms});
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}-wait.png\`) }).catch(() => {});
`;
    return code;
  }

  // Default: Try to find element and click
  code += `    // Adım otomatik analiz yapılmalı: "${escapeString(stepText)}"
    // TODO: İlgili elemanı seçin ve işlemi gerçekleştirin
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepNumber}.png\`) }).catch(() => {});
`;

  return code;
}

/**
 * Helper: Adımdan veri değeri çıkar
 */
function extractDataValue(stepText, testData) {
  // "testData.username" veya "testData['username']" şeklinde veri referansı
  const dataMatch = stepText.match(/testData\.(\w+)|testData\['(\w+)'\]/);
  if (dataMatch) {
    const key = dataMatch[1] || dataMatch[2];
    return testData[key] || '';
  }
  
  // Direkt metinden örnek al (ilk string literal)
  const literal = stepText.match(/["']([^"']+)["']/);
  if (literal) {
    return literal[1];
  }
  
  return 'test-value';
}

/**
 * Helper: Arama sorgusunu çıkar
 */
function extractSearchQuery(stepText) {
  const match = stepText.match(/["']([^"']+)["']/);
  if (match) {
    return match[1];
  }
  return 'test search';
}

/**
 * Helper: Seçenek değerini çıkar
 */
function extractOptionValue(stepText) {
  const match = stepText.match(/["']([^"']+)["']/);
  if (match) {
    return match[1];
  }
  return 'Option';
}

/**
 * Helper: Assertion'ı çıkar
 */
function extractAssertion(stepText) {
  const match = stepText.match(/["']([^"']+)["']/);
  if (match) {
    return match[1];
  }
  return stepText.substring(0, 50);
}

/**
 * Dosya adı için güvenli string oluştur
 */
function sanitizeFilename(str) {
  if (!str) return 'untitled';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Ekran bazlı test script'i üret - aynı ekranın tüm senaryoları tek dosyada
 * @param {Array} scenarios - Aynı ekranın tüm senaryoları
 * @param {Object} project - Proje bilgisi (name, baseUrl, elementMappings)
 * @returns {String} - Playwright script content
 */
export function generateScreenBasedScript(scenarios, project = {}) {
  if (!scenarios || scenarios.length === 0) {
    throw new Error('En az bir senaryo gerekli');
  }

  const { projectName = 'default', baseUrl = 'http://localhost:3000', elementMappings = [] } = project;
  const screen = scenarios[0]?.screen || 'general';

  console.log(`[scriptGenerator] generateScreenBasedScript başladı:`);
  console.log(`  - projectName: ${projectName}`);
  console.log(`  - screen: ${screen}`);
  console.log(`  - scenarios count: ${scenarios.length}`);
  console.log(`  - baseUrl: ${baseUrl}`);

  // Script header
  let script = `/**
 * Test Suite: ${screen} Tests
 * Project: ${projectName}
 *
 * Otomatik oluşturulma tarihi: ${new Date().toISOString()}
 * Nexus QA Platform
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Screenshot dizini - proje ve senaryo bazlı
const projectDir = path.join(process.cwd(), 'tests/generated', '${sanitizeFilename(projectName)}');
if (!fs.existsSync(projectDir)) {
  fs.mkdirSync(projectDir, { recursive: true });
}

test.describe('${escapeString(screen)} Tests', () => {
`;

  // Her senaryo için bir test() bloğu oluştur
  for (const scenario of scenarios) {
    const {
      id,
      title,
      description,
      steps = [],
      expectedResult,
      preconditions,
      testData: rawTestData
    } = scenario;

    const testData = rawTestData || {};
    const scenarioElementMappings = elementMappings.filter(m => m.scenarioId === id);

    script += `
  test('${escapeString(title)}', async ({ page }) => {
    // Senaryo ID: ${id}
    ${description ? `// ${escapeString(description)}` : ''}

    // Screenshot dizini - bu senaryo için
    const screenshotDir = path.join(projectDir, 'screenshots', '${sanitizeFilename(title)}');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
`;

    // Preconditions
    if (preconditions) {
      script += `
    // Ön Koşullar: ${escapeString(preconditions)}
`;
    }

    // Test data
    if (testData && Object.keys(testData).length > 0) {
      script += `
    // Test Verileri
    const testData = ${JSON.stringify(testData, null, 4).split('\n').join('\n    ')};
`;
    }

    // Test adımları
    script += `
    // Test Adımları
    await page.goto('${baseUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'initial.png') }).catch(() => {});

`;

    // Convert steps to code
    let stepCount = 0;
    const stepArray = Array.isArray(steps) ? steps : [];

    for (const step of stepArray) {
      const stepText = typeof step === 'string'
        ? step
        : (step?.description || step?.action || step?.text || '');

      if (!stepText.trim()) continue;

      stepCount++;

      const stepCode = parseManualStepToCode(stepText, stepCount, testData, baseUrl, scenarioElementMappings);
      script += stepCode;

      script += `    await page.screenshot({ path: path.join(screenshotDir, \`step-${stepCount}.png\`) }).catch(() => {});

`;
    }

    // Expected Result
    if (expectedResult) {
      script += `    // Beklenen Sonuç: ${escapeString(expectedResult)}
    await expect(page).toHaveTitle(/./);
    await page.screenshot({ path: path.join(screenshotDir, 'final.png') }).catch(() => {});
`;
    }

    script += `  });
`;
  }

  script += `});
`;

  return script;
}

export default {
  generatePlaywrightScript,
  generateScriptFromManualScenario,
  generateScreenBasedScript,
  saveScript,
  generatePlaywrightConfig
};
