#!/usr/bin/env tsx

/**
 * Cache Configuration Verification Script
 *
 * Validates that all unstable_cache calls have proper revalidate parameters.
 * Reads constant definitions to resolve variable references.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CacheConfig {
  line: number;
  variableName: string;
  ttlSeconds?: number;
  ttlVariable?: string;
  tags?: string[];
}

// Extract constant values from the file
function extractConstants(content: string): Record<string, number> {
  const constants: Record<string, number> = {};
  const constRegex = /^const\s+(\w+(?:_\w+)*)\s*=\s*(\d+);?/gm;

  let match;
  while ((match = constRegex.exec(content)) !== null) {
    constants[match[1]] = parseInt(match[2], 10);
  }

  return constants;
}

// Parse cache configurations from exercise-registry.server.ts
function parseCacheConfigs(filePath: string): CacheConfig[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const constants = extractConstants(content);
  const configs: CacheConfig[] = [];

  // Find all unstable_cache declarations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('unstable_cache(')) {
      // Extract variable name from line before (const NAME = unstable_cache)
      const prevLine = lines[i - 1]?.trim() || line;
      const varMatch = prevLine.match(/const\s+(\w+)\s*=/);
      const variableName = varMatch ? varMatch[1] : 'unknown';

      // Look ahead for the configuration
      let fullContent = '';
      let parenDepth = 0;
      let foundEnd = false;

      for (let j = i; j < Math.min(i + 20, lines.length) && !foundEnd; j++) {
        fullContent += lines[j] + '\n';

        for (const char of lines[j]) {
          if (char === '(') parenDepth++;
          if (char === ')') {
            parenDepth--;
            if (parenDepth === 0) foundEnd = true;
          }
        }
      }

      // Extract revalidate value
      const revalidateMatch = fullContent.match(/revalidate:\s*([A-Z_]+|\d+)/);
      let ttlSeconds: number | undefined;
      let ttlVariable: string | undefined;

      if (revalidateMatch) {
        const val = revalidateMatch[1];
        if (/^\d+$/.test(val)) {
          ttlSeconds = parseInt(val, 10);
        } else {
          ttlVariable = val;
          ttlSeconds = constants[val];
        }
      }

      // Extract tags
      const tagsMatch = fullContent.match(/tags:\s*\[(.*?)\]/);
      const tags = tagsMatch
        ? tagsMatch[1]
            .split(',')
            .map(t => t.trim().replace(/['"]/g, ''))
            .filter(t => t.length > 0)
        : undefined;

      configs.push({
        line: i + 1,
        variableName,
        ttlSeconds,
        ttlVariable,
        tags,
      });
    }
  }

  return configs;
}

function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

async function main() {
  try {
    console.log('🔍 Cache Configuration Verification');
    console.log('═'.repeat(60));

    const filePath = path.join(
      process.cwd(),
      'src/lib/exercise-registry.server.ts'
    );

    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      process.exit(1);
    }

    const configs = parseCacheConfigs(filePath);

    if (configs.length === 0) {
      console.log('⚠️  No cache configurations found');
      process.exit(1);
    }

    console.log(`\n📊 Found ${configs.length} cache operations:\n`);

    let hasIssues = false;

    configs.forEach(config => {
      const ttlDisplay = config.ttlSeconds
        ? `${formatTTL(config.ttlSeconds)} (${config.ttlSeconds}s)`
        : config.ttlVariable
          ? `${config.ttlVariable} (resolves to: ${config.ttlSeconds || 'unknown'}s)`
          : 'NOT SET ⚠️';

      const status = config.ttlSeconds ? '✅' : '❌';
      console.log(`${status} ${config.variableName}`);
      console.log(`   Line: ${config.line}`);
      console.log(`   TTL: ${ttlDisplay}`);
      if (config.tags) {
        console.log(`   Tags: [${config.tags.join(', ')}]`);
      }
      console.log('');

      if (!config.ttlSeconds) {
        hasIssues = true;
      }
    });

    console.log('═'.repeat(60));

    if (hasIssues) {
      console.log('❌ Issues found. Cache operations are missing TTL values.');
      process.exit(1);
    } else {
      console.log('✅ All cache operations properly configured!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
