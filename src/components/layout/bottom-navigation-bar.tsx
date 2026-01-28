
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Award, CalendarCheck, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/lib/firestore.service';
import { useToast } from '@/hooks/useToast';
import { checkProfileCompletion } from '@/lib/profile-completion';

const navItems = [
  { href: '/', label: 'Home', icon: Home, restricted: true },
  { href: '/analysis', label: 'Analysis', icon: BarChart3, restricted: true },
  { href: '/prs', label: 'Milestones', icon: Award, restricted: true },
  { href: '/plan', label: 'Plan', icon: CalendarCheck, restricted: true },
  { href: '/history', label: 'History', icon: History, restricted: true },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { data: profileResult } = useUserProfile();
  const userProfile = profileResult?.data;
  const { toast } = useToast();
  
  const completionStatus = userProfile ? checkProfileCompletion(userProfile) : null;
  const isProfileIncomplete = completionStatus ? !completionStatus.isCoreComplete : false;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, item: (typeof navItems)[0]) => {
    if (item.restricted && isProfileIncomplete && completionStatus) {
      e.preventDefault();
      toast({
        title: "Complete Your Profile",
        description: `Please add the following to unlock this page: ${completionStatus.missingCoreFields.join(', ')}.`,
        variant: "default",
      });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = item.restricted && isProfileIncomplete;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleLinkClick(e, item)}
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
