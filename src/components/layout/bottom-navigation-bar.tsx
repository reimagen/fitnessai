"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, CalendarCheck, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/analysis', label: 'Analysis', icon: BarChart3 },
  { href: '/plan', label: 'Plan', icon: CalendarCheck },
  { href: '/history', label: 'History', icon: History },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-md transition-colors duration-150 ease-in-out',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('h-6 w-6', isActive ? 'fill-primary stroke-primary-foreground' : '')} strokeWidth={isActive ? 2.5 : 2} />
              <span className="mt-1 text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
