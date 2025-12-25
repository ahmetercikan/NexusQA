/**
 * Programmatic Test Runner
 * Playwright testlerini programatik olarak çalıştırır (CLI yerine)
 * Bu sayede browser instance'a erişip CDP screencasting ekleyebiliriz
 */

import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import { cdpScreencast } from './cdpScreencast.js';
import { emitScreencastFrame, emitScreencastStarted, emitScreencastStopped } from '../websocket/socketHandler.js';

/**
 * Test dosyasını çalıştır ve CDP screencast yap
 * @param {string} scriptPath - Test dosyasının tam path'i
 * @param {string} workflowId - Workflow ID (WebSocket için)
 * @param {Object} options - Test seçenekleri
 */
export async function runTestWithScreencast(scriptPath, workflowId, options = {}) {
  const {
    headless = false,
    browser = 'chromium',
    slowMo = 0,
    viewport = { width: 1920, height: 1080 }
  } = options;

  let browserInstance = null;
  let context = null;
  let page = null;

  try {
    console.log(`[ProgrammaticRunner] Starting test: ${scriptPath}`);
    console.log(`[ProgrammaticRunner] Workflow ID: ${workflowId}`);
    console.log(`[ProgrammaticRunner] Headless: ${headless}, Browser: ${browser}`);

    // Test dosyasını oku ve parse et
    const testCode = fs.readFileSync(scriptPath, 'utf-8');

    // Browser'ı başlat
    const browserTypes = { chromium, firefox, webkit };
    const selectedBrowser = browserTypes[browser] || chromium;

    browserInstance = await selectedBrowser.launch({
      headless,
      slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    context = await browserInstance.newContext({
      viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    page = await context.newPage();

    console.log(`[ProgrammaticRunner] Browser launched, starting CDP screencast...`);

    // CDP Screencast başlat
    const screencastStarted = await cdpScreencast.startScreencast(page, workflowId, (frame) => {
      // Her frame'i WebSocket ile gönder
      emitScreencastFrame({
        workflowId,
        data: frame.data,
        metadata: frame.metadata
      });
    });

    if (screencastStarted) {
      console.log(`[ProgrammaticRunner] ✅ CDP Screencast started`);
      emitScreencastStarted(workflowId);
    } else {
      console.warn(`[ProgrammaticRunner] ⚠️ CDP Screencast failed to start`);
    }

    // Test kodunu dinamik olarak çalıştır
    // Test'in export ettiği fonksiyonu değil, direkt içeriği çalıştıracağız
    const result = await runTestCode(testCode, page);

    // Screencast'i durdur
    await cdpScreencast.stopScreencast(workflowId);
    emitScreencastStopped(workflowId);

    // Browser'ı kapat
    await context.close();
    await browserInstance.close();

    console.log(`[ProgrammaticRunner] ✅ Test completed`);

    return {
      success: true,
      passed: result.passed ? 1 : 0,
      failed: result.passed ? 0 : 1,
      duration: result.duration,
      error: result.error
    };

  } catch (error) {
    console.error(`[ProgrammaticRunner] ❌ Test failed:`, error);

    // Cleanup
    if (workflowId) {
      await cdpScreencast.stopScreencast(workflowId);
      emitScreencastStopped(workflowId);
    }

    if (context) await context.close().catch(() => {});
    if (browserInstance) await browserInstance.close().catch(() => {});

    return {
      success: false,
      passed: 0,
      failed: 1,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * Test kodunu çalıştır (içindeki test() fonksiyonunu execute et)
 * @param {string} testCode - Test kodu (string)
 * @param {Page} page - Playwright page
 */
async function runTestCode(testCode, page) {
  const startTime = Date.now();

  try {
    // Test kodundan import satırlarını çıkar (runtime'da import edemeyiz)
    const codeWithoutImports = testCode
      .replace(/import\s+.*?from\s+['"]@playwright\/test['"];?/g, '')
      .replace(/import\s+.*?from\s+['"].*?['"];?/g, '');

    // Test completion'ı track etmek için promise
    let testPromiseResolve, testPromiseReject;
    const testCompletionPromise = new Promise((resolve, reject) => {
      testPromiseResolve = resolve;
      testPromiseReject = reject;
    });

    // test() fonksiyonunu mock'layalım
    const testImpl = async (testName, testFn) => {
      console.log(`[Test] Running: ${testName}`);
      try {
        await testFn({ page });
        console.log(`[Test] ✅ Passed: ${testName}`);
        testPromiseResolve();  // Test başarılı
      } catch (error) {
        console.log(`[Test] ❌ Failed: ${testName}`);
        testPromiseReject(error);  // Test başarısız
      }
    };

    // expect mock
    const expect = (value) => ({
      toBe: (expected) => {
        if (value !== expected) throw new Error(`Expected ${expected} but got ${value}`);
      },
      toEqual: (expected) => {
        if (JSON.stringify(value) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
        }
      },
      toContain: (substring) => {
        if (!value.includes(substring)) {
          throw new Error(`Expected to contain "${substring}"`);
        }
      },
      toBeTruthy: () => {
        if (!value) throw new Error(`Expected truthy value but got ${value}`);
      },
      toBeVisible: async () => {
        const isVisible = await value.isVisible();
        if (!isVisible) throw new Error('Element is not visible');
      },
      toHaveText: async (text) => {
        const actualText = await value.textContent();
        if (!actualText.includes(text)) {
          throw new Error(`Expected text "${text}" but got "${actualText}"`);
        }
      },
      toHaveURL: (url) => {
        const actualUrl = page.url();
        if (!actualUrl.includes(url)) {
          throw new Error(`Expected URL to contain "${url}" but got "${actualUrl}"`);
        }
      }
    });

    // Kod içindeki test() çağrısını çalıştır
    // DIKKAT: eval kullanımı güvenlik riski oluşturabilir, sadece güvenilir kod için
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const executeFn = new AsyncFunction('page', 'test', 'expect', codeWithoutImports);

    // Test kodunu execute et (bu test() fonksiyonunu çağırır)
    executeFn(page, testImpl, expect);

    // Test'in tamamlanmasını bekle
    await testCompletionPromise;

    const duration = Date.now() - startTime;

    return {
      passed: true,
      duration,
      error: null
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Test] ❌ Failed:`, error.message);

    return {
      passed: false,
      duration,
      error: error.message
    };
  }
}

export default {
  runTestWithScreencast
};
