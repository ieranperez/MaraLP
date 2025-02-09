"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"

type DispensingData = {
  id: string
  patient_name: string
  patient_category: string
  ward: string
  prescription: string
  quantity: number
  encoder: string
  date: string
}

type TabData = {
  [key: string]: any
  dispensing?: {
    dispensingHistory: DispensingData[]
  }
}

type PersistentStateContextType = {
  tabData: TabData
  updateTabData: (tabName: string, data: any) => void
}

const PersistentStateContext = createContext<PersistentStateContextType | undefined>(undefined)

export function PersistentStateProvider({ children }: { children: React.ReactNode }) {
  const [tabData, setTabData] = useState<TabData>({})
  const isInitialMount = useRef(true)

  useEffect(() => {
    const savedData = sessionStorage.getItem("maraTabData")
    if (savedData) {
      try {
        setTabData(JSON.parse(savedData))
      } catch (error) {
        console.error("Error parsing saved data:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      sessionStorage.setItem("maraTabData", JSON.stringify(tabData))
    }
  }, [tabData])

  const updateTabData = useCallback((tabName: string, data: any) => {
    setTabData((prev) => {
      const newData = { ...prev, [tabName]: { ...prev[tabName], ...data } }
      return newData
    })
  }, [])

  return (
    <PersistentStateContext.Provider value={{ tabData, updateTabData }}>{children}</PersistentStateContext.Provider>
  )
}

export function usePersistentState(tabName: string) {
  const context = useContext(PersistentStateContext)
  if (context === undefined) {
    throw new Error("usePersistentState must be used within a PersistentStateProvider")
  }
  const { tabData, updateTabData } = context

  const updateData = useCallback(
    (data: any) => {
      updateTabData(tabName, data)
    },
    [updateTabData, tabName],
  )

  return {
    data: tabData[tabName] || {},
    updateData,
  }
}

