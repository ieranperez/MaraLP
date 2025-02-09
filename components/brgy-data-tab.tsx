"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase"

type BarangayData = {
  id: string
  code: string
  transactions: number
}

export default function BrgyDataTab() {
  const [newBarangayCode, setNewBarangayCode] = useState("")
  const [processedData, setProcessedData] = useState<BarangayData[]>([])
  const [uniquePatients, setUniquePatients] = useState(0)

  useEffect(() => {
    fetchBarangayData()
  }, [])

  const fetchBarangayData = async () => {
    try {
      const { data, error } = await supabase.from("barangays").select("*").order("code")

      if (error) throw error

      setProcessedData(data)

      // Fetch unique patients count
      const { count, error: countError } = await supabase.from("patients").select("id", { count: "exact", head: true })

      if (countError) throw countError

      setUniquePatients(count || 0)
    } catch (error) {
      console.error("Error fetching barangay data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch barangay data. Please check your database connection.",
        variant: "destructive",
      })
    }
  }

  const handleAddBarangay = async () => {
    if (!newBarangayCode) {
      toast({
        title: "Error",
        description: "Barangay code cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("barangays")
        .insert([{ code: newBarangayCode.toUpperCase(), transactions: 0 }])
        .select()

      if (error) {
        if (error.code === "23505") {
          throw new Error("A barangay with this code already exists.")
        }
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned after insertion.")
      }

      setProcessedData((prev) => [...prev, data[0]])
      setNewBarangayCode("")

      toast({
        title: "Success",
        description: "New barangay added successfully",
      })
    } catch (error) {
      console.error("Error adding barangay:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add new barangay",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBarangay = async (id: string) => {
    try {
      const { error } = await supabase.from("barangays").delete().eq("id", id)

      if (error) throw error

      setProcessedData((prev) => prev.filter((barangay) => barangay.id !== id))

      toast({
        title: "Success",
        description: "Barangay deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting barangay:", error)
      toast({
        title: "Error",
        description: "Failed to delete barangay",
        variant: "destructive",
      })
    }
  }

  const totalTransactions = processedData.reduce((sum, barangay) => sum + barangay.transactions, 0)
  const mostActiveBarangay = processedData.reduce(
    (max, barangay) => (barangay.transactions > max.transactions ? barangay : max),
    { code: "N/A", transactions: 0 },
  )
  const activeBarangays = processedData.filter((barangay) => barangay.transactions > 0).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Barangay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="BARANGAY CODE"
              value={newBarangayCode}
              onChange={(e) => setNewBarangayCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button onClick={handleAddBarangay} className="bg-[#4CAF50] hover:bg-[#45a049] text-white">
              Add Barangay
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Barangay Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barangay Code</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.map((barangay) => (
                  <TableRow key={barangay.id}>
                    <TableCell>{barangay.code}</TableCell>
                    <TableCell>{barangay.transactions}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBarangay(barangay.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medication Transactions per Barangay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="transactions" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Active Barangay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{mostActiveBarangay.code}</p>
            <p className="text-sm text-muted-foreground">{mostActiveBarangay.transactions} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unique Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{uniquePatients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Barangays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{activeBarangays}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

