"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Barangay = {
  code: string
  name: string
}

type BarangayContextType = {
  barangayData: Barangay[]
  setBarangayData: React.Dispatch<React.SetStateAction<Barangay[]>>
}

const BarangayContext = createContext<BarangayContextType | undefined>(undefined)

export function BarangayProvider({ children }: { children: React.ReactNode }) {
  const [barangayData, setBarangayData] = useState<Barangay[]>([])

  useEffect(() => {
    const fetchBarangayData = async () => {
      try {
        // Simulating Supabase query
        const { data, error } = await {
          data: [
            { code: "B1", name: "Barangay 1" },
            { code: "B2", name: "Barangay 2" },
            { code: "B3", name: "Barangay 3" },
          ],
          error: null,
        }
        if (error) throw error
        setBarangayData(data)
      } catch (error) {
        console.error("Error fetching barangay data:", error)
      }
    }

    fetchBarangayData()
  }, [])

  return <BarangayContext.Provider value={{ barangayData, setBarangayData }}>{children}</BarangayContext.Provider>
}

export function useBarangay() {
  const context = useContext(BarangayContext)
  if (context === undefined) {
    throw new Error("useBarangay must be used within a BarangayProvider")
  }
  return context
}

