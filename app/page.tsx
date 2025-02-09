import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DispensingTab from "@/components/dispensing-tab"
import InventoryTab from "@/components/inventory-tab"
import RestockingTab from "@/components/restocking-tab"
import PatientDirectoryTab from "@/components/patient-directory-tab"
import DataTab from "@/components/data-tab"
import ReportsTab from "@/components/reports-tab"

export default function Home() {
  return (
    <Tabs defaultValue="dispensing" className="w-full">
      <TabsList className="bg-white mb-6 border-b w-full justify-start">
        <TabsTrigger
          value="dispensing"
          className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none"
        >
          Dispensing
        </TabsTrigger>
        <TabsTrigger
          value="inventory"
          className="px-6 py-2 text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none"
        >
          Inventory
        </TabsTrigger>
        <TabsTrigger
          value="restocking"
          className="px-6 py-2 text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none"
        >
          Restocking
        </TabsTrigger>
        <TabsTrigger
          value="patient-directory"
          className="px-6 py-2 text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none"
        >
          Patient Directory
        </TabsTrigger>
        <TabsTrigger
          value="data"
          className="px-6 py-2 text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none"
        >
          Data
        </TabsTrigger>
        <TabsTrigger
          value="reports"
          className="px-6 py-2 text-gray-500 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none"
        >
          Reports
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dispensing">
        <DispensingTab />
      </TabsContent>
      <TabsContent value="inventory">
        <InventoryTab />
      </TabsContent>
      <TabsContent value="restocking">
        <RestockingTab />
      </TabsContent>
      <TabsContent value="patient-directory">
        <PatientDirectoryTab />
      </TabsContent>
      <TabsContent value="data">
        <DataTab />
      </TabsContent>
      <TabsContent value="reports">
        <ReportsTab />
      </TabsContent>
    </Tabs>
  )
}

