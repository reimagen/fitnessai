import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from '@/components/query-provider';
import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { AuthProvider } from '@/lib/auth.service';
import { AuthGate } from '@/components/auth/auth-gate';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const APP_NAME = "FitnessAI";
const APP_DESCRIPTION = "Your personal AI fitness companion to track workouts, plan schedules, and analyze progress.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_NAME,
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_NAME,
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-body antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <AuthGate>
              <div className="flex min-h-screen flex-col">
                <main className="flex-grow pb-20 pt-4">{children}</main>
                <BottomNavigationBar />
              </div>
            </AuthGate>
          </AuthProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
