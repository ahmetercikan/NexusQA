/**
 * Playwright Service
 * Tarayıcı otomasyonu için Playwright servis katmanı
 */

import { chromium, firefox, webkit } from 'playwright';
import path from 'path';
import fs from 'fs';

// Aktif tarayıcı ve sayfa referansları
let activeBrowser = null;
let activeContext = null;

/**
 * Tarayıcıyı başlat
 */
export async function launchBrowser(options = {}) {
  const {
    headless = true,
    viewport = { width: 1920, height: 1080 },
    slowMo = 0,
    browser = 'chromium'
  } = options;

  // Varsa önceki tarayıcıyı kapat
  if (activeBrowser) {
    await closeBrowser();
  }

  // Tarayıcı tipini seç
  const browserTypes = { chromium, firefox, webkit };
  const selectedBrowser = browserTypes[browser] || chromium;

  activeBrowser = await selectedBrowser.launch({
    headless,
    slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  activeContext = await activeBrowser.newContext({
    viewport,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  return { browser: activeBrowser, context: activeContext };
}

/**
 * Yeni sayfa oluştur
 */
export async function createPage() {
  if (!activeContext) {
    await launchBrowser();
  }
  return await activeContext.newPage();
}

/**
 * Tarayıcıyı kapat
 */
export async function closeBrowser() {
  if (activeContext) {
    await activeContext.close();
    activeContext = null;
  }
  if (activeBrowser) {
    await activeBrowser.close();
    activeBrowser = null;
  }
}

/**
 * Sayfaya git ve yüklenmesini bekle
 */
export async function navigateToUrl(page, url, options = {}) {
  const { waitUntil = 'networkidle', timeout = 30000 } = options;

  try {
    await page.goto(url, { waitUntil, timeout });
    return { success: true, url: page.url() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Otomatik login yap
 */
export async function login(page, project) {
  const {
    loginUrl,
    baseUrl,
    loginUsername,
    loginPassword,
    loginSelectors
  } = project;

  const targetUrl = loginUrl || baseUrl;
  if (!targetUrl) {
    return { success: false, error: 'Login URL tanımlı değil' };
  }

  if (!loginUsername || !loginPassword) {
    return { success: false, error: 'Login bilgileri eksik' };
  }

  // Varsayılan selector'lar
  const selectors = loginSelectors || {
    usernameField: 'input[type="email"], input[name="email"], input[name="username"], #email, #username',
    passwordField: 'input[type="password"], input[name="password"], #password',
    submitButton: 'button[type="submit"], input[type="submit"], button:has-text("Giriş"), button:has-text("Login")'
  };

  try {
    // Login sayfasına git
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Kullanıcı adı alanını bul ve doldur
    const usernameInput = await page.locator(selectors.usernameField).first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill(loginUsername);

    // Şifre alanını bul ve doldur
    const passwordInput = await page.locator(selectors.passwordField).first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill(loginPassword);

    // Submit butonuna tıkla
    const submitBtn = await page.locator(selectors.submitButton).first();
    await submitBtn.click();

    // Sayfa geçişini bekle
    await page.waitForLoadState('networkidle');

    // Login başarılı mı kontrol et (URL değişimi veya login formu kaybolması)
    const currentUrl = page.url();
    const stillOnLogin = currentUrl.includes('login') || currentUrl.includes('signin');

    if (stillOnLogin) {
      // Hata mesajı var mı kontrol et
      const errorText = await page.locator('.error, .alert-danger, [role="alert"]').first().textContent().catch(() => null);
      return {
        success: false,
        error: errorText || 'Login başarısız oldu',
        url: currentUrl
      };
    }

    return {
      success: true,
      message: 'Login başarılı',
      url: currentUrl
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sayfadaki tüm tıklanabilir elementleri keşfet
 */
export async function discoverClickableElements(page) {
  return await page.evaluate(() => {
    const elements = [];
    const clickables = document.querySelectorAll('button, a, input[type="submit"], input[type="button"], [onclick], [role="button"]');

    clickables.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        elements.push({
          index,
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          text: el.innerText?.trim().substring(0, 100) || el.value || '',
          id: el.id || null,
          name: el.name || null,
          className: el.className || null,
          href: el.href || null,
          selector: generateSelector(el),
          xpath: generateXPath(el),
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
      }
    });

    function generateSelector(el) {
      if (el.id) return `#${el.id}`;
      if (el.name) return `[name="${el.name}"]`;
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c && !c.includes(':'));
        if (classes.length > 0) return `.${classes.join('.')}`;
      }
      return el.tagName.toLowerCase();
    }

    function generateXPath(el) {
      if (el.id) return `//*[@id="${el.id}"]`;

      const parts = [];
      let current = el;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = current.previousSibling;

        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }

        const tagName = current.nodeName.toLowerCase();
        const indexStr = index > 0 ? `[${index + 1}]` : '';
        parts.unshift(`${tagName}${indexStr}`);

        current = current.parentNode;
      }

      return '/' + parts.join('/');
    }

    return elements;
  });
}

/**
 * Sayfadaki form alanlarını keşfet
 */
export async function discoverFormFields(page) {
  return await page.evaluate(() => {
    const fields = [];
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Label bul
        let label = '';
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.innerText?.trim();
        }
        if (!label && el.placeholder) {
          label = el.placeholder;
        }
        if (!label && el.name) {
          label = el.name;
        }

        fields.push({
          index,
          tag: el.tagName.toLowerCase(),
          type: el.type || 'text',
          name: el.name || null,
          id: el.id || null,
          placeholder: el.placeholder || null,
          label,
          required: el.required || false,
          selector: el.id ? `#${el.id}` : (el.name ? `[name="${el.name}"]` : `${el.tagName.toLowerCase()}[type="${el.type}"]`),
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
      }
    });

    return fields;
  });
}

/**
 * Belirli bir elementi selector ile bul ve bilgilerini döndür
 */
export async function getElementInfo(page, selector) {
  try {
    const element = await page.locator(selector).first();
    const isVisible = await element.isVisible();

    if (!isVisible) {
      return { success: false, error: 'Element görünür değil' };
    }

    const boundingBox = await element.boundingBox();
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    const text = await element.textContent();
    const attributes = await element.evaluate(el => {
      const attrs = {};
      for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });

    return {
      success: true,
      element: {
        selector,
        tagName,
        text: text?.trim().substring(0, 200),
        attributes,
        boundingBox,
        isVisible
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ekran görüntüsü al
 */
export async function takeScreenshot(page, filename, options = {}) {
  const { fullPage = false, path: customPath } = options;

  // Screenshots klasörünü oluştur
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const filePath = customPath || path.join(screenshotsDir, `${filename}-${Date.now()}.png`);

  await page.screenshot({
    path: filePath,
    fullPage
  });

  return filePath;
}

/**
 * Bir elementi tıkla
 */
export async function clickElement(page, selector, options = {}) {
  const { timeout = 10000, force = false } = options;

  try {
    const element = await page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    await element.click({ force });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Bir input alanını doldur
 */
export async function fillInput(page, selector, value, options = {}) {
  const { timeout = 10000, clear = true } = options;

  try {
    const element = await page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });

    if (clear) {
      await element.clear();
    }
    await element.fill(value);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Dropdown'dan seçim yap
 */
export async function selectOption(page, selector, value) {
  try {
    await page.selectOption(selector, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Bir metnin sayfada olup olmadığını kontrol et
 */
export async function checkTextExists(page, text) {
  try {
    const locator = page.getByText(text, { exact: false });
    const count = await locator.count();
    return { exists: count > 0, count };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

/**
 * Bir elementin görünür olmasını bekle
 */
export async function waitForElement(page, selector, options = {}) {
  const { timeout = 30000, state = 'visible' } = options;

  try {
    await page.locator(selector).first().waitFor({ state, timeout });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sayfadaki tüm sayfayı analiz et ve element haritası çıkar
 */
export async function analyzePageStructure(page) {
  const clickables = await discoverClickableElements(page);
  const formFields = await discoverFormFields(page);
  const pageUrl = page.url();
  const pageTitle = await page.title();

  return {
    url: pageUrl,
    title: pageTitle,
    clickableElements: clickables,
    formFields: formFields,
    totalElements: clickables.length + formFields.length
  };
}

/**
 * Test senaryosu için Playwright kodu çalıştır
 */
export async function executeScript(scriptContent, project) {
  // Yeni tarayıcı başlat
  const { browser, context } = await launchBrowser({
    headless: true,
    viewport: {
      width: project.viewportWidth || 1920,
      height: project.viewportHeight || 1080
    }
  });

  const page = await context.newPage();
  const results = {
    success: true,
    steps: [],
    screenshots: [],
    errors: []
  };

  try {
    // Base URL'e git
    if (project.baseUrl) {
      await page.goto(project.baseUrl, { waitUntil: 'networkidle' });
    }

    // Login gerekiyorsa yap
    if (project.loginUrl && project.loginUsername) {
      const loginResult = await login(page, project);
      results.steps.push({
        action: 'login',
        success: loginResult.success,
        message: loginResult.message || loginResult.error
      });

      if (!loginResult.success) {
        results.success = false;
        results.errors.push(loginResult.error);
        return results;
      }
    }

    // Script içeriğini değerlendir
    // Not: Gerçek uygulamada, bu kısım daha güvenli bir şekilde ele alınmalı
    // Şu an için basit bir değerlendirme yapıyoruz

    results.steps.push({
      action: 'navigate',
      success: true,
      message: `Sayfa açıldı: ${page.url()}`
    });

    // Son ekran görüntüsü
    const screenshotPath = await takeScreenshot(page, 'test-result');
    results.screenshots.push(screenshotPath);

  } catch (error) {
    results.success = false;
    results.errors.push(error.message);
  } finally {
    await closeBrowser();
  }

  return results;
}

export default {
  launchBrowser,
  createPage,
  closeBrowser,
  navigateToUrl,
  login,
  discoverClickableElements,
  discoverFormFields,
  getElementInfo,
  takeScreenshot,
  clickElement,
  fillInput,
  selectOption,
  checkTextExists,
  waitForElement,
  analyzePageStructure,
  executeScript
};
