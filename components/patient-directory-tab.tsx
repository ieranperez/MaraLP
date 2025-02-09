"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

type Patient = {
  id: string
  name: string
  patient_category: string
  ward: string
  age: number
  birthday: Date
  gender: string
  encoder: string
  created_at: string
}

const patientCategories = ["ER", "INDIGENT", "MAI", "OPD", "PHC"]
const wardOptions = ["ANNEX", "DR", "INFIRMARY", "MICU", "MW", "NICU", "OBW", "OPD", "OR", "PICU", "PW", "SICU", "SW"]

export default function PatientDirectoryTab() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<Omit<Patient, "id" | "created_at">>({
    name: "",
    patient_category: "",
    ward: "",
    age: 0,
    birthday: null,
    gender: "",
    encoder: "",
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    if (formData.birthday) {
      const age = differenceInYears(new Date(), formData.birthday)
      setFormData((prev) => ({ ...prev, age }))
    }
  }, [formData.birthday])

  useEffect(() => {
    if (searchTerm) {
      setFilteredPatients(patients.filter((patient) => patient.name.toLowerCase().includes(searchTerm.toLowerCase())))
    } else {
      setFilteredPatients(patients)
    }
  }, [searchTerm, patients])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setPatients(
        data.map((patient) => ({
          ...patient,
          birthday: new Date(patient.birthday),
        })),
      )
      setFilteredPatients(data)
    } catch (error) {
      console.error("Error fetching patients:", error)
      toast({
        title: "Error",
        description: "Failed to fetch patient records",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (name: string, value: string | number | Date | null) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" || name === "encoder" ? value?.toString().toUpperCase() : value,
      age: name === "birthday" && value ? differenceInYears(new Date(), value as Date) : prev.age,
    }))
  }

  const resetForm = () => {
    setFormData((prev) => ({
      name: "",
      patient_category: "",
      ward: "",
      age: 0,
      birthday: null,
      gender: "",
      encoder: prev.encoder, // Keep the encoder value
    }))
  }

  const handleCreateProfile = async () => {
    if (
      !formData.name ||
      !formData.patient_category ||
      !formData.ward ||
      !formData.birthday ||
      !formData.gender ||
      !formData.encoder
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("patients")
        .insert([
          {
            name: formData.name,
            patient_category: formData.patient_category,
            ward: formData.ward,
            age: formData.age,
            birthday: formData.birthday?.toISOString(),
            gender: formData.gender,
            encoder: formData.encoder,
          },
        ])
        .select()

      if (error) throw error

      if (data) {
        setPatients((prev) => [{ ...data[0], birthday: new Date(data[0].birthday) }, ...prev])
        setFilteredPatients((prev) => [{ ...data[0], birthday: new Date(data[0].birthday) }, ...prev])

        resetForm() // Use the new resetForm function

        toast({
          title: "Success",
          description: "Patient profile created successfully",
        })
      }
    } catch (error) {
      console.error("Error creating patient profile:", error)
      toast({
        title: "Error",
        description: "Failed to create patient profile",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              id="name"
              placeholder="PATIENT NAME"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              aria-label="Patient Name"
            />
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
            <Select value={formData.ward} onValueChange={(value) => handleInputChange("ward", value)} aria-label="Ward">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.birthday && "text-muted-foreground",
                  )}
                  aria-label="Select Birthday"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.birthday ? format(formData.birthday, "PPP") : "BIRTHDAY"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.birthday || undefined}
                  onSelect={(date) => handleInputChange("birthday", date || null)}
                  initialFocus
                  defaultMonth={new Date(new Date().getFullYear() - 18, 0, 1)}
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  captionLayout="dropdown-buttons"
                  classNames={{
                    caption_label: "hidden",
                    nav: "space-x-1 flex items-center",
                    caption: "flex justify-center pt-1 relative items-center",
                    dropdown_month: "w-full",
                    dropdown_year: "w-full",
                    dropdown: "p-2",
                    cell: "text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                    day_range_end: "day-range-end",
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "day-outside text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    table: "w-full border-collapse space-y-1",
                    months: "flex flex-col space-y-1",
                  }}
                />
              </PopoverContent>
            </Popover>
            <Input
              id="age"
              placeholder="AGE"
              type="number"
              value={formData.age || ""}
              readOnly
              className="bg-gray-100"
              aria-label="Age"
            />
            <Select
              value={formData.gender}
              onValueChange={(value) => handleInputChange("gender", value)}
              aria-label="Gender"
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="SELECT GENDER" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">MALE</SelectItem>
                <SelectItem value="FEMALE">FEMALE</SelectItem>
                <SelectItem value="OTHER">OTHER</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="encoder"
              placeholder="ENCODER"
              value={formData.encoder}
              onChange={(e) => handleInputChange("encoder", e.target.value)}
              aria-label="Encoder"
            />
          </div>
          <Button onClick={handleCreateProfile} className="mt-6 w-full bg-[#4CAF50] hover:bg-[#45a049] text-white">
            Create Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Birthday</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Encoder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.patient_category}</TableCell>
                      <TableCell>{patient.ward}</TableCell>
                      <TableCell>{format(new Date(patient.birthday), "MMMM d, yyyy")}</TableCell>
                      <TableCell>{patient.age}</TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>{patient.encoder}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

