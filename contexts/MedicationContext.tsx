"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

type Medication = {
  id: string
  name: string
  stock_room_quantity: number
  dispensary_quantity: number
  total_quantity: number
}

type MedicationContextType = {
  medications: Medication[]
  addMedication: (medication: Omit<Medication, "id">) => Promise<void>
  deleteMedication: (id: string) => Promise<void>
  updateMedication: (medication: Medication) => Promise<void>
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined)

export function MedicationProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([])

  useEffect(() => {
    fetchMedications()
  }, [])

  const fetchMedications = async () => {
    try {
      // TODO: Replace with actual Supabase query
      const { data, error } = await { data: [], error: null }
      if (error) throw error
      setMedications(data)
    } catch (error) {
      console.error("Error fetching medications:", error)
      toast({
        title: "Error",
        description: "Failed to fetch medications",
        variant: "destructive",
      })
    }
  }

  const addMedication = async (newMedication: Omit<Medication, "id">) => {
    try {
      // TODO: Replace with actual Supabase insert
      const { data, error } = await { data: { id: Date.now().toString(), ...newMedication }, error: null }
      if (error) throw error
      setMedications((prev) => [...prev, data])
      toast({
        title: "Success",
        description: "Medication added successfully",
      })
    } catch (error) {
      console.error("Error adding medication:", error)
      toast({
        title: "Error",
        description: "Failed to add medication",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteMedication = async (id: string) => {
    try {
      // TODO: Replace with actual Supabase delete
      const { error } = await { error: null }
      if (error) throw error
      setMedications((prev) => prev.filter((med) => med.id !== id))
      toast({
        title: "Success",
        description: "Medication deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting medication:", error)
      toast({
        title: "Error",
        description: "Failed to delete medication",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateMedication = async (updatedMedication: Medication) => {
    try {
      // TODO: Replace with actual Supabase update
      const { error } = await { error: null }
      if (error) throw error
      setMedications((prev) => prev.map((med) => (med.id === updatedMedication.id ? updatedMedication : med)))
      toast({
        title: "Success",
        description: "Medication updated successfully",
      })
    } catch (error) {
      console.error("Error updating medication:", error)
      toast({
        title: "Error",
        description: "Failed to update medication",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <MedicationContext.Provider value={{ medications, addMedication, deleteMedication, updateMedication }}>
      {children}
    </MedicationContext.Provider>
  )
}

export function useMedication() {
  const context = useContext(MedicationContext)
  if (context === undefined) {
    throw new Error("useMedication must be used within a MedicationProvider")
  }
  return context
}

