#!/usr/bin/env tsx

/**
 * Firestore Monitoring Alerts Setup Script
 *
 * Creates Cloud Monitoring alert policies for Firestore read/write/delete operations.
 * Uses built-in GCP Firestore metrics (no custom code needed).
 *
 * Run: npm run setup:firestore-alerts
 * Requires: GCP_PROJECT_ID and authentication via gcloud CLI
 */

import { google } from 'googleapis';

const monitoring = google.monitoring('v3');

// Alert thresholds (daily limits based on Firestore pricing)
const ALERT_CONFIG = {
  reads: {
    threshold: 500_000, // Alert if daily reads > 500k (50% of free tier 1M limit)
    metric: 'firestore.googleapis.com/document/read_count',
    description: 'Daily Firestore reads exceeding 500k',
  },
  writes: {
    threshold: 50_000, // Alert if daily writes > 50k
    metric: 'firestore.googleapis.com/document/write_count',
    description: 'Daily Firestore writes exceeding 50k',
  },
  deletes: {
    threshold: 50_000, // Alert if daily deletes > 50k
    metric: 'firestore.googleapis.com/document/delete_count',
    description: 'Daily Firestore deletes exceeding 50k',
  },
};

interface AlertPolicy {
  displayName: string;
  conditions: Array<{
    displayName: string;
    conditionThreshold: {
      filter: string;
      comparison: string;
      thresholdValue: number;
      duration: string;
      aggregations: Array<{
        alignmentPeriod: string;
        perSeriesAligner: string;
      }>;
    };
  }>;
  notificationChannels: string[];
  alertStrategy: {
    autoClose: string;
  };
}

async function getProjectId(): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error(
      'GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable not set. ' +
        'Set it to: export GCP_PROJECT_ID=fitnessai-prod'
    );
  }
  return projectId;
}

async function getOrCreateNotificationChannel(projectId: string): Promise<string> {
  console.log('\n📧 Setting up notification channel...');

  // Check existing email notification channels
  const response = await monitoring.projects.notificationChannels.list({
    name: `projects/${projectId}`,
  });

  const emailChannels = response.data.notificationChannels?.filter(
    nc =>
      nc.type === 'email' &&
      nc.userLabels?.email_address === process.env.ALERT_EMAIL ||
      nc.displayName?.includes('email')
  );

  if (emailChannels && emailChannels.length > 0) {
    console.log(`✓ Found existing email channel: ${emailChannels[0].name}`);
    return emailChannels[0].name || '';
  }

  // If no email channel, provide instructions
  console.log(`\n⚠️  No email notification channel found.`);
  console.log(`\nTo create one, run:`);
  console.log(`  gcloud alpha monitoring channels create \\`);
  console.log(`    --display-name="Firestore Alerts" \\`);
  console.log(`    --type=email \\`);
  console.log(`    --channel-labels=email_address=YOUR_EMAIL@example.com`);
  console.log(`\nThen re-run this script with: ALERT_CHANNEL_ID=<channel-id> npm run setup:firestore-alerts`);

  const channelId = process.env.ALERT_CHANNEL_ID;
  if (!channelId) {
    throw new Error('ALERT_CHANNEL_ID environment variable not set');
  }

  return `projects/${projectId}/notificationChannels/${channelId}`;
}

async function createAlertPolicy(
  projectId: string,
  channelId: string,
  alertName: string,
  metric: string,
  threshold: number
): Promise<void> {
  const displayName = `Firestore ${alertName} Alert`;

  const policy: AlertPolicy = {
    displayName,
    conditions: [
      {
        displayName: `${alertName} exceeds ${threshold.toLocaleString()}`,
        conditionThreshold: {
          filter: `resource.type = "firestore_instance" AND metric.type = "${metric}"`,
          comparison: 'COMPARISON_GT',
          thresholdValue: threshold,
          duration: '300s', // Alert if threshold exceeded for 5 minutes
          aggregations: [
            {
              alignmentPeriod: '86400s', // 24 hour alignment (daily)
              perSeriesAligner: 'ALIGN_SUM',
            },
          ],
        },
      },
    ],
    notificationChannels: [channelId],
    alertStrategy: {
      autoClose: '1800s', // Auto-close after 30 minutes of threshold not exceeded
    },
  };

  try {
    const response = await monitoring.projects.alertPolicies.create({
      name: `projects/${projectId}`,
      requestBody: policy,
    });

    const policyName = response.data.name;
    console.log(`✓ Created alert: ${displayName} (${policyName})`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      console.log(`ℹ️  Alert already exists: ${displayName}`);
    } else {
      throw error;
    }
  }
}

async function main() {
  try {
    console.log('🔔 Firestore Monitoring Alerts Setup');
    console.log('═'.repeat(60));

    // Authenticate with Google Cloud
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    google.options({ auth });

    const projectId = await getProjectId();
    console.log(`\n📍 Project: ${projectId}`);

    // Get or create notification channel
    const channelId = await getOrCreateNotificationChannel(projectId);

    if (!channelId) {
      console.log(
        '\n❌ Notification channel not available. Please set up email channel first.'
      );
      process.exit(1);
    }

    console.log(`\n📊 Creating alert policies...`);
    console.log(`Thresholds:`);
    console.log(`  • Reads: ${ALERT_CONFIG.reads.threshold.toLocaleString()}/day`);
    console.log(`  • Writes: ${ALERT_CONFIG.writes.threshold.toLocaleString()}/day`);
    console.log(`  • Deletes: ${ALERT_CONFIG.deletes.threshold.toLocaleString()}/day`);

    // Create alerts for each metric
    await createAlertPolicy(
      projectId,
      channelId,
      'Reads',
      ALERT_CONFIG.reads.metric,
      ALERT_CONFIG.reads.threshold
    );

    await createAlertPolicy(
      projectId,
      channelId,
      'Writes',
      ALERT_CONFIG.writes.metric,
      ALERT_CONFIG.writes.threshold
    );

    await createAlertPolicy(
      projectId,
      channelId,
      'Deletes',
      ALERT_CONFIG.deletes.metric,
      ALERT_CONFIG.deletes.threshold
    );

    console.log('\n═'.repeat(60));
    console.log('✅ Alert setup complete!');
    console.log('\n📈 View alerts in Cloud Console:');
    console.log(
      `   https://console.cloud.google.com/monitoring/alerting/policies?project=${projectId}`
    );
    console.log('\n📊 View Firestore metrics:');
    console.log(
      `   https://console.cloud.google.com/monitoring/dashboards?project=${projectId}`
    );
  } catch (error) {
    console.error('\n❌ Error setting up alerts:', error);
    process.exit(1);
  }
}

main();
