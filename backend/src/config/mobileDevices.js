/**
 * Mobile Device Presets for Playwright Testing
 *
 * Nexus QA - Mobile Testing Support
 * Comprehensive device emulation for iOS and Android
 */

export const MOBILE_DEVICES = {
  // ==================== iOS DEVICES ====================
  'iPhone 15 Pro Max': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'premium-flagship'
  },
  'iPhone 15 Pro': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'premium-flagship'
  },
  'iPhone 15': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'flagship'
  },
  'iPhone 14 Pro': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'flagship'
  },
  'iPhone 13': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'flagship'
  },
  'iPhone SE': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'budget'
  },
  'iPad Pro 12.9': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'tablet'
  },
  'iPad Air': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'ios',
    category: 'tablet'
  },

  // ==================== ANDROID DEVICES ====================
  'Samsung Galaxy S24 Ultra': {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3.5,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'premium-flagship'
  },
  'Samsung Galaxy S23': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'flagship'
  },
  'Google Pixel 8 Pro': {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'premium-flagship'
  },
  'Google Pixel 7': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'flagship'
  },
  'OnePlus 11': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 919 },
    deviceScaleFactor: 3.5,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'flagship'
  },
  'Xiaomi 13 Pro': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; 2210132C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'flagship'
  },
  'Samsung Galaxy A54': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'mid-range'
  },
  'Samsung Galaxy A34': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A346B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'budget'
  },
  'Samsung Galaxy Tab S9': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'android',
    category: 'tablet'
  },

  // ==================== GENERIC PRESETS ====================
  'Mobile Small (320px)': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'generic',
    category: 'responsive-test'
  },
  'Mobile Medium (375px)': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'generic',
    category: 'responsive-test'
  },
  'Mobile Large (414px)': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    platform: 'generic',
    category: 'responsive-test'
  },
  'Tablet (768px)': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    platform: 'generic',
    category: 'responsive-test'
  }
};

/**
 * Get device configuration by name
 */
export function getDeviceConfig(deviceName) {
  const device = MOBILE_DEVICES[deviceName];
  if (!device) {
    throw new Error(`Device "${deviceName}" not found. Available devices: ${Object.keys(MOBILE_DEVICES).join(', ')}`);
  }
  return device;
}

/**
 * Get devices by platform
 */
export function getDevicesByPlatform(platform) {
  return Object.entries(MOBILE_DEVICES)
    .filter(([_, config]) => config.platform === platform)
    .reduce((acc, [name, config]) => {
      acc[name] = config;
      return acc;
    }, {});
}

/**
 * Get devices by category
 */
export function getDevicesByCategory(category) {
  return Object.entries(MOBILE_DEVICES)
    .filter(([_, config]) => config.category === category)
    .reduce((acc, [name, config]) => {
      acc[name] = config;
      return acc;
    }, {});
}

/**
 * Get recommended test device matrix (covers most use cases)
 */
export function getRecommendedTestMatrix() {
  return [
    'iPhone 15 Pro',           // Latest iOS flagship
    'iPhone SE',               // iOS budget device
    'iPad Air',                // iOS tablet
    'Samsung Galaxy S24 Ultra', // Latest Android flagship
    'Samsung Galaxy A54',      // Android mid-range
    'Google Pixel 8 Pro'       // Pure Android experience
  ];
}

/**
 * Get device list grouped by platform
 */
export function getDeviceListGrouped() {
  const grouped = {
    ios: [],
    android: [],
    generic: []
  };

  Object.entries(MOBILE_DEVICES).forEach(([name, config]) => {
    grouped[config.platform].push({ name, ...config });
  });

  return grouped;
}

export default MOBILE_DEVICES;
