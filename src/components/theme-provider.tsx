"use client"

import * as React from "react"
// import { ThemeProvider as NextThemesProvider } from "next-themes"
// import { type ThemeProviderProps } from "next-themes/dist/types"

// type ThemeProviderProps = React.PropsWithChildren<{}>; // Dummy type for now

export function ThemeProvider({ children, ...props }: any /* ThemeProviderProps */) {
  return (
    // <NextThemesProvider {...props}>
      children
    // </NextThemesProvider>
  )
}
