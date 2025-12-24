#!/usr/bin/env node
/**
 * Memory/RAG Analytics Dashboard (CLI)
 * Displays pattern learning statistics
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function displayDashboard(projectId) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🧠 MEMORY/RAG ANALYTICS DASHBOARD                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Fetch analytics
    const response = await fetch(`${API_URL}/api/memory/analytics/${projectId}`);
    const data = await response.json();

    if (!data.success) {
      console.log('❌ Failed to fetch analytics:', data.message);
      return;
    }

    const { overview, distribution, topPatterns, recentlyLearned } = data.analytics;

    // Overview Section
    console.log('📊 OVERVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  Total Patterns Learned:    ${overview.totalPatterns}`);
    console.log(`  Total Successful Uses:     ${overview.totalSuccesses}`);
    console.log(`  Average Confidence:        ${overview.avgConfidence}%`);
    console.log(`  Efficient Patterns (≥5):   ${overview.efficientPatterns}`);
    console.log(`  Efficiency Rate:           ${overview.efficiencyRate}%`);

    // Distribution Section
    console.log('\n\n📈 DISTRIBUTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('  By Locator Type:');
    Object.entries(distribution.byLocatorType).forEach(([type, count]) => {
      const bar = '█'.repeat(Math.min(count * 3, 30));
      console.log(`    ${type.padEnd(20)} ${bar} ${count}`);
    });

    console.log('\n  By Action Type:');
    Object.entries(distribution.byActionType).forEach(([type, count]) => {
      const bar = '█'.repeat(Math.min(count * 3, 30));
      console.log(`    ${type.padEnd(20)} ${bar} ${count}`);
    });

    // Top Patterns Section
    console.log('\n\n🏆 TOP 10 MOST USED PATTERNS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    topPatterns.slice(0, 10).forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern.actionText}`);
      console.log(`     Selector: ${pattern.selector}`);
      console.log(`     Success Count: ${pattern.successCount} | Confidence: ${pattern.confidence}% | Type: ${pattern.locatorType}`);
      console.log(`     Last Used: ${new Date(pattern.lastUsed).toLocaleString()}`);
      console.log('');
    });

    // Recently Learned Section
    console.log('\n📚 RECENTLY LEARNED PATTERNS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    recentlyLearned.slice(0, 5).forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern.actionText}`);
      console.log(`     Selector: ${pattern.selector}`);
      console.log(`     Learned: ${new Date(pattern.learnedAt).toLocaleString()}`);
      console.log('');
    });

    // Performance Insights
    console.log('\n💡 INSIGHTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const avgUsesPerPattern = overview.totalSuccesses / overview.totalPatterns;
    console.log(`  • Average uses per pattern: ${avgUsesPerPattern.toFixed(2)}`);

    const visionPatterns = distribution.byLocatorType['vision'] || distribution.byLocatorType['vision-coordinates'] || 0;
    const visionPercentage = (visionPatterns / overview.totalPatterns) * 100;
    console.log(`  • Vision API usage: ${visionPercentage.toFixed(1)}% of patterns`);

    if (visionPercentage > 0) {
      const potentialSavings = ((100 - visionPercentage) / 100) * overview.totalSuccesses;
      console.log(`  • Estimated Vision API calls saved: ~${Math.round(potentialSavings)}`);
    }

    if (overview.totalPatterns > 0) {
      const learningRate = overview.efficiencyRate;
      if (learningRate > 50) {
        console.log(`  • 🚀 Great! ${learningRate.toFixed(1)}% of patterns are highly efficient`);
      } else if (learningRate > 20) {
        console.log(`  • 📈 Good progress: ${learningRate.toFixed(1)}% patterns becoming efficient`);
      } else {
        console.log(`  • 🌱 System is learning: Keep running tests to improve efficiency`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.log('\n❌ Error fetching analytics:', error.message);
    console.log('\nMake sure the backend is running on', API_URL);
  }
}

// Get project ID from command line or use default
const projectId = process.argv[2] || 2;

console.log(`\nFetching analytics for Project ID: ${projectId}...\n`);
displayDashboard(projectId);
