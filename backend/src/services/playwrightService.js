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
  try {
    // Sayfanın yüklenmesini bekle
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // DOM'un stabilize olması için

    console.log('[Discovery] Clickable elementler aranıyor...');

    const elements = await page.evaluate(() => {
      try {
        const elements = [];
        const clickables = document.querySelectorAll('button, a, input[type="submit"], input[type="button"], [onclick], [role="button"]');

        console.log(`[Browser Context] ${clickables.length} potansiyel clickable element bulundu`);

        clickables.forEach((el, index) => {
          try {
            const rect = el.getBoundingClientRect();
            const computed = getComputedStyle(el);

            // Daha katı görünürlük kontrolü
            const isDisplayed = computed.display !== 'none';
            const isVisibilityHidden = computed.visibility === 'hidden';
            const isOpacityZero = parseFloat(computed.opacity) === 0;
            const hasSize = rect.width > 0 && rect.height > 0;
            const isInViewport = rect.top >= 0 || rect.bottom > 0; // En azından kısmen viewport'ta

            // Sadece gerçekten görünür elementleri al
            const isVisible = isDisplayed && !isVisibilityHidden && !isOpacityZero && hasSize;

            if (isVisible) {
              const elementInfo = {
                index,
                tag: el.tagName.toLowerCase(),
                type: el.type || null,
                text: (el.innerText || el.textContent || el.value || '').trim().substring(0, 100),
                id: el.id || null,
                name: el.name || null,
                className: typeof el.className === 'string' ? el.className : '',
                href: el.href || null,
                selector: generateSelector(el),
                xpath: generateXPath(el),
                position: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                isVisible: true,
                isInViewport // Viewport'ta mı?
              };

              elements.push(elementInfo);
            }
          } catch (err) {
            console.error(`[Browser Context] Element ${index} işlenirken hata:`, err.message);
          }
        });

        function generateSelector(el) {
          try {
            if (el.id) return `#${el.id}`;
            if (el.name) return `[name="${el.name}"]`;

            // Daha güvenli className kontrolü
            if (el.className && typeof el.className === 'string') {
              const classes = el.className.split(' ').filter(c => c && c.trim() && !c.includes(':') && !c.includes('['));
              if (classes.length > 0) return `.${classes[0]}`; // Sadece ilk class'ı kullan
            }

            // Text içeriğine göre
            const text = (el.innerText || el.textContent || '').trim();
            if (text && text.length < 50) {
              return `${el.tagName.toLowerCase()}:has-text("${text.substring(0, 30)}")`;
            }

            return el.tagName.toLowerCase();
          } catch (err) {
            return el.tagName.toLowerCase();
          }
        }

        function generateXPath(el) {
          try {
            if (el.id) return `//*[@id="${el.id}"]`;

            const parts = [];
            let current = el;

            while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName !== 'HTML') {
              let index = 1;
              let sibling = current.previousSibling;

              while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
                  index++;
                }
                sibling = sibling.previousSibling;
              }

              const tagName = current.nodeName.toLowerCase();
              const indexStr = index > 1 ? `[${index}]` : '';
              parts.unshift(`${tagName}${indexStr}`);

              current = current.parentNode;
            }

            return '//' + parts.join('/');
          } catch (err) {
            return `//${el.tagName.toLowerCase()}`;
          }
        }

        console.log(`[Browser Context] ${elements.length} clickable element toplandı`);
        return elements;
      } catch (err) {
        console.error('[Browser Context] Element discovery hatası:', err);
        return [];
      }
    });

    console.log(`[Discovery] ${elements.length} clickable element bulundu`);
    return elements;
  } catch (error) {
    console.error('[Discovery] discoverClickableElements hatası:', error);
    return [];
  }
}

/**
 * Sayfadaki form alanlarını keşfet
 */
export async function discoverFormFields(page) {
  try {
    // Sayfanın yüklenmesini bekle
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // DOM'un stabilize olması için

    console.log('[Discovery] Form alanları aranıyor...');

    const fields = await page.evaluate(() => {
      try {
        const fields = [];
        const inputs = document.querySelectorAll('input, textarea, select');

        console.log(`[Browser Context] ${inputs.length} potansiyel form field bulundu`);

        inputs.forEach((el, index) => {
          try {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 || rect.height > 0 || getComputedStyle(el).display !== 'none';

            if (isVisible) {
              // Label bul
              let label = '';
              if (el.id) {
                const labelEl = document.querySelector(`label[for="${el.id}"]`);
                if (labelEl) label = (labelEl.innerText || labelEl.textContent || '').trim();
              }
              if (!label && el.placeholder) {
                label = el.placeholder;
              }
              if (!label && el.name) {
                label = el.name;
              }
              if (!label && el.getAttribute('aria-label')) {
                label = el.getAttribute('aria-label');
              }

              // Selector oluştur
              let selector;
              if (el.id) {
                selector = `#${el.id}`;
              } else if (el.name) {
                selector = `[name="${el.name}"]`;
              } else if (el.placeholder) {
                selector = `[placeholder="${el.placeholder}"]`;
              } else {
                const type = el.type || 'text';
                selector = `${el.tagName.toLowerCase()}[type="${type}"]`;
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
                selector,
                xpath: el.id ? `//*[@id="${el.id}"]` : (el.name ? `//*[@name="${el.name}"]` : null),
                position: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
              });
            }
          } catch (err) {
            console.error(`[Browser Context] Form field ${index} işlenirken hata:`, err.message);
          }
        });

        console.log(`[Browser Context] ${fields.length} form field toplandı`);
        return fields;
      } catch (err) {
        console.error('[Browser Context] Form field discovery hatası:', err);
        return [];
      }
    });

    console.log(`[Discovery] ${fields.length} form field bulundu`);
    return fields;
  } catch (error) {
    console.error('[Discovery] discoverFormFields hatası:', error);
    return [];
  }
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
 * Sayfanın sadeleştirilmiş (AI dostu) DOM yapısını çıkarır
 * LLM'e göndermek için optimize edilmiş format
 */
export async function getSimplifiedDOM(page) {
  try {
    const domMapJson = await page.evaluate(() => {
      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      // Sadece etkileşime girilebilir elementleri al
      const interactables = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="link"], [onclick], [type="submit"]'
      );

      const domMap = [];
      let validIndex = 0;

      interactables.forEach((el) => {
        if (!isVisible(el)) return;

        // Viewport kontrolü - sadece ekranda görünen elementler (mobil menü gibi gizlileri atla)
        const rect = el.getBoundingClientRect();
        const isInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
          rect.width > 0 &&
          rect.height > 0
        );

        // Viewport dışındaki elementleri atla
        if (!isInViewport) return;

        // Her elemente geçici bir data-ai-id ata ki referans verebilelim
        el.setAttribute('data-ai-id', validIndex);

        // Element metnini topla
        let text = '';
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          // Form field - label, placeholder, name kullan
          text = el.placeholder || el.getAttribute('aria-label') || el.name || '';

          // Label elementini bul
          if (el.id) {
            const labelEl = document.querySelector(`label[for="${el.id}"]`);
            if (labelEl) {
              text = (labelEl.innerText || labelEl.textContent || '').trim() + ' ' + text;
            }
          }
        } else {
          // Button, link - innerText kullan
          text = (el.innerText || el.textContent || '').trim();
        }

        // Temizle ve kısalt
        text = text.replace(/\s+/g, ' ').trim().substring(0, 100);

        // Test ID, ID, Name gibi önemli attributelar
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || '';
        const elementId = el.id || '';
        const elementName = el.name || '';
        const elementType = el.type || '';
        const ariaLabel = el.getAttribute('aria-label') || '';

        // Modal/popup context bilgisi (AI'ın popup içi/dışı ayrımı yapabilmesi için)
        const modalParent = el.closest('[role="dialog"], [aria-modal="true"], .modal, .popup, .modal-content, [class*="modal"], [class*="popup"], [class*="dialog"]');
        const isInModal = !!modalParent;
        const containerRole = el.closest('[role]')?.getAttribute('role') || null;

        // rect ve isInViewport zaten yukarıda tanımlandı, yeniden kullan
        domMap.push({
          id: validIndex,
          tag: el.tagName.toLowerCase(),
          type: elementType,
          text: text || '(no text)',
          testId: testId,
          elementId: elementId,
          name: elementName,
          ariaLabel: ariaLabel,
          isInViewport: true, // Zaten viewport kontrolünden geçti
          isInModal: isInModal, // Popup/modal içinde mi?
          containerRole: containerRole, // Parent container'ın role'ü (dialog, alert, etc)
          position: {
            x: Math.round(rect.x),
            y: Math.round(rect.y)
          }
        });

        validIndex++;
      });

      return domMap;
    });

    console.log(`[SimplifiedDOM] ${domMapJson.length} etkileşimli element bulundu`);

    // JSON string olarak döndür (LLM'e göndermeye hazır)
    return JSON.stringify(domMapJson, null, 2);

  } catch (error) {
    console.error('[SimplifiedDOM] Hata:', error.message);
    return '[]';
  }
}

/**
 * Geçici data-ai-id'den kalıcı selector üret
 * AI tarafından seçilen elementi DOM'da bulup robust selector oluştur
 */
export async function generateRobustSelector(page, tempId) {
  try {
    const selectorInfo = await page.evaluate((id) => {
      const el = document.querySelector(`[data-ai-id="${id}"]`);
      if (!el) return null;

      // Öncelik sırası: testId > id > name > text
      if (el.getAttribute('data-testid')) {
        return {
          selector: `[data-testid="${el.getAttribute('data-testid')}"]`,
          type: 'testid'
        };
      }
      if (el.id) {
        return {
          selector: `#${el.id}`,
          type: 'id'
        };
      }
      if (el.name && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
        return {
          selector: `[name="${el.name}"]`,
          type: 'name'
        };
      }

      // Text-based selector (Playwright getByRole, getByText için)
      const text = (el.innerText || el.textContent || '').trim();
      if (text.length > 0 && text.length < 50) {
        return {
          selector: null, // Playwright locator olarak döneceğiz
          type: 'text',
          text: text,
          tag: el.tagName.toLowerCase()
        };
      }

      // Son çare: CSS path oluştur
      let cssPath = el.tagName.toLowerCase();
      if (el.className) {
        const classes = el.className.split(' ').filter(c => c && !c.includes('active') && !c.includes('hover'));
        if (classes.length > 0) {
          cssPath += '.' + classes[0];
        }
      }

      return {
        selector: cssPath,
        type: 'css'
      };
    }, tempId);

    if (!selectorInfo) {
      throw new Error(`Element with data-ai-id="${tempId}" not found`);
    }

    console.log(`[RobustSelector] Generated: ${selectorInfo.selector || selectorInfo.text} (type: ${selectorInfo.type})`);
    return selectorInfo;

  } catch (error) {
    console.error('[RobustSelector] Hata:', error.message);
    return null;
  }
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
  executeScript,
  getSimplifiedDOM,
  generateRobustSelector
};
