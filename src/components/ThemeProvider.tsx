"use client"

import type { ReactNode } from "react"

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    // <NextThemesProvider {...props}>
      children
    // </NextThemesProvider>
  )
}
