
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
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        // Keep clear of iOS safe area.
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="mx-auto max-w-md px-3 pt-3 sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl">
        <div
          className={cn(
            "relative flex h-16 w-full items-center justify-between gap-1 px-2",
            "rounded-2xl border border-border/70 bg-card/70 shadow-lg shadow-primary/10 backdrop-blur-md",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-primary/10 before:via-transparent before:to-transparent before:opacity-70"
          )}
        >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = item.restricted && isProfileIncomplete;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleLinkClick(e, item)}
              className={cn(
                "group relative flex flex-1 min-w-0 flex-col items-center justify-center rounded-xl px-1 py-2.5 sm:px-3",
                "transition-all duration-200 ease-out",
                isActive ? "text-primary" : "text-muted-foreground",
                isDisabled 
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-foreground"
              )}
              aria-current={isActive ? 'page' : undefined}
              // Prevent keyboard navigation to disabled links
              tabIndex={isDisabled ? -1 : undefined}
              aria-disabled={isDisabled}
            >
              <span
                className={cn(
                  "absolute inset-0 -z-10 rounded-xl transition-opacity duration-200",
                  isActive
                    ? "opacity-100 bg-primary/12 shadow-sm shadow-primary/15"
                    : "opacity-0 group-hover:opacity-100 bg-muted/40 shadow-sm shadow-primary/10"
                )}
              />
              <item.icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "mt-1 w-full truncate text-center text-[11px] font-medium sm:text-xs",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
