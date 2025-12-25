/**
 * Cloud Provider Configurations for Distributed Test Execution
 *
 * Nexus QA - Cloud Execution Support
 * Integrations: BrowserStack, Sauce Labs, LambdaTest
 */

export const CLOUD_PROVIDERS = {
  BROWSERSTACK: 'browserstack',
  SAUCELABS: 'saucelabs',
  LAMBDATEST: 'lambdatest',
  LOCAL: 'local'
};

/**
 * BrowserStack Configuration
 * https://www.browserstack.com/automate
 */
export const browserstackConfig = {
  name: 'BrowserStack',
  hub: 'https://hub-cloud.browserstack.com/wd/hub',
  capabilities: {
    'bstack:options': {
      userName: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
      projectName: 'Nexus QA',
      buildName: `Build-${Date.now()}`,
      sessionName: 'Nexus QA Test Session',
      local: false,
      seleniumVersion: '4.0.0',
      // Cloud features
      video: true,
      networkLogs: true,
      consoleLogs: 'verbose',
      debug: true
    }
  },
  browsers: [
    // Desktop browsers
    { browserName: 'chrome', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { browserName: 'firefox', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { browserName: 'edge', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { browserName: 'safari', browserVersion: 'latest', os: 'OS X', osVersion: 'Ventura' },
    // Mobile browsers
    { deviceName: 'iPhone 15 Pro', osVersion: '17', browserName: 'safari' },
    { deviceName: 'Samsung Galaxy S24', osVersion: '14.0', browserName: 'chrome' },
    { deviceName: 'Google Pixel 8', osVersion: '14.0', browserName: 'chrome' }
  ],
  parallelSessions: 5, // Based on subscription plan
  pricing: {
    perMinute: 0.05, // $0.05 per minute
    tier: 'automate-pro'
  }
};

/**
 * Sauce Labs Configuration
 * https://saucelabs.com/
 */
export const sauceLabsConfig = {
  name: 'Sauce Labs',
  hub: 'https://ondemand.us-west-1.saucelabs.com:443/wd/hub',
  capabilities: {
    'sauce:options': {
      username: process.env.SAUCE_USERNAME,
      accessKey: process.env.SAUCE_ACCESS_KEY,
      name: 'Nexus QA Test',
      build: `Build-${Date.now()}`,
      // Cloud features
      recordVideo: true,
      recordScreenshots: true,
      capturePerformance: true,
      extendedDebugging: true
    }
  },
  browsers: [
    // Desktop browsers
    { browserName: 'chrome', browserVersion: 'latest', platformName: 'Windows 11' },
    { browserName: 'firefox', browserVersion: 'latest', platformName: 'Windows 11' },
    { browserName: 'MicrosoftEdge', browserVersion: 'latest', platformName: 'Windows 11' },
    { browserName: 'safari', browserVersion: 'latest', platformName: 'macOS 13' },
    // Mobile browsers
    { deviceName: 'iPhone 15 Pro Simulator', platformName: 'iOS', platformVersion: '17.0', browserName: 'safari' },
    { deviceName: 'Samsung Galaxy S24 GoogleAPI Emulator', platformName: 'Android', platformVersion: '14.0', browserName: 'chrome' }
  ],
  parallelSessions: 10, // Based on subscription plan
  pricing: {
    perMinute: 0.04, // $0.04 per minute
    tier: 'team-plan'
  }
};

/**
 * LambdaTest Configuration
 * https://www.lambdatest.com/
 */
export const lambdaTestConfig = {
  name: 'LambdaTest',
  hub: 'https://hub.lambdatest.com/wd/hub',
  capabilities: {
    'LT:Options': {
      username: process.env.LAMBDATEST_USERNAME,
      accessKey: process.env.LAMBDATEST_ACCESS_KEY,
      project: 'Nexus QA',
      build: `Build-${Date.now()}`,
      name: 'Nexus QA Test',
      // Cloud features
      video: true,
      network: true,
      console: true,
      visual: true,
      w3c: true
    }
  },
  browsers: [
    // Desktop browsers
    { browserName: 'Chrome', version: 'latest', platform: 'Windows 11' },
    { browserName: 'Firefox', version: 'latest', platform: 'Windows 11' },
    { browserName: 'MicrosoftEdge', version: 'latest', platform: 'Windows 11' },
    { browserName: 'Safari', version: 'latest', platform: 'macOS Sonoma' },
    // Mobile browsers
    { deviceName: 'iPhone 15 Pro', platformVersion: '17', platformName: 'iOS', browserName: 'Safari' },
    { deviceName: 'Galaxy S24', platformVersion: '14', platformName: 'Android', browserName: 'Chrome' }
  ],
  parallelSessions: 10, // Based on subscription plan
  pricing: {
    perMinute: 0.03, // $0.03 per minute (most affordable)
    tier: 'web-automation'
  }
};

/**
 * Get cloud provider configuration
 */
export function getCloudProviderConfig(provider) {
  switch (provider) {
    case CLOUD_PROVIDERS.BROWSERSTACK:
      return browserstackConfig;
    case CLOUD_PROVIDERS.SAUCELABS:
      return sauceLabsConfig;
    case CLOUD_PROVIDERS.LAMBDATEST:
      return lambdaTestConfig;
    default:
      throw new Error(`Unknown cloud provider: ${provider}`);
  }
}

/**
 * Get Playwright configuration for cloud provider
 */
export function getPlaywrightCloudConfig(provider, browser = 'chromium') {
  const config = getCloudProviderConfig(provider);

  return {
    use: {
      connectOptions: {
        wsEndpoint: config.hub.replace('/wd/hub', '/playwright'),
        capabilities: {
          ...config.capabilities,
          browserName: browser
        }
      }
    }
  };
}

/**
 * Calculate estimated cost for test execution
 */
export function calculateExecutionCost(provider, durationMinutes, parallelSessions = 1) {
  const config = getCloudProviderConfig(provider);
  const totalMinutes = durationMinutes * parallelSessions;
  const cost = totalMinutes * config.pricing.perMinute;

  return {
    provider: config.name,
    durationMinutes,
    parallelSessions,
    totalMinutes,
    costPerMinute: config.pricing.perMinute,
    totalCost: cost.toFixed(2),
    tier: config.pricing.tier
  };
}

/**
 * Get recommended cloud provider based on requirements
 */
export function getRecommendedProvider(requirements = {}) {
  const { budget = 'medium', parallelSessions = 5, features = [] } = requirements;

  // Budget-conscious: LambdaTest ($0.03/min)
  if (budget === 'low') {
    return CLOUD_PROVIDERS.LAMBDATEST;
  }

  // Premium features: BrowserStack
  if (features.includes('advanced-debugging') || features.includes('real-devices')) {
    return CLOUD_PROVIDERS.BROWSERSTACK;
  }

  // High parallel sessions: Sauce Labs (10 sessions)
  if (parallelSessions > 5) {
    return CLOUD_PROVIDERS.SAUCELABS;
  }

  // Default: LambdaTest (best value)
  return CLOUD_PROVIDERS.LAMBDATEST;
}

/**
 * Validate cloud provider credentials
 */
export async function validateCloudCredentials(provider) {
  const config = getCloudProviderConfig(provider);

  // Check if credentials are configured
  const hasCredentials =
    (provider === CLOUD_PROVIDERS.BROWSERSTACK && process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY) ||
    (provider === CLOUD_PROVIDERS.SAUCELABS && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) ||
    (provider === CLOUD_PROVIDERS.LAMBDATEST && process.env.LAMBDATEST_USERNAME && process.env.LAMBDATEST_ACCESS_KEY);

  if (!hasCredentials) {
    throw new Error(`Missing credentials for ${config.name}. Please configure environment variables.`);
  }

  return {
    valid: true,
    provider: config.name,
    parallelSessions: config.parallelSessions
  };
}

/**
 * Get all available browsers across all providers
 */
export function getAllCloudBrowsers() {
  return {
    browserstack: browserstackConfig.browsers,
    saucelabs: sauceLabsConfig.browsers,
    lambdatest: lambdaTestConfig.browsers
  };
}

/**
 * Compare pricing across providers
 */
export function comparePricing(durationMinutes = 60, parallelSessions = 5) {
  return {
    browserstack: calculateExecutionCost(CLOUD_PROVIDERS.BROWSERSTACK, durationMinutes, parallelSessions),
    saucelabs: calculateExecutionCost(CLOUD_PROVIDERS.SAUCELABS, durationMinutes, parallelSessions),
    lambdatest: calculateExecutionCost(CLOUD_PROVIDERS.LAMBDATEST, durationMinutes, parallelSessions)
  };
}

export default {
  CLOUD_PROVIDERS,
  browserstackConfig,
  sauceLabsConfig,
  lambdaTestConfig,
  getCloudProviderConfig,
  getPlaywrightCloudConfig,
  calculateExecutionCost,
  getRecommendedProvider,
  validateCloudCredentials,
  getAllCloudBrowsers,
  comparePricing
};
