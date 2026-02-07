#!/usr/bin/env tsx

/**
 * Rate Limit Verification Script
 *
 * Verifies that all configured AI features have rate limit protection in production.
 * Uses grep to reliably find checkRateLimit calls across server actions.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface RateLimitFeature {
  name: string;
  limit: number;
}

interface VerificationResult {
  configuredFeatures: RateLimitFeature[];
  protectedFeatures: Map<string, string>;
  unprotectedFeatures: string[];
}

function readConfiguredFeatures(): RateLimitFeature[] {
  const configPath = path.join(
    process.cwd(),
    'src/lib/rate-limit-config.ts'
  );
  const content = fs.readFileSync(configPath, 'utf-8');

  const features: RateLimitFeature[] = [];

  // Parse DAILY_RATE_LIMITS constant
  const limitsMatch = content.match(/export\s+const\s+DAILY_RATE_LIMITS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/);
  if (limitsMatch) {
    const limitsStr = limitsMatch[1];
    // Extract each feature and its limit
    const featureMatches = limitsStr.match(/(\w+):\s*\{[\s\S]*?limit:\s*(\d+)/g) || [];
    featureMatches.forEach(match => {
      const featureMatch = match.match(/(\w+):\s*\{[\s\S]*?limit:\s*(\d+)/);
      if (featureMatch) {
        const [, featureName, limitStr] = featureMatch;
        features.push({
          name: featureName,
          limit: parseInt(limitStr, 10),
        });
      }
    });
  }

  return features;
}

function findProtectedFeatures(): Map<string, string> {
  const protected_ = new Map<string, string>();

  try {
    // Search for checkRateLimit calls with feature names
    const output = execSync(
      'grep -rE \'checkRateLimit.*"[a-zA-Z]+"\' src/app --include="*.ts" --include="*.tsx" 2>/dev/null || true',
      { encoding: 'utf-8' }
    );

    const lines = output.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      // Match pattern: checkRateLimit(userId, "featureName")
      const match = line.match(/checkRateLimit\s*\(\s*\w+\s*,\s*["\'](\w+)["\']/);
      if (match) {
        const featureName = match[1];
        const file = line.split(':')[0];
        protected_.set(featureName, file);
      }
    });
  } catch (error) {
    // grep might fail if no matches found
  }

  return protected_;
}

async function main() {
  try {
    console.log('🔐 Rate Limit Configuration Verification');
    console.log('════'.repeat(15));

    const configured = readConfiguredFeatures();
    const protected_ = findProtectedFeatures();

    console.log('\n📊 Configured AI Features:');
    console.log('────'.repeat(15));
    configured.forEach(feature => {
      console.log(`  ${feature.name}: ${feature.limit}/day`);
    });

    console.log('\n🔍 Rate Limit Protection Status:');
    console.log('────'.repeat(15));

    const unprotected: string[] = [];
    let protectedCount = 0;

    configured.forEach(feature => {
      const file = protected_.get(feature.name);
      if (file) {
        console.log(`  ✅ ${feature.name}`);
        console.log(`     Protected in: ${path.relative(process.cwd(), file)}`);
        protectedCount++;
      } else {
        console.log(`  ❌ ${feature.name}`);
        console.log(`     NOT PROTECTED - Missing checkRateLimit call`);
        unprotected.push(feature.name);
      }
    });

    console.log('\n════'.repeat(15));
    const coverage = Math.round((protectedCount / configured.length) * 100);
    console.log(`📈 Coverage: ${protectedCount}/${configured.length} (${coverage}%)`);

    if (unprotected.length > 0) {
      console.log('\n❌ Issues found:');
      unprotected.forEach(name => {
        console.log(`  - ${name} is not rate-limited`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All configured AI features are rate-limited!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
