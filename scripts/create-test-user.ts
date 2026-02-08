import { config } from 'dotenv';
import * as admin from 'firebase-admin';

config({ path: '.env.development.local' });

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

console.log('Service account:', {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key_exists: !!process.env.FIREBASE_PRIVATE_KEY,
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const auth = admin.auth();

async function createTestUser() {
  const email = 'new@fake.com';
  const password = 'fake26';

  try {
    // Try to delete existing user if present
    try {
      await auth.deleteUser(
        (await auth.getUserByEmail(email)).uid
      );
      console.log(`Deleted existing user: ${email}`);
    } catch (err) {
      // User doesn't exist, continue
    }

    // Create new user
    const user = await auth.createUser({
      email,
      password,
    });

    console.log(`✅ Test user created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`UID: ${user.uid}`);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
