"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePersistentState } from "@/contexts/PersistentStateContext"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DispensingData = {
  id: string
  patient_name: string
  patient_category: string
  ward: string
  prescription: string
  quantity: number
  date: string
}

type StatPeriod = "all" | "lastMonth" | "lastWeek"

type InventoryItem = {
  id: string
  name: string
  dispensary_quantity: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

const wardOptions = ["ANNEX", "DR", "INFIRMARY", "MICU", "MW", "NICU", "OBW", "OPD", "OR", "PICU", "PW", "SICU", "SW"]
const patientCategoryOptions = ["ER", "INDIGENT", "MAI", "OPD", "PHC"]

export default function DataTab() {
  const { data: persistentData, updateData } = usePersistentState("data")
  const { data: sharedData } = usePersistentState("dispensing")
  const [dispensingData, setDispensingData] = useState<DispensingData[]>([])
  const [statPeriod, setStatPeriod] = useState<StatPeriod>(persistentData.statPeriod || "all")
  const [selectedWards, setSelectedWards] = useState<string[]>(persistentData.selectedWards || [])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(persistentData.selectedCategories || [])
  const [uniquePatients, setUniquePatients] = useState<number>(persistentData.uniquePatients || 0)
  const [topMedications, setTopMedications] = useState<{ name: string; count: number }[]>(
    persistentData.topMedications || [],
  )
  const [patientCategoryDistribution, setPatientCategoryDistribution] = useState<{ name: string; value: number }[]>(
    persistentData.patientCategoryDistribution || [],
  )
  const [dispensingTrend, setDispensingTrend] = useState<{ date: string; count: number }[]>(
    persistentData.dispensingTrend || [],
  )
  const [lowStockMedications, setLowStockMedications] = useState<InventoryItem[]>([])

  const filterDataByPeriod = useCallback(
    (data: DispensingData[]) => {
      const now = new Date()
      switch (statPeriod) {
        case "lastMonth":
          return data.filter((item) => new Date(item.date) >= new Date(now.setMonth(now.getMonth() - 1)))
        case "lastWeek":
          return data.filter((item) => new Date(item.date) >= new Date(now.setDate(now.getDate() - 7)))
        default:
          return data
      }
    },
    [statPeriod],
  )

  const calculateStatistics = useCallback(() => {
    const filteredData = filterDataByPeriod(dispensingData)

    // Calculate top medications
    const medicationCounts = filteredData.reduce(
      (acc, item) => {
        acc[item.prescription] = (acc[item.prescription] || 0) + item.quantity
        return acc
      },
      {} as Record<string, number>,
    )
    const topMeds = Object.entries(medicationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    setTopMedications(topMeds)

    // Calculate patient category distribution
    const categoryCounts = filteredData.reduce(
      (acc, item) => {
        acc[item.patient_category] = (acc[item.patient_category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const categoryDist = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))
    setPatientCategoryDistribution(categoryDist)

    // Calculate dispensing trend
    const dateCounts = filteredData.reduce(
      (acc, item) => {
        const date = new Date(item.date).toISOString().split("T")[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const trend = Object.entries(dateCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
    setDispensingTrend(trend)
  }, [dispensingData, filterDataByPeriod])

  const calculateUniquePatients = useCallback(() => {
    const filteredData = dispensingData.filter((item) => {
      const wardMatch = selectedWards.length === 0 || selectedWards.includes(item.ward)
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(item.patient_category)
      return wardMatch && categoryMatch
    })

    const uniquePatientSet = new Set(filteredData.map((item) => item.patient_name))
    setUniquePatients(uniquePatientSet.size)
  }, [dispensingData, selectedWards, selectedCategories])

  useEffect(() => {
    if (sharedData.dispensingHistory) {
      setDispensingData(sharedData.dispensingHistory)
    }
  }, [sharedData.dispensingHistory])

  useEffect(() => {
    calculateStatistics()
  }, [calculateStatistics])

  useEffect(() => {
    calculateUniquePatients()
  }, [calculateUniquePatients])

  useEffect(() => {
    updateData({
      statPeriod,
      selectedWards,
      selectedCategories,
      uniquePatients,
      topMedications,
      patientCategoryDistribution,
      dispensingTrend,
    })
  }, [
    statPeriod,
    selectedWards,
    selectedCategories,
    uniquePatients,
    topMedications,
    patientCategoryDistribution,
    dispensingTrend,
    updateData,
  ])

  useEffect(() => {
    fetchLowStockMedications()
  }, [])

  const fetchLowStockMedications = async () => {
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, dispensary_quantity")
        .order("dispensary_quantity", { ascending: true })
        .limit(10)

      if (error) throw error

      setLowStockMedications(data)
    } catch (error) {
      console.error("Error fetching low stock medications:", error)
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

  return (
    <div className="space-y-6">
      <Card className="border-2 border-red-500 shadow-lg shadow-red-100 overflow-hidden">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Low Stock Alert: Top 10 Medications Running Out</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-red-700">Medication Name</TableHead>
                <TableHead className="text-red-700">Quantity in Dispensary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockMedications.map((medication) => (
                <TableRow key={medication.id}>
                  <TableCell className="font-medium">{medication.name}</TableCell>
                  <TableCell>{medication.dispensary_quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispensing Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={statPeriod} onValueChange={(value: StatPeriod) => setStatPeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Dispensed Medications</CardTitle>
                <p className="text-sm text-muted-foreground">Total Quantity Dispensed</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMedications}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Patient Category Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Number of Transactions</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={patientCategoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {patientCategoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Dispensing Trend</CardTitle>
                <p className="text-sm text-muted-foreground">Number of Transactions</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dispensingTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unique Patients Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
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
                          <Badge key={ward} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
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
                  }}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setSelectedWards(wardOptions)
                    setSelectedCategories(patientCategoryOptions)
                  }}
                >
                  Select All
                </Button>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center bg-gradient-to-br from-primary/5 to-primary/20 rounded-lg p-6 shadow-inner">
              <h3 className="text-xl font-semibold mb-2 text-primary">Unique Patients</h3>
              <div className="text-5xl font-bold text-primary">{uniquePatients}</div>
              <p className="text-sm text-muted-foreground mt-2 text-center">Based on selected filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

