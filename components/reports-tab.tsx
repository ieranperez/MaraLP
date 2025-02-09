"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ChevronDown, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { usePersistentState } from "@/contexts/PersistentStateContext"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import printStyles from "@/styles/print-styles"

// Update the wardOptions and patientCategoryOptions arrays
const wardOptions = ["ANNEX", "DR", "INFIRMARY", "MICU", "MW", "NICU", "OBW", "OPD", "OR", "PICU", "PW", "SICU", "SW"]
const patientCategoryOptions = ["ER", "INDIGENT", "MAI", "OPD", "PHC"]

type DispensingRecord = {
  id: string
  patient_name: string
  patient_category: string
  ward: string
  prescription: string
  quantity: number
  encoder: string
  date: string
}

type TopMedication = {
  name: string
  quantity: number
}

type DailyUniquePatients = {
  date: string
  count: number
}

export default function ReportsTab() {
  const { data: persistentData, updateData } = usePersistentState("reports")
  const [reportType, setReportType] = useState<string>(persistentData.reportType || "")
  const [startDate, setStartDate] = useState<Date | undefined>(
    persistentData.startDate ? new Date(persistentData.startDate) : undefined,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    persistentData.endDate ? new Date(persistentData.endDate) : undefined,
  )
  const [selectedWards, setSelectedWards] = useState<string[]>(persistentData.selectedWards || [])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(persistentData.selectedCategories || [])
  const [reportData, setReportData] = useState<DispensingRecord[]>(persistentData.reportData || [])
  const [topMedications, setTopMedications] = useState<TopMedication[]>(persistentData.topMedications || [])
  const [uniquePatientCount, setUniquePatientCount] = useState<number>(persistentData.uniquePatientCount || 0)
  const [dailyUniquePatients, setDailyUniquePatients] = useState<DailyUniquePatients[]>(
    persistentData.dailyUniquePatients || [],
  )
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const updatePersistentData = useCallback(() => {
    updateData({
      reportType,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      selectedWards,
      selectedCategories,
      reportData,
      topMedications,
      uniquePatientCount,
      dailyUniquePatients,
    })
  }, [
    updateData,
    reportType,
    startDate,
    endDate,
    selectedWards,
    selectedCategories,
    reportData,
    topMedications,
    uniquePatientCount,
    dailyUniquePatients,
  ])

  useEffect(() => {
    updatePersistentData()
  }, [updatePersistentData])

  const handleGenerateReport = async () => {
    if (reportType !== "dispensing") {
      toast({
        title: "Error",
        description: "Only Dispensing Report is currently supported.",
        variant: "destructive",
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingReport(true)

    try {
      let query = supabase
        .from("dispensing")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])

      if (selectedWards.length > 0) {
        query = query.in("ward", selectedWards)
      }

      if (selectedCategories.length > 0) {
        query = query.in("patient_category", selectedCategories)
      }

      const { data, error } = await query

      if (error) throw error

      setReportData(data)

      // Calculate top 10 medications
      const medicationCounts = data.reduce(
        (acc, record) => {
          const key = record.prescription
          acc[key] = (acc[key] || 0) + record.quantity
          return acc
        },
        {} as Record<string, number>,
      )

      const sortedMedications = Object.entries(medicationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, quantity]) => ({ name, quantity }))

      setTopMedications(sortedMedications)

      // Calculate unique patient count
      const uniquePatients = new Set(data.map((record) => record.patient_name))
      setUniquePatientCount(uniquePatients.size)

      // Calculate daily unique patients
      const dailyPatients = data.reduce(
        (acc, record) => {
          const date = record.date.split("T")[0]
          if (!acc[date]) {
            acc[date] = new Set()
          }
          acc[date].add(record.patient_name)
          return acc
        },
        {} as Record<string, Set<string>>,
      )

      const dailyUniquePatientsData = Object.entries(dailyPatients)
        .map(([date, patients]) => ({
          date,
          count: patients.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setDailyUniquePatients(dailyUniquePatientsData)

      updatePersistentData()
      toast({
        title: "Success",
        description: `Generated report with ${data.length} records.`,
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleWardToggle = (ward: string) => {
    setSelectedWards((prev) => (prev.includes(ward) ? prev.filter((w) => w !== ward) : [...prev, ward]))
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handlePrint = useCallback(() => {
    if (printRef.current) {
      const content = printRef.current
      const printWindow = window.open("", "_blank")
      printWindow?.document.write("<html><head><title>Print Report</title>")
      printWindow?.document.write(
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">',
      )
      printWindow?.document.write("<style>")
      printWindow?.document.write(printStyles)
      printWindow?.document.write("</style></head><body>")
      printWindow?.document.write('<div class="print-container">')
      printWindow?.document.write(content.innerHTML)
      printWindow?.document.write("</div></body></html>")
      printWindow?.document.close()
      printWindow?.print()
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="report-type" className="block text-sm font-medium text-gray-700">
                Report Type
              </label>
              <Select
                value={reportType}
                onValueChange={(value) => {
                  setReportType(value)
                  updatePersistentData()
                }}
              >
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="dispensing">Dispensing Report</SelectItem>
                  <SelectItem value="patient">Patient Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "dispensing" && (
              <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[200px] justify-between">
                          Ward Filters
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[200px]">
                        <DropdownMenuLabel>Select Wards</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[200px]">
                          {wardOptions.map((ward) => (
                            <DropdownMenuCheckboxItem
                              key={ward}
                              checked={selectedWards.includes(ward)}
                              onCheckedChange={() => handleWardToggle(ward)}
                            >
                              {ward}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[200px] justify-between">
                          Patient Categories
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[200px]">
                        <DropdownMenuLabel>Select Categories</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-[200px]">
                          {patientCategoryOptions.map((category) => (
                            <DropdownMenuCheckboxItem
                              key={category}
                              checked={selectedCategories.includes(category)}
                              onCheckedChange={() => handleCategoryToggle(category)}
                            >
                              {category}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Filters:</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedWards.length === 0 && selectedCategories.length === 0 ? (
                        <Badge variant="secondary">All</Badge>
                      ) : (
                        <>
                          {selectedWards.map((ward) => (
                            <Badge
                              key={ward}
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                            >
                              {ward}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-1"
                                onClick={() => handleWardToggle(ward)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                          {selectedCategories.map((category) => (
                            <Badge
                              key={category}
                              variant="secondary"
                              className="bg-green-100 text-green-800 hover:bg-green-200"
                            >
                              {category}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-1"
                                onClick={() => handleCategoryToggle(category)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedWards([])
                      setSelectedCategories([])
                      updatePersistentData()
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setSelectedWards(wardOptions)
                      setSelectedCategories(patientCategoryOptions)
                      updatePersistentData()
                    }}
                  >
                    Select All
                  </Button>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        updatePersistentData()
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        updatePersistentData()
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <Button
            onClick={handleGenerateReport}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white"
            disabled={isGeneratingReport}
          >
            {isGeneratingReport ? "Generating Report..." : "Generate Report"}
          </Button>
          <Button
            onClick={handlePrint}
            className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white"
            disabled={reportData.length === 0}
          >
            Print Report
          </Button>
        </CardContent>
      </Card>

      <div ref={printRef} className="print-content">
        {reportType === "dispensing" && reportData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Dispensing Report</CardTitle>
            </CardHeader>
            <CardContent>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), "PP")}</TableCell>
                      <TableCell>{record.patient_name}</TableCell>
                      <TableCell>{record.ward}</TableCell>
                      <TableCell>{record.patient_category}</TableCell>
                      <TableCell>{record.prescription}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>{record.encoder}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {reportType === "dispensing" && topMedications.length > 0 && (
          <Card className="page-break">
            <CardHeader>
              <CardTitle>Top 10 Dispensed Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: "400px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMedications}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication</TableHead>
                    <TableHead>Quantity Dispensed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMedications.map((medication, index) => (
                    <TableRow key={index}>
                      <TableCell>{medication.name}</TableCell>
                      <TableCell>{medication.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {reportType === "dispensing" && uniquePatientCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unique Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-center">{uniquePatientCount}</div>
              <p className="text-center mt-2 text-sm text-gray-500">
                Total number of unique patients based on the selected filters
              </p>
            </CardContent>
          </Card>
        )}
        {reportType === "dispensing" && dailyUniquePatients.length > 0 && (
          <Card className="page-break">
            <CardHeader>
              <CardTitle>Daily Unique Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: "400px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyUniquePatients}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center mt-2 text-sm text-gray-500">
                Number of unique patients served per day based on the selected filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

