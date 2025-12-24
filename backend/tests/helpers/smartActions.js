/**
 * Smart Actions with Vision Fallback + Memory/RAG Integration
 * Runtime Self-Healing with Pattern Learning
 */

const VISION_API_URL = process.env.VISION_API_URL || 'http://localhost:3001';
const MEMORY_API_URL = process.env.MEMORY_API_URL || 'http://localhost:3001';

/**
 * Try to detect project ID from page URL
 */
async function detectProjectId(page) {
  try {
    const url = page.url();

    // Known project URL patterns
    const projectPatterns = [
      { pattern: /isbank\.com\.tr/, id: 2, name: 'İşbankası' },
      { pattern: /demo\.playwright\.dev/, id: 11, name: 'Playwright Demo' },
      { pattern: /google\.com/, id: 9, name: 'Google' },
      { pattern: /10\.20\.13\.140/, id: 10, name: 'DGPAI' },
      { pattern: /localhost:3000/, id: 11, name: 'TodoMVC' },
    ];

    for (const { pattern, id, name } of projectPatterns) {
      if (pattern.test(url)) {
        console.log(`[Memory] 🎯 Auto-detected project: ${name} (ID: ${id})`);
        return id;
      }
    }

    console.log(`[Memory] ℹ Could not detect project from URL: ${url}`);
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve cached selector from memory (RAG)
 */
async function retrieveFromMemory(page, actionText, projectId) {
  try {
    if (!projectId) {
      projectId = await detectProjectId(page);
      if (!projectId) {
        console.log(`[Memory] Skipping retrieval - no project ID`);
        return null;
      }
    }

    const url = page.url();
    const urlPattern = new URL(url).hostname;

    console.log(`[Memory] 🔍 Checking memory for: "${actionText}"`);

    const response = await fetch(`${MEMORY_API_URL}/api/memory/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        actionText,
        urlPattern,
        isInModal: false
      })
    });

    if (!response.ok) {
      console.log(`[Memory] API error: ${response.statusText}`);
      return null;
    }

    const result = await response.json();

    if (result.success && result.pattern) {
      console.log(`[Memory] 🎉 FOUND in memory! Selector: ${result.pattern.selector} (confidence: ${result.pattern.confidence}%, success: ${result.pattern.successCount})`);
      return result.pattern;
    }

    console.log(`[Memory] ℹ Not found in memory`);
    return null;

  } catch (error) {
    console.log(`[Memory] Retrieval failed (non-critical): ${error.message}`);
    return null;
  }
}

/**
 * Store successful pattern to memory
 */
async function storeToMemory(page, actionText, selector, locatorType, confidence, projectId) {
  try {
    if (!projectId) {
      projectId = await detectProjectId(page);
      if (!projectId) {
        console.log(`[Memory] Skipping storage - no project ID`);
        return;
      }
    }

    const url = page.url();
    const urlPattern = new URL(url).hostname;

    console.log(`[Memory] 💾 Storing pattern: "${actionText}" → ${selector}`);

    const response = await fetch(`${MEMORY_API_URL}/api/memory/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        actionText,
        actionType: 'click',
        element: {},
        selector,
        locatorType,
        urlPattern,
        confidence,
        isInModal: false
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[Memory] ✓ Pattern stored (success count: ${result.pattern?.successCount || 1})`);
    } else {
      console.log(`[Memory] Storage failed: ${response.statusText}`);
    }

  } catch (error) {
    console.log(`[Memory] Storage failed (non-critical): ${error.message}`);
  }
}

/**
 * Smart Click - Try DOM selector first, fallback to Vision if element not found/hidden
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector, text selector, or Vision coordinates
 * @param {Object} options - Click options
 * @returns {Promise<{success: boolean, method: string, message: string}>}
 */
export async function smartClick(page, selector, options = {}) {
  const { timeout = 5000, retryWithVision = true } = options;

  console.log(`[SmartClick] Attempting: ${selector}`);

  try {
    // Case 1: Vision coordinates selector (already from Vision Layer)
    if (selector.startsWith('Vision:')) {
      const coordMatch = selector.match(/Vision: \((\d+), (\d+)\)/);
      if (coordMatch) {
        const x = parseInt(coordMatch[1]);
        const y = parseInt(coordMatch[2]);
        console.log(`[SmartClick] Using Vision coordinates: (${x}, ${y})`);
        await page.mouse.click(x, y);
        return { success: true, method: 'vision-coordinates', message: `Clicked at (${x}, ${y})` };
      }
    }

    // Case 2: Text selector - find visible element
    if (selector.startsWith('text=')) {
      const textValue = selector.replace('text=', '');
      console.log(`[SmartClick] Text selector: "${textValue}"`);

      const allMatches = await page.getByText(textValue, { exact: false }).all();
      let visibleElement = null;

      for (const element of allMatches) {
        if (await element.isVisible()) {
          visibleElement = element;
          break;
        }
      }

      if (visibleElement) {
        await visibleElement.click({ timeout });
        console.log(`[SmartClick] ✓ Clicked visible text element: "${textValue}"`);
        return { success: true, method: 'text-locator', message: `Clicked: ${textValue}` };
      } else {
        console.warn(`[SmartClick] ⚠ Text "${textValue}" found but all elements hidden`);
        // Fallback to Vision
        if (retryWithVision) {
          console.log(`[SmartClick] 🎯 Trying Vision fallback...`);
          return await clickWithVision(page, textValue);
        }
        throw new Error(`Text "${textValue}" found but all elements are hidden`);
      }
    }

    // Case 3: Normal CSS/XPath selector
    console.log(`[SmartClick] CSS/XPath selector: ${selector}`);
    const element = page.locator(selector).first();

    // Check if element exists and is visible
    const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);

    if (isVisible) {
      await element.click({ timeout });
      console.log(`[SmartClick] ✓ Clicked: ${selector}`);
      return { success: true, method: 'css-selector', message: `Clicked: ${selector}` };
    } else {
      console.warn(`[SmartClick] ⚠ Element not visible: ${selector}`);

      // Fallback to Vision
      if (retryWithVision) {
        console.log(`[SmartClick] 🎯 Trying Vision fallback...`);
        // Get element text for Vision search
        const elementText = await element.textContent().catch(() => selector);
        return await clickWithVision(page, elementText);
      }
      throw new Error(`Element not visible: ${selector}`);
    }

  } catch (error) {
    console.error(`[SmartClick] ❌ Failed: ${error.message}`);

    // Last resort: Vision fallback
    if (retryWithVision && !error.message.includes('Vision failed')) {
      console.log(`[SmartClick] 🎯 Last resort - Vision fallback...`);
      return await clickWithVision(page, selector);
    }

    throw error;
  }
}

/**
 * Click using Vision API - AI-powered element detection
 * @param {Page} page - Playwright page object
 * @param {string} targetDescription - What to click (text or description)
 * @param {number} projectId - Optional project ID (auto-detected if not provided)
 * @returns {Promise<{success: boolean, method: string, message: string}>}
 */
async function clickWithVision(page, targetDescription, projectId = null) {
  try {
    // LAYER 3: Check Memory/RAG first (before expensive Vision API call)
    console.log(`[Vision] 🧠 Checking memory before Vision API...`);
    const cachedPattern = await retrieveFromMemory(page, targetDescription, projectId);

    if (cachedPattern && cachedPattern.selector) {
      console.log(`[Vision] 💡 Trying cached selector from memory: ${cachedPattern.selector}`);

      try {
        const element = page.locator(cachedPattern.selector).first();
        const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);

        if (isVisible) {
          await element.click();
          console.log(`[Vision] 🎉 SUCCESS with cached selector! (Memory hit)`);

          // Update success count in memory
          await storeToMemory(page, targetDescription, cachedPattern.selector, cachedPattern.locatorType, cachedPattern.confidence, projectId);

          return {
            success: true,
            method: 'memory-cached',
            message: `Memory hit: ${cachedPattern.selector}`
          };
        } else {
          console.log(`[Vision] ⚠ Cached selector not visible, falling back to Vision API`);
        }
      } catch (error) {
        console.log(`[Vision] ⚠ Cached selector failed: ${error.message}, trying Vision API`);
      }
    }

    // Memory miss or cached selector failed → Use Vision API
    console.log(`[Vision] 📸 Analyzing page for: "${targetDescription}"`);

    // Take screenshot
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    const screenshotBase64 = screenshot.toString('base64');

    // Call Vision API
    const visionPrompt = `Find the clickable element with text or label: "${targetDescription}".
Return ONLY a JSON object with:
{
  "found": true/false,
  "x": <x coordinate>,
  "y": <y coordinate>,
  "confidence": <0-100>,
  "description": "<what you see>"
}`;

    const response = await fetch(`${VISION_API_URL}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: screenshotBase64,
        prompt: visionPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[Vision] Result:`, result);

    // Parse Vision response
    let visionData;
    try {
      // Vision API might return nested JSON in analysis field
      visionData = typeof result.analysis === 'string'
        ? JSON.parse(result.analysis)
        : result.analysis;
    } catch {
      visionData = result;
    }

    if (visionData.found && visionData.confidence >= 50) {
      const { x, y, confidence, description } = visionData;
      console.log(`[Vision] ✓ Element found at (${x}, ${y}) - confidence: ${confidence}%`);
      console.log(`[Vision] Description: ${description}`);

      // Click the coordinates
      await page.mouse.click(x, y);

      console.log(`[Vision] ✓ Clicked successfully`);

      // LAYER 3: Store successful Vision pattern to memory for future use
      const visionSelector = `Vision: (${x}, ${y})`;
      await storeToMemory(page, targetDescription, visionSelector, 'vision', confidence, projectId);

      return {
        success: true,
        method: 'vision-ai',
        message: `Vision clicked: ${description} at (${x}, ${y})`
      };
    } else {
      throw new Error(`Vision failed: Element not found or low confidence (${visionData.confidence || 0}%)`);
    }

  } catch (error) {
    console.error(`[Vision] ❌ Error: ${error.message}`);
    throw new Error(`Vision failed: ${error.message}`);
  }
}

/**
 * Smart Fill - Try DOM selector first, fallback to Vision if element not found
 * @param {Page} page - Playwright page object
 * @param {string} selector - Input selector
 * @param {string} value - Value to fill
 * @param {Object} options - Fill options
 */
export async function smartFill(page, selector, value, options = {}) {
  const { timeout = 5000, retryWithVision = true } = options;

  console.log(`[SmartFill] Attempting: ${selector} with value: "${value}"`);

  try {
    const element = page.locator(selector).first();
    const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);

    if (isVisible) {
      await element.fill(value, { timeout });
      console.log(`[SmartFill] ✓ Filled: ${selector}`);
      return { success: true, method: 'css-selector', message: `Filled: ${selector}` };
    } else {
      throw new Error(`Element not visible: ${selector}`);
    }

  } catch (error) {
    console.error(`[SmartFill] ❌ Failed: ${error.message}`);

    if (retryWithVision) {
      console.log(`[SmartFill] 🎯 Trying Vision fallback for fill...`);
      return await fillWithVision(page, selector, value);
    }

    throw error;
  }
}

/**
 * Fill input using Vision API - AI-powered element detection and fill
 * @param {Page} page - Playwright page object
 * @param {string} targetDescription - Input field description or selector
 * @param {string} value - Value to fill
 * @returns {Promise<{success: boolean, method: string, message: string}>}
 */
async function fillWithVision(page, targetDescription, value) {
  try {
    console.log(`[Vision Fill] Analyzing page for input: "${targetDescription}"`);

    // Take screenshot
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    const screenshotBase64 = screenshot.toString('base64');

    // Call Vision API to find the input field
    const visionPrompt = `Find the input field with selector or label: "${targetDescription}".
Return ONLY a JSON object with:
{
  "found": true/false,
  "x": <x coordinate of the input field>,
  "y": <y coordinate of the input field>,
  "confidence": <0-100>,
  "description": "<what you see>"
}`;

    const response = await fetch(`${VISION_API_URL}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: screenshotBase64,
        prompt: visionPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[Vision Fill] Result:`, result);

    // Parse Vision response
    let visionData;
    try {
      visionData = typeof result.analysis === 'string'
        ? JSON.parse(result.analysis)
        : result.analysis;
    } catch {
      visionData = result;
    }

    if (visionData.found && visionData.confidence >= 50) {
      const { x, y, confidence, description } = visionData;
      console.log(`[Vision Fill] ✓ Input found at (${x}, ${y}) - confidence: ${confidence}%`);
      console.log(`[Vision Fill] Description: ${description}`);

      // Click the input field to focus it
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);

      // Type the value
      await page.keyboard.type(value);

      console.log(`[Vision Fill] ✓ Filled successfully: "${value}"`);
      return {
        success: true,
        method: 'vision-ai',
        message: `Vision filled: ${description} at (${x}, ${y}) with "${value}"`
      };
    } else {
      throw new Error(`Vision failed: Input not found or low confidence (${visionData.confidence || 0}%)`);
    }

  } catch (error) {
    console.error(`[Vision Fill] ❌ Error: ${error.message}`);
    throw new Error(`Vision failed: ${error.message}`);
  }
}

/**
 * Wait for element with smart retry
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {Object} options - Wait options
 */
export async function smartWaitFor(page, selector, options = {}) {
  const { timeout = 5000, state = 'visible' } = options;

  console.log(`[SmartWaitFor] Waiting for: ${selector} (state: ${state})`);

  try {
    await page.locator(selector).first().waitFor({ state, timeout });
    console.log(`[SmartWaitFor] ✓ Element ready: ${selector}`);
    return { success: true, message: `Element ready: ${selector}` };
  } catch (error) {
    console.warn(`[SmartWaitFor] ⚠ Timeout: ${selector}`);
    throw error;
  }
}

export default {
  smartClick,
  smartFill,
  smartWaitFor,
};
