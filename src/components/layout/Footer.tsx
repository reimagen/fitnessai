'use client';

import Link from 'next/link';
import { HelpCircle, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30 py-4 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/help"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Help & FAQ
        </Link>
        <span className="hidden sm:inline">•</span>
        <Link
          href="/support"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Mail className="h-4 w-4" />
          Support
        </Link>
        <span className="hidden sm:inline">•</span>
        <a
          href="mailto:support@fitnessai.app"
          className="hover:text-foreground transition-colors"
        >
          support@fitnessai.app
        </a>
      </div>
    </footer>
  );
}
