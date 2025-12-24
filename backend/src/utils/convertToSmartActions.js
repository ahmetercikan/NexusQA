/**
 * Convert Agent-generated scripts to Smart Actions version
 * Automatically adds smart actions import and converts click/fill calls
 */

/**
 * Convert legacy script to smart actions version
 * @param {string} script - Original script content
 * @returns {string} - Converted script with smart actions
 */
export function convertToSmartActions(script) {
  if (!script) return script;

  // Skip if already using smart actions
  if (script.includes('smartClick') || script.includes('smartActions')) {
    console.log('[convertToSmartActions] Script already uses smart actions');
    return script;
  }

  console.log('[convertToSmartActions] Converting script to smart actions...');

  let convertedScript = script;

  // 1. Add smart actions import after @playwright/test import
  const importPattern = /(import\s+\{[^}]+\}\s+from\s+['"]@playwright\/test['"];)/;
  convertedScript = convertedScript.replace(importPattern, (match, importStatement) => {
    return `${importStatement}\nimport { smartClick, smartFill, smartWaitFor } from '../../helpers/smartActions.js';`;
  });

  // 2. Convert text-based click patterns with visibility check
  // Pattern: entire block from { to }; that includes getByText, visibility check, and click
  const textClickPattern = /\s*\{\s*const allMatches = await page\.getByText\('([^']+)',\s*\{\s*exact:\s*false\s*\}\)\.all\(\);[\s\S]*?let visibleElement[\s\S]*?await visibleElement\.click\(\);[\s\S]*?\};/g;

  convertedScript = convertedScript.replace(textClickPattern, (match, textValue) => {
    return `\n  await smartClick(page, 'text=${textValue}', { retryWithVision: true });`;
  });

  // 3. Convert regular page.click() calls
  convertedScript = convertedScript.replace(
    /await page\.click\((['"`][^'"`]+['"`])\);/g,
    'await smartClick(page, $1, { retryWithVision: true });'
  );

  // 4. Convert page.fill() calls
  convertedScript = convertedScript.replace(
    /await page\.fill\((['"`][^'"`]+['"`]),\s*(['"`][^'"`]+['"`])\);/g,
    'await smartFill(page, $1, $2, { retryWithVision: true });'
  );

  // 5. Convert page.locator().click() calls
  convertedScript = convertedScript.replace(
    /await page\.locator\((['"`][^'"`]+['"`])\)\.first\(\)\.click\(\);/g,
    'await smartClick(page, $1, { retryWithVision: true });'
  );

  // 6. Add runtime self-healing comment in header
  convertedScript = convertedScript.replace(
    /(\/\*\*[\s\S]*?\*\/)/,
    (match) => {
      if (match.includes('Runtime Self-Healing')) return match;
      return match.replace('*/', ' *\n * 🔧 Runtime Self-Healing: Auto-converted to use smart actions with Vision fallback\n */');
    }
  );

  console.log('[convertToSmartActions] ✓ Conversion complete');
  return convertedScript;
}

/**
 * Check if script needs conversion
 * @param {string} script - Script content
 * @returns {boolean} - True if conversion needed
 */
export function needsConversion(script) {
  if (!script) return false;

  // Already has smart actions
  if (script.includes('smartClick') || script.includes('smartActions')) {
    return false;
  }

  // Has patterns that should be converted
  const hasClickPatterns = script.includes('page.click') ||
                          script.includes('page.getByText') ||
                          script.includes('page.locator');
  const hasFillPatterns = script.includes('page.fill');

  return hasClickPatterns || hasFillPatterns;
}

export default {
  convertToSmartActions,
  needsConversion
};
