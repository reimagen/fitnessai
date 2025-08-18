
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Award, CalendarCheck, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/lib/firestore.service';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/analysis', label: 'Analysis', icon: BarChart3 },
  { href: '/prs', label: 'Milestones', icon: Award },
  { href: '/plan', label: 'Plan', icon: CalendarCheck },
  { href: '/history', label: 'History', icon: History },
  { href: '/profile', label: 'Profile', icon: User },
];

// Pages that are allowed to be accessed even without a profile
const UNRESTRICTED_PAGES = ['/', '/profile'];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { data: profileResult } = useUserProfile();
  const { toast } = useToast();
  
  // A user is considered "new" if their profile document was explicitly not found.
  const isNewUser = profileResult?.notFound === true;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // If the user is new and the page is restricted, prevent navigation and show a toast.
    if (isNewUser && !UNRESTRICTED_PAGES.includes(href)) {
      e.preventDefault();
      toast({
        title: "Set Up Your Profile",
        description: "Please create your profile first to access this page.",
        variant: "default",
      });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          // A link is considered disabled if the user is new and the page is restricted.
          const isDisabled = isNewUser && !UNRESTRICTED_PAGES.includes(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleLinkClick(e, item.href)}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-md transition-colors duration-150 ease-in-out',
                isActive ? 'text-primary' : 'text-muted-foreground',
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' // Style for disabled links
                  : 'hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
              // Prevent keyboard navigation to disabled links
              tabIndex={isDisabled ? -1 : undefined}
              aria-disabled={isDisabled}
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
