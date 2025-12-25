/**
 * Mobile-Specific Smart Actions for Playwright
 *
 * Touch gestures, swipe, pinch, scroll with Vision fallback
 * Works with Nexus QA's multi-layer architecture
 */

import { generateSelectorWithVision } from '../../src/services/aiSelectorService.js';

/**
 * Smart Tap - Mobile equivalent of click with touch event
 * Includes Vision fallback for hidden/hard-to-find elements
 */
export async function smartTap(page, selector, options = {}) {
  const { retryWithVision = true, timeout = 5000, force = false } = options;

  console.log(`[SmartTap] Attempting to tap: ${selector}`);

  try {
    // Try direct tap first
    const element = page.locator(selector).first();
    await element.tap({ timeout, force });
    console.log(`[SmartTap] ✓ Direct tap successful`);
    return { success: true, method: 'direct-tap' };
  } catch (directError) {
    console.log(`[SmartTap] ✗ Direct tap failed: ${directError.message}`);

    if (!retryWithVision) {
      throw directError;
    }

    // Vision fallback
    console.log(`[SmartTap] 🔄 Retrying with Vision AI...`);
    try {
      const screenshot = await page.screenshot({ fullPage: false });
      const visionResult = await generateSelectorWithVision(
        screenshot,
        `Find the element to tap: ${selector}`
      );

      if (visionResult.coordinates) {
        const { x, y } = visionResult.coordinates;
        console.log(`[SmartTap] 📍 Vision found coordinates: (${x}, ${y})`);

        // Perform tap at coordinates
        await page.touchscreen.tap(x, y);
        console.log(`[SmartTap] ✓ Vision-based tap successful`);

        return {
          success: true,
          method: 'vision-tap',
          coordinates: { x, y },
          confidence: visionResult.confidence
        };
      }
    } catch (visionError) {
      console.log(`[SmartTap] ✗ Vision fallback failed: ${visionError.message}`);
      throw new Error(`SmartTap failed: ${directError.message} | Vision: ${visionError.message}`);
    }
  }
}

/**
 * Smart Swipe - Swipe gesture (left, right, up, down)
 */
export async function smartSwipe(page, direction, options = {}) {
  const {
    distance = 300,
    duration = 300,
    startX,
    startY,
    element
  } = options;

  console.log(`[SmartSwipe] Swiping ${direction}`);

  try {
    // Get start position
    let fromX, fromY;

    if (element) {
      // Swipe from specific element
      const box = await page.locator(element).boundingBox();
      fromX = box.x + box.width / 2;
      fromY = box.y + box.height / 2;
    } else if (startX !== undefined && startY !== undefined) {
      // Swipe from specific coordinates
      fromX = startX;
      fromY = startY;
    } else {
      // Swipe from center of viewport
      const viewport = page.viewportSize();
      fromX = viewport.width / 2;
      fromY = viewport.height / 2;
    }

    // Calculate end position based on direction
    let toX = fromX;
    let toY = fromY;

    switch (direction.toLowerCase()) {
      case 'left':
        toX = fromX - distance;
        break;
      case 'right':
        toX = fromX + distance;
        break;
      case 'up':
        toY = fromY - distance;
        break;
      case 'down':
        toY = fromY + distance;
        break;
      default:
        throw new Error(`Invalid swipe direction: ${direction}. Use: left, right, up, down`);
    }

    // Perform swipe gesture
    await page.touchscreen.tap(fromX, fromY); // Touch down
    await page.mouse.move(toX, toY, { steps: Math.ceil(duration / 10) }); // Swipe
    await page.touchscreen.tap(toX, toY); // Touch up

    console.log(`[SmartSwipe] ✓ Swipe ${direction} successful: (${fromX}, ${fromY}) → (${toX}, ${toY})`);

    return {
      success: true,
      direction,
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY }
    };
  } catch (error) {
    console.log(`[SmartSwipe] ✗ Swipe failed: ${error.message}`);
    throw error;
  }
}

/**
 * Smart Scroll - Scroll to element or position on mobile
 */
export async function smartScrollMobile(page, target, options = {}) {
  const { direction = 'down', maxScrolls = 10 } = options;

  console.log(`[SmartScrollMobile] Scrolling to find: ${target}`);

  try {
    // If target is a selector, scroll until element is visible
    if (typeof target === 'string') {
      for (let i = 0; i < maxScrolls; i++) {
        const isVisible = await page.locator(target).first().isVisible().catch(() => false);

        if (isVisible) {
          console.log(`[SmartScrollMobile] ✓ Element found after ${i} scrolls`);
          await page.locator(target).first().scrollIntoViewIfNeeded();
          return { success: true, scrolls: i };
        }

        // Swipe to continue scrolling
        await smartSwipe(page, direction === 'down' ? 'up' : 'down', { distance: 400 });
        await page.waitForTimeout(300);
      }

      throw new Error(`Element not found after ${maxScrolls} scrolls`);
    }

    // If target is a number, scroll to specific position
    if (typeof target === 'number') {
      await page.evaluate((y) => window.scrollTo(0, y), target);
      console.log(`[SmartScrollMobile] ✓ Scrolled to position: ${target}px`);
      return { success: true, position: target };
    }

    throw new Error('Invalid scroll target. Use selector string or Y position number.');
  } catch (error) {
    console.log(`[SmartScrollMobile] ✗ Scroll failed: ${error.message}`);
    throw error;
  }
}

/**
 * Smart Long Press - Long press gesture (hold tap)
 */
export async function smartLongPress(page, selector, options = {}) {
  const { duration = 1000, retryWithVision = true } = options;

  console.log(`[SmartLongPress] Long pressing: ${selector}`);

  try {
    // Get element coordinates
    const box = await page.locator(selector).first().boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Perform long press
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(duration);
    await page.mouse.up();

    console.log(`[SmartLongPress] ✓ Long press successful (${duration}ms)`);
    return { success: true, duration };
  } catch (directError) {
    console.log(`[SmartLongPress] ✗ Direct long press failed: ${directError.message}`);

    if (!retryWithVision) {
      throw directError;
    }

    // Vision fallback
    console.log(`[SmartLongPress] 🔄 Retrying with Vision AI...`);
    try {
      const screenshot = await page.screenshot({ fullPage: false });
      const visionResult = await generateSelectorWithVision(
        screenshot,
        `Find the element for long press: ${selector}`
      );

      if (visionResult.coordinates) {
        const { x, y } = visionResult.coordinates;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.waitForTimeout(duration);
        await page.mouse.up();

        console.log(`[SmartLongPress] ✓ Vision-based long press successful`);
        return {
          success: true,
          method: 'vision-long-press',
          coordinates: { x, y },
          duration
        };
      }
    } catch (visionError) {
      console.log(`[SmartLongPress] ✗ Vision fallback failed: ${visionError.message}`);
      throw new Error(`SmartLongPress failed: ${directError.message} | Vision: ${visionError.message}`);
    }
  }
}

/**
 * Smart Pinch - Pinch to zoom gesture
 */
export async function smartPinch(page, type = 'in', options = {}) {
  const { scale = 0.5, centerX, centerY } = options;

  console.log(`[SmartPinch] Pinch ${type}`);

  try {
    // Get center point
    const viewport = page.viewportSize();
    const cx = centerX ?? viewport.width / 2;
    const cy = centerY ?? viewport.height / 2;

    // Calculate touch points for pinch gesture
    const distance = type === 'in' ? 200 : 50;
    const endDistance = type === 'in' ? 50 : 200;

    // First touch point (left)
    const touch1Start = { x: cx - distance, y: cy };
    const touch1End = { x: cx - endDistance, y: cy };

    // Second touch point (right)
    const touch2Start = { x: cx + distance, y: cy };
    const touch2End = { x: cx + endDistance, y: cy };

    // Simulate pinch gesture (simplified - Playwright doesn't have native multi-touch)
    // This uses JavaScript to dispatch touch events
    await page.evaluate(({ t1s, t1e, t2s, t2e, duration }) => {
      // Touch start
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 1, target: document.body, clientX: t1s.x, clientY: t1s.y }),
          new Touch({ identifier: 2, target: document.body, clientX: t2s.x, clientY: t2s.y })
        ]
      });
      document.body.dispatchEvent(touchStart);

      // Touch move (animate)
      setTimeout(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            new Touch({ identifier: 1, target: document.body, clientX: t1e.x, clientY: t1e.y }),
            new Touch({ identifier: 2, target: document.body, clientX: t2e.x, clientY: t2e.y })
          ]
        });
        document.body.dispatchEvent(touchMove);
      }, duration / 2);

      // Touch end
      setTimeout(() => {
        const touchEnd = new TouchEvent('touchend', { touches: [] });
        document.body.dispatchEvent(touchEnd);
      }, duration);
    }, {
      t1s: touch1Start,
      t1e: touch1End,
      t2s: touch2Start,
      t2e: touch2End,
      duration: 300
    });

    console.log(`[SmartPinch] ✓ Pinch ${type} successful`);
    return { success: true, type, center: { x: cx, y: cy } };
  } catch (error) {
    console.log(`[SmartPinch] ✗ Pinch failed: ${error.message}`);
    throw error;
  }
}

/**
 * Smart Fill Mobile - Mobile-optimized form filling
 */
export async function smartFillMobile(page, selector, value, options = {}) {
  const { retryWithVision = true } = options;

  console.log(`[SmartFillMobile] Filling mobile input: ${selector} = ${value}`);

  try {
    // Tap to focus
    await smartTap(page, selector, { retryWithVision });

    // Wait for keyboard to appear (mobile simulation)
    await page.waitForTimeout(300);

    // Fill value
    await page.locator(selector).first().fill(value);

    // Optional: Dismiss keyboard (tap outside)
    // await page.touchscreen.tap(10, 10);

    console.log(`[SmartFillMobile] ✓ Mobile fill successful`);
    return { success: true, value };
  } catch (error) {
    console.log(`[SmartFillMobile] ✗ Mobile fill failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check if viewport is mobile
 */
export function isMobileViewport(page) {
  const viewport = page.viewportSize();
  return viewport && viewport.width < 768;
}

/**
 * Rotate device (landscape/portrait)
 */
export async function rotateDevice(page, orientation = 'landscape') {
  console.log(`[RotateDevice] Rotating to ${orientation}`);

  const currentViewport = page.viewportSize();
  const newViewport = {
    width: orientation === 'landscape' ? Math.max(currentViewport.width, currentViewport.height) : Math.min(currentViewport.width, currentViewport.height),
    height: orientation === 'landscape' ? Math.min(currentViewport.width, currentViewport.height) : Math.max(currentViewport.width, currentViewport.height)
  };

  await page.setViewportSize(newViewport);
  console.log(`[RotateDevice] ✓ Rotated to ${orientation}: ${newViewport.width}x${newViewport.height}`);

  return { success: true, orientation, viewport: newViewport };
}

/**
 * Wait for mobile animation to complete
 */
export async function waitForMobileAnimation(page, duration = 500) {
  await page.waitForTimeout(duration);
  console.log(`[WaitForMobileAnimation] ✓ Waited ${duration}ms for animation`);
}

export default {
  smartTap,
  smartSwipe,
  smartScrollMobile,
  smartLongPress,
  smartPinch,
  smartFillMobile,
  isMobileViewport,
  rotateDevice,
  waitForMobileAnimation
};
