"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type RestockFormData = {
  medication_name: string
  quantity: number
  date: Date
  source: string
  placement: string
}

type RestockingFormContextType = {
  formData: RestockFormData
  updateFormData: (data: Partial<RestockFormData>) => void
  resetForm: () => void
}

const initialFormData: RestockFormData = {
  medication_name: "",
  quantity: 0,
  date: new Date(),
  source: "",
  placement: "",
}

const RestockingFormContext = createContext<RestockingFormContextType | undefined>(undefined)

export function RestockingFormProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<RestockFormData>(initialFormData)

  useEffect(() => {
    const savedData = sessionStorage.getItem("restockingFormData")
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      setFormData({
        ...parsedData,
        date: new Date(parsedData.date),
      })
    }
  }, [])

  const updateFormData = (data: Partial<RestockFormData>) => {
    setFormData((prev) => {
      const newData = { ...prev, ...data }
      sessionStorage.setItem("restockingFormData", JSON.stringify(newData))
      return newData
    })
  }

  const resetForm = () => {
    setFormData(initialFormData)
    sessionStorage.removeItem("restockingFormData")
  }

  return (
    <RestockingFormContext.Provider value={{ formData, updateFormData, resetForm }}>
      {children}
    </RestockingFormContext.Provider>
  )
}

export function useRestockingForm() {
  const context = useContext(RestockingFormContext)
  if (context === undefined) {
    throw new Error("useRestockingForm must be used within a RestockingFormProvider")
  }
  return context
}

