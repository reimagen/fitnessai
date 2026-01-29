// Firebase App Hosting provides FIREBASE_WEBAPP_CONFIG at build time.
// Parse it into NEXT_PUBLIC_ vars so the client bundle can access them.
const webappConfig = process.env.FIREBASE_WEBAPP_CONFIG
  ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG)
  : {};

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: webappConfig.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: webappConfig.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: webappConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: webappConfig.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: webappConfig.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: webappConfig.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  serverExternalPackages: ['@genkit-ai/firebase', 'firebase-admin'],
};

module.exports = nextConfig;
