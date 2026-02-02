import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseAliasConverter } from '../src/lib/firebase-admin';
import type { AliasDocument } from '../src/lib/exercise-types';

type AliasMap = Record<string, string>;

const STRENGTH_ALIAS_MAP: AliasMap = {
  'bench press': 'barbell-bench-press',
  'barbell bench': 'barbell-bench-press',
};

function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toSlug(input: string): string {
  return normalizeName(input).replace(/\s+/g, '-');
}

async function main() {
  const envPath =
    process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');

  if (envPath && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID. Set env vars or use .env.development.local.');
  }

  const now = new Date();
  const aliases: AliasDocument[] = Object.entries(STRENGTH_ALIAS_MAP).map(([alias, canonicalId]) => ({
    alias: normalizeName(alias),
    canonicalId,
    createdAt: now,
  }));

  const db = getAdminDb();
  const collectionRef = db.collection('exerciseAliases').withConverter(exerciseAliasConverter);
  const batch = db.batch();

  aliases.forEach(aliasDoc => {
    const docId = toSlug(aliasDoc.alias);
    batch.set(collectionRef.doc(docId), aliasDoc, { merge: true });
  });

  await batch.commit();

  console.log(`Project: ${projectId}`);
  console.log(`Aliases upserted: ${aliases.length}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
