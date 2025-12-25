/**
 * Responsive Design Validation Utilities
 *
 * Cross-device UI validation for mobile, tablet, desktop
 * Nexus QA - Mobile Testing Support
 */

/**
 * Common responsive breakpoints
 */
export const BREAKPOINTS = {
  mobile: {
    small: 320,
    medium: 375,
    large: 414
  },
  tablet: {
    small: 768,
    large: 1024
  },
  desktop: {
    small: 1280,
    medium: 1440,
    large: 1920
  }
};

/**
 * Check if element is visible at current viewport
 */
export async function isElementVisibleAtViewport(page, selector) {
  try {
    const element = page.locator(selector).first();
    const isVisible = await element.isVisible();
    const viewport = page.viewportSize();

    return {
      visible: isVisible,
      viewport: `${viewport.width}x${viewport.height}`,
      selector
    };
  } catch (error) {
    return {
      visible: false,
      viewport: `${page.viewportSize().width}x${page.viewportSize().height}`,
      selector,
      error: error.message
    };
  }
}

/**
 * Test element visibility across multiple viewports
 */
export async function testElementAcrossViewports(page, selector, viewports = []) {
  const results = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500); // Wait for reflow

    const result = await isElementVisibleAtViewport(page, selector);
    results.push({
      ...result,
      ...viewport,
      passed: result.visible
    });
  }

  return {
    selector,
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results
  };
}

/**
 * Validate responsive layout (no horizontal scroll, etc.)
 */
export async function validateResponsiveLayout(page) {
  const viewport = page.viewportSize();

  const metrics = await page.evaluate(() => {
    return {
      // Check for horizontal scroll
      hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,

      // Check viewport meta tag
      hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
      viewportContent: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),

      // Check for fixed-width elements that might cause overflow
      bodyWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth
    };
  });

  const issues = [];

  if (metrics.hasHorizontalScroll) {
    issues.push(`Horizontal scroll detected: scrollWidth (${metrics.scrollWidth}) > clientWidth (${metrics.clientWidth})`);
  }

  if (!metrics.hasViewportMeta) {
    issues.push('Missing viewport meta tag');
  }

  return {
    viewport: `${viewport.width}x${viewport.height}`,
    passed: issues.length === 0,
    issues,
    metrics
  };
}

/**
 * Check if element has responsive font sizes
 */
export async function checkResponsiveFontSizes(page, selector) {
  const fontData = await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;

    const computed = window.getComputedStyle(element);
    return {
      fontSize: computed.fontSize,
      fontSizeUnit: computed.fontSize.match(/[a-z]+$/)?.[0],
      lineHeight: computed.lineHeight,
      isRelative: computed.fontSize.match(/[a-z]+$/)?.[0] === 'rem' ||
                  computed.fontSize.match(/[a-z]+$/)?.[0] === 'em' ||
                  computed.fontSize.match(/[a-z]+$/)?.[0] === '%'
    };
  }, selector);

  if (!fontData) {
    return { found: false, selector };
  }

  return {
    found: true,
    selector,
    fontSize: fontData.fontSize,
    unit: fontData.fontSizeUnit,
    isResponsive: fontData.isRelative,
    recommendation: fontData.isRelative ?
      'Using relative units - Good!' :
      'Consider using rem/em for responsive typography'
  };
}

/**
 * Validate touch target sizes (min 44x44px for mobile)
 */
export async function validateTouchTargets(page, selectors = []) {
  const MIN_TOUCH_SIZE = 44; // Apple HIG & Material Design recommendation

  const results = [];

  for (const selector of selectors) {
    const sizeData = await page.evaluate((sel, minSize) => {
      const elements = document.querySelectorAll(sel);
      const issues = [];

      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);

        const totalWidth = rect.width + paddingLeft + paddingRight;
        const totalHeight = rect.height + paddingTop + paddingBottom;

        if (totalWidth < minSize || totalHeight < minSize) {
          issues.push({
            index,
            width: Math.round(totalWidth),
            height: Math.round(totalHeight),
            passed: false,
            message: `Touch target too small: ${Math.round(totalWidth)}x${Math.round(totalHeight)}px (min: ${minSize}x${minSize}px)`
          });
        } else {
          issues.push({
            index,
            width: Math.round(totalWidth),
            height: Math.round(totalHeight),
            passed: true
          });
        }
      });

      return issues;
    }, selector, MIN_TOUCH_SIZE);

    results.push({
      selector,
      elements: sizeData.length,
      passed: sizeData.every(d => d.passed),
      failed: sizeData.filter(d => !d.passed).length,
      details: sizeData
    });
  }

  return {
    minTouchSize: MIN_TOUCH_SIZE,
    totalSelectors: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results
  };
}

/**
 * Test responsive images (check srcset, picture element)
 */
export async function validateResponsiveImages(page) {
  const imageData = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const results = [];

    images.forEach((img, index) => {
      const hasSrcset = !!img.getAttribute('srcset');
      const hasPicture = img.parentElement?.tagName === 'PICTURE';
      const hasAlt = !!img.getAttribute('alt');
      const isLazy = img.loading === 'lazy';

      results.push({
        index,
        src: img.src,
        hasSrcset,
        hasPicture,
        hasAlt,
        isLazy,
        isResponsive: hasSrcset || hasPicture,
        score: [hasSrcset || hasPicture, hasAlt, isLazy].filter(Boolean).length
      });
    });

    return results;
  });

  return {
    totalImages: imageData.length,
    responsive: imageData.filter(i => i.isResponsive).length,
    withAlt: imageData.filter(i => i.hasAlt).length,
    lazy: imageData.filter(i => i.isLazy).length,
    recommendations: imageData
      .filter(i => !i.isResponsive)
      .map(i => `Image ${i.index + 1}: Consider adding srcset or using <picture> element`),
    images: imageData
  };
}

/**
 * Full responsive audit
 */
export async function runResponsiveAudit(page, options = {}) {
  const {
    viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1440, height: 900, name: 'Desktop' }
    ],
    checkImages = true,
    checkTouchTargets = true,
    touchTargetSelectors = ['button', 'a', '[role="button"]']
  } = options;

  const results = {
    timestamp: new Date().toISOString(),
    viewports: {},
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0
    }
  };

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);

    const viewportResults = {
      name: viewport.name,
      size: `${viewport.width}x${viewport.height}`,
      layout: await validateResponsiveLayout(page),
      issues: []
    };

    if (checkImages) {
      viewportResults.images = await validateResponsiveImages(page);
    }

    if (checkTouchTargets && viewport.width < 768) {
      viewportResults.touchTargets = await validateTouchTargets(page, touchTargetSelectors);
      if (viewportResults.touchTargets.failed > 0) {
        viewportResults.issues.push(`${viewportResults.touchTargets.failed} touch targets below minimum size`);
      }
    }

    if (!viewportResults.layout.passed) {
      viewportResults.issues.push(...viewportResults.layout.issues);
    }

    results.viewports[viewport.name] = viewportResults;
    results.summary.totalIssues += viewportResults.issues.length;
  }

  results.summary.passed = results.summary.totalIssues === 0;

  return results;
}

/**
 * Screenshot comparison across viewports
 */
export async function captureResponsiveScreenshots(page, viewports, options = {}) {
  const { fullPage = true, basePath = './screenshots/responsive' } = options;
  const screenshots = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500);

    const timestamp = Date.now();
    const filename = `${basePath}/${viewport.width}x${viewport.height}_${timestamp}.png`;

    await page.screenshot({ path: filename, fullPage });

    screenshots.push({
      viewport,
      filename,
      timestamp
    });
  }

  return screenshots;
}

export default {
  BREAKPOINTS,
  isElementVisibleAtViewport,
  testElementAcrossViewports,
  validateResponsiveLayout,
  checkResponsiveFontSizes,
  validateTouchTargets,
  validateResponsiveImages,
  runResponsiveAudit,
  captureResponsiveScreenshots
};
