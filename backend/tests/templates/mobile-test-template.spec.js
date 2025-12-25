/**
 * Mobile Test Template - Nexus QA
 *
 * Comprehensive mobile testing example covering:
 * - Device emulation (iOS/Android)
 * - Touch gestures (tap, swipe, pinch)
 * - Responsive design validation
 * - Orientation testing
 * - Performance testing
 *
 * 🚀 Generated with Nexus QA Mobile Testing
 */

import { test, expect, devices } from '@playwright/test';
import { smartTap, smartSwipe, smartScrollMobile, smartLongPress, smartPinch, smartFillMobile, rotateDevice } from '../helpers/mobileSmartActions.js';
import { runResponsiveAudit, validateTouchTargets, BREAKPOINTS } from '../helpers/responsiveValidation.js';
import { MOBILE_DEVICES, getDeviceConfig, getRecommendedTestMatrix } from '../../src/config/mobileDevices.js';

// ==================== TEST CONFIGURATION ====================

// Test on multiple devices
const testDevices = [
  'iPhone 15 Pro',
  'Samsung Galaxy S24 Ultra',
  'iPad Air',
  'Mobile Medium (375px)' // Generic responsive test
];

// ==================== MOBILE E-COMMERCE TEST SUITE ====================

test.describe('Mobile E-Commerce Tests', () => {
  testDevices.forEach((deviceName) => {
    test.describe(`${deviceName}`, () => {
      let deviceConfig;

      test.beforeEach(async ({ page, context }) => {
        // Get device configuration
        deviceConfig = getDeviceConfig(deviceName);

        // Set viewport and user agent
        await page.setViewportSize(deviceConfig.viewport);
        await context.setExtraHTTPHeaders({
          'User-Agent': deviceConfig.userAgent
        });

        console.log(`[Test] Running on ${deviceName} (${deviceConfig.platform})`);
        console.log(`[Test] Viewport: ${deviceConfig.viewport.width}x${deviceConfig.viewport.height}`);
      });

      test(`Mobile Navigation - ${deviceName}`, async ({ page }) => {
        // Navigate to app
        await page.goto('https://example.com');

        // Test mobile menu (hamburger icon)
        await smartTap(page, '[data-testid="mobile-menu-button"]', {
          retryWithVision: true
        });

        // Wait for menu animation
        await page.waitForTimeout(300);

        // Verify menu opened
        const menuVisible = await page.locator('[data-testid="mobile-menu"]').isVisible();
        expect(menuVisible).toBe(true);

        // Tap on a menu item
        await smartTap(page, 'text=Products', { retryWithVision: true });

        // Verify navigation
        await expect(page).toHaveURL(/products/);
      });

      test(`Mobile Product Search - ${deviceName}`, async ({ page }) => {
        await page.goto('https://example.com');

        // Tap search icon
        await smartTap(page, '[data-testid="search-icon"]', {
          retryWithVision: true
        });

        // Fill search input (mobile optimized)
        await smartFillMobile(
          page,
          '[data-testid="search-input"]',
          'laptop',
          { retryWithVision: true }
        );

        // Tap search button
        await smartTap(page, '[data-testid="search-submit"]', {
          retryWithVision: true
        });

        // Wait for results
        await page.waitForSelector('[data-testid="search-results"]');

        // Verify results loaded
        const resultCount = await page.locator('[data-testid="product-card"]').count();
        expect(resultCount).toBeGreaterThan(0);
      });

      test(`Mobile Scroll and Swipe - ${deviceName}`, async ({ page }) => {
        await page.goto('https://example.com/products');

        // Scroll down to load more products (infinite scroll)
        await smartScrollMobile(page, '[data-testid="load-more-trigger"]', {
          direction: 'down',
          maxScrolls: 5
        });

        // Swipe through product carousel
        await smartSwipe(page, 'left', {
          element: '[data-testid="product-carousel"]',
          distance: 300
        });

        await page.waitForTimeout(500);

        // Swipe back
        await smartSwipe(page, 'right', {
          element: '[data-testid="product-carousel"]',
          distance: 300
        });
      });

      test(`Mobile Add to Cart - ${deviceName}`, async ({ page }) => {
        await page.goto('https://example.com/product/123');

        // Long press on product image to save (if applicable)
        if (deviceConfig.platform === 'ios' || deviceConfig.platform === 'android') {
          await smartLongPress(page, '[data-testid="product-image"]', {
            duration: 800,
            retryWithVision: true
          });

          await page.waitForTimeout(500);
        }

        // Select product size (swipe through options)
        await smartTap(page, '[data-testid="size-selector"]', {
          retryWithVision: true
        });

        await smartSwipe(page, 'left', {
          element: '[data-testid="size-options"]',
          distance: 150
        });

        await smartTap(page, 'text=M', { retryWithVision: true });

        // Add to cart
        await smartTap(page, '[data-testid="add-to-cart-button"]', {
          retryWithVision: true
        });

        // Verify cart updated
        const cartBadge = await page.locator('[data-testid="cart-badge"]').textContent();
        expect(parseInt(cartBadge)).toBeGreaterThan(0);
      });

      test(`Mobile Checkout Flow - ${deviceName}`, async ({ page }) => {
        await page.goto('https://example.com/cart');

        // Proceed to checkout
        await smartTap(page, '[data-testid="checkout-button"]', {
          retryWithVision: true
        });

        // Fill shipping information (mobile form)
        await smartFillMobile(page, '#name', 'John Doe', { retryWithVision: true });
        await smartFillMobile(page, '#email', 'john@example.com', { retryWithVision: true });
        await smartFillMobile(page, '#phone', '+1234567890', { retryWithVision: true });

        // Scroll to address fields
        await smartScrollMobile(page, '#address', { direction: 'down' });

        await smartFillMobile(page, '#address', '123 Main St', { retryWithVision: true });
        await smartFillMobile(page, '#city', 'New York', { retryWithVision: true });

        // Submit
        await smartTap(page, '[data-testid="submit-order"]', {
          retryWithVision: true
        });

        // Verify success
        await expect(page.locator('text=Order Confirmed')).toBeVisible({ timeout: 10000 });
      });

      // Responsive Design Validation
      test(`Responsive Design Audit - ${deviceName}`, async ({ page }) => {
        await page.goto('https://example.com');

        // Run comprehensive responsive audit
        const auditResults = await runResponsiveAudit(page, {
          viewports: [deviceConfig.viewport],
          checkImages: true,
          checkTouchTargets: true,
          touchTargetSelectors: ['button', 'a', '[role="button"]', '[data-testid*="button"]']
        });

        console.log('[Responsive Audit Results]', JSON.stringify(auditResults, null, 2));

        // Assert no critical issues
        expect(auditResults.summary.criticalIssues).toBe(0);

        // Assert layout is responsive
        const layoutResults = auditResults.viewports[Object.keys(auditResults.viewports)[0]].layout;
        expect(layoutResults.passed).toBe(true);

        // If mobile viewport, check touch targets
        if (deviceConfig.viewport.width < 768 && auditResults.viewports[Object.keys(auditResults.viewports)[0]].touchTargets) {
          const touchResults = auditResults.viewports[Object.keys(auditResults.viewports)[0]].touchTargets;
          console.log(`[Touch Targets] ${touchResults.passed} passed, ${touchResults.failed} failed`);

          // Warning if touch targets too small (not blocking)
          if (touchResults.failed > 0) {
            console.warn(`⚠ Warning: ${touchResults.failed} touch targets below 44x44px minimum`);
          }
        }
      });

      // Orientation Testing (for phones/tablets)
      if (deviceConfig.category !== 'responsive-test') {
        test(`Orientation Test - ${deviceName}`, async ({ page }) => {
          await page.goto('https://example.com');

          // Test in portrait (default)
          console.log('[Orientation] Testing Portrait mode');
          let menuVisible = await page.locator('[data-testid="mobile-menu-button"]').isVisible();
          expect(menuVisible).toBe(true);

          // Rotate to landscape
          await rotateDevice(page, 'landscape');
          console.log('[Orientation] Testing Landscape mode');

          // Verify UI adapts to landscape
          await page.waitForTimeout(500);
          menuVisible = await page.locator('[data-testid="mobile-menu-button"]').isVisible();

          // In landscape, some apps might show desktop nav instead
          const hasDesktopNav = await page.locator('[data-testid="desktop-nav"]').isVisible().catch(() => false);
          const hasMobileNav = menuVisible;

          expect(hasDesktopNav || hasMobileNav).toBe(true);

          // Rotate back to portrait
          await rotateDevice(page, 'portrait');
          console.log('[Orientation] Rotated back to Portrait');

          await page.waitForTimeout(500);
          menuVisible = await page.locator('[data-testid="mobile-menu-button"]').isVisible();
          expect(menuVisible).toBe(true);
        });
      }

      // Pinch to Zoom (if supported)
      if (deviceConfig.platform === 'ios' || deviceConfig.platform === 'android') {
        test(`Pinch to Zoom - ${deviceName}`, async ({ page }) => {
          await page.goto('https://example.com/product/123');

          // Pinch in (zoom in on product image)
          await smartPinch(page, 'in', {
            centerX: deviceConfig.viewport.width / 2,
            centerY: deviceConfig.viewport.height / 3
          });

          await page.waitForTimeout(500);

          // Pinch out (zoom out)
          await smartPinch(page, 'out', {
            centerX: deviceConfig.viewport.width / 2,
            centerY: deviceConfig.viewport.height / 3
          });

          console.log('[Pinch] Zoom gestures completed');
        });
      }
    });
  });
});

// ==================== CROSS-DEVICE COMPARISON TEST ====================

test.describe('Cross-Device Comparison', () => {
  test('Element visibility across devices', async ({ page }) => {
    const testDeviceList = getRecommendedTestMatrix();
    const results = [];

    for (const deviceName of testDeviceList) {
      const config = getDeviceConfig(deviceName);
      await page.setViewportSize(config.viewport);

      await page.goto('https://example.com');

      const mobileMenuVisible = await page.locator('[data-testid="mobile-menu-button"]').isVisible().catch(() => false);
      const desktopNavVisible = await page.locator('[data-testid="desktop-nav"]').isVisible().catch(() => false);

      results.push({
        device: deviceName,
        viewport: `${config.viewport.width}x${config.viewport.height}`,
        platform: config.platform,
        mobileMenu: mobileMenuVisible,
        desktopNav: desktopNavVisible
      });
    }

    console.log('[Cross-Device Results]', JSON.stringify(results, null, 2));

    // Assert mobile devices show mobile menu
    const mobileDevices = results.filter(r => r.platform === 'ios' || r.platform === 'android');
    mobileDevices.forEach(device => {
      expect(device.mobileMenu || device.desktopNav).toBe(true);
    });
  });
});

// ==================== MOBILE PERFORMANCE TEST ====================

test.describe('Mobile Performance', () => {
  test('Page load performance on mobile', async ({ page }) => {
    const deviceConfig = getDeviceConfig('iPhone 15 Pro');
    await page.setViewportSize(deviceConfig.viewport);

    // Simulate 3G network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
      uploadThroughput: (750 * 1024) / 8, // 750 Kbps
      latency: 100 // 100ms RTT
    });

    const startTime = Date.now();
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`[Performance] Page loaded in ${loadTime}ms on 3G`);

    // Assert reasonable load time (adjust based on your app)
    expect(loadTime).toBeLessThan(10000); // 10 seconds on 3G
  });
});
