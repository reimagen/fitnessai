
"use client";

import { useAuth } from "@/lib/auth.service";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { isEmailWhitelisted } from "@/lib/whitelist-server";

const PUBLIC_ROUTES = ["/signin"];
const PENDING_ROUTE = "/pending";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [whitelistStatus, setWhitelistStatus] = useState<{ email: string; status: boolean } | null>(null);
  const isWhitelisted =
    user?.email && whitelistStatus?.email === user.email ? whitelistStatus.status : null;
  const isCheckingWhitelist = !isLoading && !!user?.email && isWhitelisted === null;

  useEffect(() => {
    if (!isCheckingWhitelist || !user?.email) return;

    let isActive = true;
    isEmailWhitelisted(user.email).then((status) => {
      if (isActive) {
        setWhitelistStatus({ email: user.email, status });
      }
    });

    return () => {
      isActive = false;
    };
  }, [isCheckingWhitelist, user?.email]);

  useEffect(() => {
    // Don't perform redirects until all loading is complete
    if (isLoading || isCheckingWhitelist) {
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isPendingRoute = pathname === PENDING_ROUTE;

    // --- Redirection Logic ---

    // 1. No User Logic
    if (!user) {
      if (!isPublicRoute) {
        router.push("/signin");
      }
      return;
    }
    
    // --- User is Authenticated from here on ---

    // 2. User is on a public route (e.g., /signin), redirect away.
    if (isPublicRoute) {
      router.push("/");
      return;
    }

    // 3. Whitelist Check
    if (isWhitelisted === false && !isPendingRoute) {
      // If user is not whitelisted and not on the pending page, redirect them.
      router.push(PENDING_ROUTE);
    } else if (isWhitelisted === true && isPendingRoute) {
      // If a whitelisted user somehow lands on the pending page, move them home.
      router.push("/");
    }

  }, [user, isLoading, isWhitelisted, isCheckingWhitelist, router, pathname]);

  // While loading authentication state or whitelist status, show a full-page loader
  if (isLoading || isCheckingWhitelist) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // --- Render Logic ---

  // Allow public routes to render immediately if auth is done.
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }
  
  // If user is logged in, but not whitelisted, only allow the pending page to render
  if (user && !isWhitelisted) {
      return pathname === PENDING_ROUTE ? <>{children}</> : (
          <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      );
  }
  
  // If user is logged in and whitelisted, render any protected page
  if (user && isWhitelisted) {
      return <>{children}</>;
  }

  // Fallback loader during redirects
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
