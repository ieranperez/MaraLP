"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { usePersistentState } from "@/contexts/PersistentStateContext"
import { supabase } from "@/lib/supabase"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type RestockRecord = {
  id: string
  medication_name: string
  quantity: number
  date: string
  encoder: string
  placement: string
}

export default function RestockingTab() {
  const { data, updateData } = usePersistentState("restocking")
  const [restockHistory, setRestockHistory] = useState<RestockRecord[]>(data.restockHistory || [])
  const [medications, setMedications] = useState<string[]>([])
  const [newRestock, setNewRestock] = useState<Omit<RestockRecord, "id">>(
    data.newRestock || {
      medication_name: "",
      quantity: 0,
      date: new Date().toISOString(),
      encoder: "",
      placement: "DISPENSARY",
    },
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchRestockHistory()
    fetchMedications()
  }, [])

  const updatePersistentData = useCallback(() => {
    updateData({ restockHistory, newRestock })
  }, [updateData, restockHistory, newRestock])

  useEffect(() => {
    updatePersistentData()
  }, [updatePersistentData])

  const fetchRestockHistory = async () => {
    try {
      const { data, error } = await supabase.from("restocking").select("*").order("date", { ascending: false })

      if (error) throw error

      setRestockHistory(data)
    } catch (error) {
      console.error("Error fetching restock history:", error)
      toast({
        title: "Error",
        description: "Failed to fetch restock history",
        variant: "destructive",
      })
    }
  }

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase.from("medications").select("name").order("name")

      if (error) throw error

      if (data.length === 0) {
        toast({
          title: "No medications found",
          description: "Please add medications in the Inventory tab first.",
          variant: "warning",
        })
      }

      setMedications(data.map((med) => med.name))
    } catch (error) {
      console.error("Error fetching medications:", error)
      toast({
        title: "Error",
        description: "Failed to fetch medications. Please check your database connection.",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (name: string, value: string | number | Date) => {
    setNewRestock((prev) => ({
      ...prev,
      [name]: name === "encoder" ? value.toString().toUpperCase() : value,
      date: name === "date" ? (value as Date).toISOString() : prev.date,
    }))
  }

  const handleSubmit = async () => {
    if (!newRestock.medication_name || !newRestock.quantity || !newRestock.date || !newRestock.encoder) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from("restocking")
        .insert([
          {
            medication_name: newRestock.medication_name,
            quantity: newRestock.quantity,
            date: newRestock.date,
            encoder: newRestock.encoder,
            placement: "DISPENSARY",
          },
        ])
        .select()

      if (error) throw error

      setRestockHistory((prev) => [data[0], ...prev])
      await updateInventory(newRestock.medication_name, newRestock.quantity)

      setNewRestock((prev) => ({
        medication_name: "",
        quantity: 0,
        date: new Date().toISOString(),
        encoder: prev.encoder, // Keep the previous encoder value
        placement: "DISPENSARY",
      }))

      toast({
        title: "Success",
        description: "Restock record added successfully",
      })
    } catch (error) {
      console.error("Error adding restock record:", error)
      toast({
        title: "Error",
        description: "Failed to add restock record",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateInventory = async (medicationName: string, quantity: number) => {
    try {
      const { data, error } = await supabase.from("medications").select("*").eq("name", medicationName).single()

      if (error) throw error

      const updatedMedication = {
        ...data,
        dispensary_quantity: (data.dispensary_quantity || 0) + (quantity || 0),
      }

      const { error: updateError } = await supabase.from("medications").update(updatedMedication).eq("id", data.id)

      if (updateError) throw updateError

      console.log(`Updated inventory for ${medicationName}: Dispensary: ${updatedMedication.dispensary_quantity}`)
    } catch (error) {
      console.error("Error updating inventory:", error)
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("restocking").delete().eq("id", id)

      if (error) throw error

      setRestockHistory((prev) => prev.filter((record) => record.id !== id))

      toast({
        title: "Success",
        description: "Restock record deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting restock record:", error)
      toast({
        title: "Error",
        description: "Failed to delete restock record",
        variant: "destructive",
      })
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Restock</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  value={newRestock.medication_name}
                  onValueChange={(value) => handleInputChange("medication_name", value)}
                >
                  <SelectTrigger id="medication_name">
                    <SelectValue placeholder="Select Medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map((med) => (
                      <SelectItem key={med} value={med}>
                        {med}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="quantity"
                  placeholder="Quantity"
                  type="number"
                  value={newRestock.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", Number.parseInt(e.target.value))}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newRestock.date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newRestock.date ? format(new Date(newRestock.date), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newRestock.date ? new Date(newRestock.date) : undefined}
                      onSelect={(date) => handleInputChange("date", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="encoder"
                  placeholder="Encoder"
                  value={newRestock.encoder}
                  onChange={(e) => handleInputChange("encoder", e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Add Restock Record"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restock History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Encoder</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restockHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No restock records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    restockHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                        <TableCell>{record.medication_name}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{record.encoder}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete this record</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

