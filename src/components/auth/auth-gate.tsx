"use client";

import { useAuth } from "@/lib/auth.service";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/signin"];

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If loading is finished, check authentication status
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

      // If there's no user and the current route is not public, redirect to sign-in
      if (!user && !isPublicRoute) {
        router.push("/signin");
      }

      // If there is a user and they are on a public route (like sign-in), redirect to home
      if (user && isPublicRoute) {
        router.push("/");
      }
    }
  }, [user, isLoading, router, pathname]);

  // While loading authentication state, show a full-page loader
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If there's a user or the route is public, render the children
  if (user || PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // If no user on a protected route, show a loader while redirecting
  return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
}
