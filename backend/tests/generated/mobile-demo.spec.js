/**
 * Mobile Testing Demo - Quick Test
 *
 * Simple demo showing mobile device emulation
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Testing Demo', () => {
  // Test on iPhone 15 Pro
  test('iPhone 15 Pro - Visit İşbankası', async ({ page, context }) => {
    // Set iPhone 15 Pro viewport
    await page.setViewportSize({ width: 393, height: 852 });

    // Set iPhone user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });

    console.log('📱 Testing on iPhone 15 Pro (393x852)');

    // Navigate to İşbankası
    await page.goto('https://www.isbank.com.tr', { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('✓ Page loaded');

    // Take screenshot
    await page.screenshot({ path: './screenshots/iphone-15-pro-isbank.png', fullPage: true });
    console.log('✓ Screenshot saved: ./screenshots/iphone-15-pro-isbank.png');

    // Check page loaded
    const title = await page.title();
    console.log(`Page title: ${title}`);

    expect(title).toBeTruthy();
  });

  // Test on Samsung Galaxy S24
  test('Samsung Galaxy S24 Ultra - Visit İşbankası', async ({ page, context }) => {
    // Set Samsung S24 viewport
    await page.setViewportSize({ width: 412, height: 915 });

    // Set Android user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    });

    console.log('📱 Testing on Samsung Galaxy S24 Ultra (412x915)');

    // Navigate to İşbankası
    await page.goto('https://www.isbank.com.tr', { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('✓ Page loaded');

    // Take screenshot
    await page.screenshot({ path: './screenshots/samsung-s24-isbank.png', fullPage: true });
    console.log('✓ Screenshot saved: ./screenshots/samsung-s24-isbank.png');

    // Check responsive layout
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    console.log(`Has horizontal scroll: ${hasHorizontalScroll}`);
    expect(hasHorizontalScroll).toBe(false);
  });

  // Cross-device comparison
  test('Cross-Device Comparison', async ({ page, context }) => {
    const devices = [
      { name: 'iPhone 15 Pro', width: 393, height: 852, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      { name: 'Samsung S24', width: 412, height: 915, ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B)' },
      { name: 'iPad Air', width: 820, height: 1180, ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
    ];

    const results = [];

    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('https://www.isbank.com.tr', { waitUntil: 'domcontentloaded', timeout: 30000 });

      const metrics = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        bodyHeight: document.body.scrollHeight
      }));

      results.push({
        device: device.name,
        viewport: `${device.width}x${device.height}`,
        ...metrics
      });

      console.log(`📱 ${device.name}: ${metrics.viewportWidth}x${metrics.viewportHeight}, Horizontal scroll: ${metrics.hasHorizontalScroll}`);
    }

    console.log('📊 Cross-Device Results:', JSON.stringify(results, null, 2));

    // All devices should render without horizontal scroll
    results.forEach(result => {
      expect(result.hasHorizontalScroll).toBe(false);
    });
  });
});
