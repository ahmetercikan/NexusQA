/**
 * Autonomous Web Crawler for Test Scenario Discovery
 * Uses Playwright to crawl web pages, discover elements, and generate test scenarios
 */

import crypto from 'crypto';
import { chromium } from 'playwright';

/**
 * State hashing to avoid revisiting same pages
 * Uses URL + page title + main content hash
 */
function generateStateHash(url, title, contentSnapshot) {
  const normalizedUrl = url.split('#')[0].split('?')[0]; // Remove hash and query params
  const stateString = `${normalizedUrl}::${title}::${contentSnapshot}`;
  return crypto.createHash('md5').update(stateString).digest('hex');
}

/**
 * Get content snapshot for state hashing
 * Extracts main content area to detect SPA state changes
 */
async function getContentSnapshot(page) {
  try {
    // Try to get main content area
    const mainContent = await page.evaluate(() => {
      const main = document.querySelector('main') ||
                   document.querySelector('[role="main"]') ||
                   document.querySelector('.main-content') ||
                   document.body;

      // Get text content of first 500 characters
      return main ? main.textContent.substring(0, 500).trim() : '';
    });

    return crypto.createHash('md5').update(mainContent).digest('hex');
  } catch (error) {
    return '';
  }
}

/**
 * Check if element should be ignored based on options
 */
function shouldIgnoreElement(text, href, options) {
  const lowerText = (text || '').toLowerCase();
  const lowerHref = (href || '').toLowerCase();

  // Ignore logout buttons
  if (options.ignoreLogout) {
    const logoutKeywords = ['logout', 'log out', 'sign out', 'signout', 'çıkış', 'oturumu kapat'];
    if (logoutKeywords.some(keyword => lowerText.includes(keyword) || lowerHref.includes(keyword))) {
      return true;
    }
  }

  // Ignore delete/remove buttons
  if (options.ignoreDelete) {
    const deleteKeywords = ['delete', 'remove', 'sil', 'kaldır'];
    if (deleteKeywords.some(keyword => lowerText.includes(keyword) || lowerHref.includes(keyword))) {
      return true;
    }
  }

  return false;
}

/**
 * Auto-fill form inputs based on type detection
 */
async function autoFillForm(page) {
  try {
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');

      inputs.forEach(input => {
        const type = input.type?.toLowerCase() || '';
        const name = input.name?.toLowerCase() || '';
        const id = input.id?.toLowerCase() || '';
        const placeholder = input.placeholder?.toLowerCase() || '';

        // Skip if already filled or disabled
        if (input.value || input.disabled || input.readOnly) return;

        // Email inputs
        if (type === 'email' || name.includes('email') || id.includes('email')) {
          input.value = 'test@example.com';
        }
        // Password inputs
        else if (type === 'password' || name.includes('password') || name.includes('pass')) {
          input.value = 'Test123!@#';
        }
        // Phone inputs
        else if (type === 'tel' || name.includes('phone') || name.includes('tel')) {
          input.value = '+905551234567';
        }
        // Number inputs
        else if (type === 'number') {
          input.value = '123';
        }
        // Date inputs
        else if (type === 'date') {
          input.value = '2024-01-15';
        }
        // Text inputs - detect by name/id/placeholder
        else if (type === 'text' || input.tagName === 'TEXTAREA') {
          if (name.includes('name') || id.includes('name') || placeholder.includes('name')) {
            input.value = 'Test User';
          } else if (name.includes('address') || id.includes('address')) {
            input.value = 'Test Address 123';
          } else if (name.includes('city') || id.includes('city')) {
            input.value = 'Istanbul';
          } else {
            input.value = 'Test Data';
          }
        }
        // Checkboxes - sometimes check them
        else if (type === 'checkbox' && Math.random() > 0.5) {
          input.checked = true;
        }
        // Select dropdowns - select second option if available
        else if (input.tagName === 'SELECT' && input.options.length > 1) {
          input.selectedIndex = 1;
        }
      });
    });

    return true;
  } catch (error) {
    console.error('[AutoFill] Error:', error.message);
    return false;
  }
}

/**
 * Discover clickable elements on page
 */
async function discoverClickableElements(page, currentUrl, options) {
  const elements = await page.evaluate((baseUrl) => {
    const discovered = [];

    // Find all links
    const links = document.querySelectorAll('a[href]');
    links.forEach((link, index) => {
      const href = link.href;
      const text = link.textContent.trim();

      // Only include same-origin links
      try {
        const linkUrl = new URL(href);
        const baseUrlObj = new URL(baseUrl);

        if (linkUrl.origin === baseUrlObj.origin) {
          discovered.push({
            type: 'link',
            selector: `a[href="${link.getAttribute('href')}"]`,
            text,
            href,
            index
          });
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    // Find all buttons
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
    buttons.forEach((button, index) => {
      const text = button.textContent?.trim() || button.value || '';
      discovered.push({
        type: 'button',
        selector: `button:nth-of-type(${index + 1})`,
        text,
        index
      });
    });

    return discovered;
  }, currentUrl);

  // Filter out ignored elements
  return elements.filter(el =>
    !shouldIgnoreElement(el.text, el.href, options)
  );
}

/**
 * Main Autonomous Crawler
 */
export async function crawlWebsite(config) {
  const {
    url: startUrl,
    depth = 3,
    maxPages = 50,
    strategy = 'BFS', // 'BFS' or 'DFS'
    options = {}
  } = config;

  console.log(`[Crawler] Starting ${strategy} crawl from: ${startUrl}`);
  console.log(`[Crawler] Config: depth=${depth}, maxPages=${maxPages}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });

  const visitedStates = new Set(); // State hashes
  const discoveredPaths = []; // Graph of navigation paths
  const queue = [{ url: startUrl, depth: 0, path: [] }]; // BFS/DFS queue
  let pagesVisited = 0;

  try {
    while (queue.length > 0 && pagesVisited < maxPages) {
      // BFS: shift from front, DFS: pop from back
      const current = strategy === 'BFS' ? queue.shift() : queue.pop();

      if (current.depth > depth) continue;

      const page = await context.newPage();

      try {
        console.log(`[Crawler] [${pagesVisited + 1}/${maxPages}] Visiting: ${current.url} (depth: ${current.depth})`);

        // Navigate to page
        await page.goto(current.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(1000); // Wait for dynamic content

        // Get page state
        const title = await page.title();
        const contentSnapshot = await getContentSnapshot(page);
        const stateHash = generateStateHash(current.url, title, contentSnapshot);

        // Skip if already visited this state
        if (visitedStates.has(stateHash)) {
          console.log(`[Crawler] ⏭️  Skipping duplicate state: ${title}`);
          await page.close();
          continue;
        }

        visitedStates.add(stateHash);
        pagesVisited++;

        // Auto-fill forms if enabled
        if (options.autoFillForms) {
          await autoFillForm(page);
        }

        // Discover clickable elements
        const elements = await discoverClickableElements(page, current.url, options);

        console.log(`[Crawler] 🔍 Found ${elements.length} clickable elements on ${title}`);

        // Record this path
        const pathRecord = {
          url: current.url,
          title,
          stateHash,
          depth: current.depth,
          elements: elements.map(el => ({ type: el.type, text: el.text, href: el.href })),
          parentPath: current.path,
        };

        discoveredPaths.push(pathRecord);

        // Add discovered links to queue
        const links = elements.filter(el => el.type === 'link');
        for (const link of links.slice(0, 10)) { // Limit to 10 links per page
          queue.push({
            url: link.href,
            depth: current.depth + 1,
            path: [...current.path, { url: current.url, action: `Click "${link.text}"` }]
          });
        }

        await page.close();

      } catch (error) {
        console.error(`[Crawler] ❌ Error visiting ${current.url}:`, error.message);
        await page.close();
      }
    }

    console.log(`[Crawler] ✅ Crawl complete! Visited ${pagesVisited} pages, discovered ${discoveredPaths.length} unique states`);

    return {
      success: true,
      stats: {
        pagesVisited,
        uniqueStates: visitedStates.size,
        pathsDiscovered: discoveredPaths.length,
      },
      graph: discoveredPaths,
    };

  } finally {
    await browser.close();
  }
}

/**
 * Convert discovered paths to test scenarios
 */
export function convertPathsToScenarios(graph, projectId, suiteId) {
  const scenarios = [];

  // Group paths by depth and create meaningful scenarios
  const pathsByDepth = {};

  graph.forEach(path => {
    if (!pathsByDepth[path.depth]) {
      pathsByDepth[path.depth] = [];
    }
    pathsByDepth[path.depth].push(path);
  });

  // Create scenarios from paths
  Object.entries(pathsByDepth).forEach(([depth, paths]) => {
    paths.forEach((path, index) => {
      // Build scenario steps from parent path
      const steps = [];
      let stepNum = 1;

      // Add navigation steps from parent path
      path.parentPath.forEach(parent => {
        steps.push({
          number: stepNum++,
          action: parent.action
        });
      });

      // Add final page interaction
      steps.push({
        number: stepNum++,
        action: `Navigate to "${path.title}"`
      });

      // Add element interactions
      path.elements.slice(0, 3).forEach(el => {
        if (el.type === 'link') {
          steps.push({
            number: stepNum++,
            action: `Verify link "${el.text}" exists`
          });
        } else if (el.type === 'button') {
          steps.push({
            number: stepNum++,
            action: `Verify button "${el.text}" is clickable`
          });
        }
      });

      scenarios.push({
        suiteId,
        title: `Otonom Keşif: ${path.title} (Seviye ${depth})`,
        description: `URL: ${path.url}\nOtomatik olarak keşfedildi. ${path.elements.length} etkileşimli element bulundu.`,
        steps,
        expectedResult: 'Sayfa başarıyla yüklenir ve tüm elementler erişilebilir olur',
        priority: depth === 0 ? 'HIGH' : depth === 1 ? 'MEDIUM' : 'LOW',
        automationType: 'UI',
      });
    });
  });

  // Limit to reasonable number
  return scenarios.slice(0, 20);
}
