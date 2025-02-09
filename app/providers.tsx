"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { BarangayProvider } from "@/contexts/BarangayContext"
import { MedicationProvider } from "@/contexts/MedicationContext"
import { PersistentStateProvider } from "@/contexts/PersistentStateContext"
import type React from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BarangayProvider>
        <MedicationProvider>
          <PersistentStateProvider>{children}</PersistentStateProvider>
        </MedicationProvider>
      </BarangayProvider>
    </ThemeProvider>
  )
}

