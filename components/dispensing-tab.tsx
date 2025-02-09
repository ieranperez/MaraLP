"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Search, Trash2, X } from "lucide-react"
import { format, isEqual, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { usePersistentState } from "@/contexts/PersistentStateContext"
import { supabase } from "@/lib/supabase"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type DispensingRecord = {
  id: string
  patient_name: string
  patient_category: string
  ward: string
  prescription: string
  quantity: number
  encoder: string
  date: string
  created_at: string
}

const patientCategories = ["ER", "INDIGENT", "MAI", "OPD", "PHC"]
const wardOptions = ["ANNEX", "DR", "INFIRMARY", "MICU", "MW", "NICU", "OBW", "OPD", "OR", "PICU", "PW", "SICU", "SW"]

export default function DispensingTab() {
  const { data, updateData } = usePersistentState("dispensing")
  const [medications, setMedications] = useState<string[]>(data.medications || [])
  const [formData, setFormData] = useState<Omit<DispensingRecord, "id">>(
    data.formData || {
      patient_name: "",
      patient_category: "",
      ward: "",
      prescription: "",
      quantity: 0,
      encoder: "",
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  )
  const [dispensingHistory, setDispensingHistory] = useState<DispensingRecord[]>(data.dispensingHistory || [])
  const [filteredHistory, setFilteredHistory] = useState<DispensingRecord[]>(data.filteredHistory || [])
  const [isFiltered, setIsFiltered] = useState(data.isFiltered || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentInventory, setCurrentInventory] = useState<number | null>(null)
  const [isInvalidQuantity, setIsInvalidQuantity] = useState(false)
  const [suggestedNames, setSuggestedNames] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const patientNameInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    fetchMedications()
    fetchDispensingHistory()
  }, [])

  const updatePersistentData = useCallback(() => {
    updateData({
      medications,
      formData,
      dispensingHistory,
      filteredHistory,
      isFiltered,
    })
  }, [updateData, medications, formData, dispensingHistory, filteredHistory, isFiltered])

  useEffect(() => {
    updatePersistentData()
  }, [updatePersistentData])

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase.from("medications").select("name").order("name")
      if (error) throw error
      setMedications(data.map((med) => med.name).sort())
    } catch (error) {
      console.error("Error fetching medications:", error)
      toast({
        title: "Error",
        description: "Failed to fetch medications. Please check your database connection.",
        variant: "destructive",
      })
    }
  }

  const fetchDispensingHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("dispensing")
        .select("id, patient_name, patient_category, ward, prescription, quantity, encoder, date, created_at")
        .order("created_at", { ascending: false })
      if (error) throw error
      setDispensingHistory(data)
      setFilteredHistory(data)
      updateData({ dispensingHistory: data })
    } catch (error) {
      console.error("Error fetching dispensing history:", error)
      toast({
        title: "Error",
        description: "Failed to fetch dispensing history",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (name: string, value: string | number | Date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === "patient_name" || name === "encoder" ? value.toString().toUpperCase() : value,
      date: name === "date" ? (value as Date).toISOString() : prev.date,
    }))

    if (name === "patient_name") {
      const inputValue = value.toString().toUpperCase()
      const suggestions = Array.from(
        new Set(dispensingHistory.map((record) => record.patient_name).filter((name) => name.startsWith(inputValue))),
      ).slice(0, 5)
      setSuggestedNames(suggestions)
      setShowSuggestions(suggestions.length > 0)
      searchAndAutoFill(inputValue)
    }
  }

  const searchAndAutoFill = (patientName: string) => {
    const matchingRecords = dispensingHistory.filter((record) =>
      record.patient_name.toLowerCase().startsWith(patientName.toLowerCase()),
    )

    if (matchingRecords.length > 0) {
      const mostRecentRecord = matchingRecords.reduce((a, b) =>
        new Date(a.created_at) > new Date(b.created_at) ? a : b,
      )
      setFormData((prev) => ({
        ...prev,
        patient_name: patientName,
        ward: mostRecentRecord.ward,
        patient_category: mostRecentRecord.patient_category,
      }))
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, patient_name: suggestion }))
    searchAndAutoFill(suggestion)
    setShowSuggestions(false)
    patientNameInputRef.current?.focus()
  }

  const handleSubmit = async (clearAllFields = true) => {
    if (
      !formData.patient_name ||
      !formData.patient_category ||
      !formData.ward ||
      !formData.prescription ||
      formData.quantity === 0 ||
      !formData.encoder ||
      !formData.date
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    if (isInvalidQuantity) {
      toast({
        title: "Error",
        description: "Insufficient inventory. Cannot dispense this quantity.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const submissionDate = new Date(formData.date)
      submissionDate.setMinutes(submissionDate.getMinutes() - submissionDate.getTimezoneOffset())
      const dateString = submissionDate.toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("dispensing")
        .insert([
          {
            patient_name: formData.patient_name,
            ward: formData.ward,
            patient_category: formData.patient_category,
            prescription: formData.prescription,
            quantity: formData.quantity,
            encoder: formData.encoder,
            date: dateString,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      setDispensingHistory((prev) => [data[0], ...prev])
      setFilteredHistory((prev) => [data[0], ...prev])
      updateData({ dispensingHistory: [data[0], ...dispensingHistory] })
      await updateInventory(formData.prescription, Number(formData.quantity))

      setFormData((prev) => ({
        patient_name: clearAllFields ? "" : prev.patient_name,
        patient_category: clearAllFields ? "" : prev.patient_category,
        ward: clearAllFields ? "" : prev.ward,
        prescription: "",
        quantity: 0,
        encoder: prev.encoder, // Keep the previous encoder value
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }))

      toast({
        title: "Success",
        description: "Dispensing record added successfully",
      })
    } catch (error) {
      console.error("Error adding dispensing record:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add dispensing record",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateInventory = async (medication: string, dispensedQuantity: number) => {
    try {
      const { data, error } = await supabase.from("medications").select("*").eq("name", medication).single()
      if (error) throw error

      const updatedMedication = {
        ...data,
        dispensary_quantity: (data.dispensary_quantity || 0) - dispensedQuantity,
      }

      const { error: updateError } = await supabase.from("medications").update(updatedMedication).eq("id", data.id)
      if (updateError) throw updateError

      console.log(`Updated inventory for ${medication}: -${dispensedQuantity}`)
    } catch (error) {
      console.error("Error updating inventory:", error)
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("dispensing").delete().eq("id", id)
      if (error) throw error

      setDispensingHistory((prev) => prev.filter((record) => record.id !== id))
      setFilteredHistory((prev) => prev.filter((record) => record.id !== id))
      updateData({ dispensingHistory: dispensingHistory.filter((record) => record.id !== id) })

      toast({
        title: "Success",
        description: "Dispensing record deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting dispensing record:", error)
      toast({
        title: "Error",
        description: "Failed to delete dispensing record",
        variant: "destructive",
      })
    }
  }

  const handleSearch = useCallback(() => {
    let filtered = dispensingHistory

    if (searchTerm) {
      filtered = filtered.filter((record) => record.patient_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (filterDate) {
      const filterDateStart = startOfDay(filterDate)
      filtered = filtered.filter((record) => {
        const recordDate = startOfDay(new Date(record.date))
        return isEqual(recordDate, filterDateStart)
      })
    }

    setFilteredHistory(filtered)
    setIsFiltered(true)

    toast({
      title: "Search Results",
      description: `Found ${filtered.length} records`,
    })
  }, [dispensingHistory, searchTerm, filterDate])

  const handleAddAnother = () => {
    setFormData((prev) => ({
      ...prev,
      prescription: "",
      quantity: 0,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }))
    handleSubmit(false)
  }

  useEffect(() => {
    const fetchCurrentInventory = async () => {
      if (formData.prescription) {
        try {
          const { data, error } = await supabase
            .from("medications")
            .select("dispensary_quantity")
            .eq("name", formData.prescription)
            .single()

          if (error) throw error

          setCurrentInventory(data.dispensary_quantity)
        } catch (error) {
          console.error("Error fetching current inventory:", error)
          toast({
            title: "Error",
            description: "Failed to fetch current inventory",
            variant: "destructive",
          })
        }
      } else {
        setCurrentInventory(null)
      }
    }

    fetchCurrentInventory()
  }, [formData.prescription])

  useEffect(() => {
    if (currentInventory !== null && formData.quantity > 0) {
      setIsInvalidQuantity(formData.quantity > currentInventory)
    } else {
      setIsInvalidQuantity(false)
    }
  }, [currentInventory, formData.quantity])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dispense Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit(true)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="relative">
                  <Input
                    id="patient_name"
                    placeholder="PATIENT'S NAME"
                    value={formData.patient_name}
                    onChange={(e) => handleInputChange("patient_name", e.target.value)}
                    className="uppercase"
                    aria-label="Patient's Name"
                    ref={patientNameInputRef}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && suggestedNames.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      {suggestedNames.map((name, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSuggestionClick(name)}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Select
                    value={formData.ward}
                    onValueChange={(value) => handleInputChange("ward", value)}
                    aria-label="Ward"
                  >
                    <SelectTrigger id="ward">
                      <SelectValue placeholder="SELECT WARD" />
                    </SelectTrigger>
                    <SelectContent>
                      {wardOptions.map((ward) => (
                        <SelectItem key={ward} value={ward}>
                          {ward}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={formData.patient_category}
                    onValueChange={(value) => handleInputChange("patient_category", value)}
                    aria-label="Patient Category"
                  >
                    <SelectTrigger id="patient_category">
                      <SelectValue placeholder="SELECT CATEGORY" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={formData.prescription}
                    onValueChange={(value) => handleInputChange("prescription", value)}
                    aria-label="Prescription"
                  >
                    <SelectTrigger id="prescription">
                      <SelectValue placeholder="SELECT MEDICATION" />
                    </SelectTrigger>
                    <SelectContent>
                      {medications.map((med) => (
                        <SelectItem key={med} value={med}>
                          {med}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div>
                    <Input
                      id="quantity"
                      placeholder="QUANTITY"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange("quantity", Number.parseInt(e.target.value, 10) || 0)}
                      min="0"
                      aria-label="Quantity"
                    />
                    {currentInventory !== null && (
                      <p className={`text-sm mt-1 ${isInvalidQuantity ? "text-red-500" : "text-gray-500"}`}>
                        Current inventory: {currentInventory}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Input
                    id="encoder"
                    placeholder="ENCODER"
                    value={formData.encoder}
                    onChange={(e) => handleInputChange("encoder", e.target.value)}
                    className="uppercase"
                    aria-label="Encoder"
                  />
                </div>
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(new Date(formData.date), "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={new Date(formData.date)}
                        onSelect={(date) => handleInputChange("date", date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      className={`${
                        isInvalidQuantity ? "bg-red-500 hover:bg-red-600" : "bg-[#4CAF50] hover:bg-[#45a049]"
                      } text-white`}
                      disabled={isSubmitting || isInvalidQuantity}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isInvalidQuantity ? "Cannot dispense: Insufficient inventory" : "Add this dispensing record"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add another</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add record and start another</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispensing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                aria-label="Search Patients"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !filterDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, "PPP") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus />
                </PopoverContent>
              </Popover>
              {filterDate && (
                <Button variant="ghost" onClick={() => setFilterDate(undefined)} className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={handleSearch} variant="default">
                Search
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient's Name</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Encoder</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        No dispensing records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.date), "PP")}</TableCell>
                        <TableCell>{record.patient_name}</TableCell>
                        <TableCell>{record.ward}</TableCell>
                        <TableCell>{record.patient_category}</TableCell>
                        <TableCell>{record.prescription}</TableCell>
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

