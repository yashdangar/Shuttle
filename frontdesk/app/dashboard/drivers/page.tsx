"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye } from "lucide-react"

const drivers = [
  {
    id: 1,
    name: "John Doe",
    phone: "+1 234-567-8901",
    startTime: "6:00 AM",
    endTime: "10:00 PM",
    assignedShuttle: "SH-001",
    status: "Active",
    licenseNumber: "DL123456789",
    experience: "5 years",
    rating: 4.8,
  },
  {
    id: 2,
    name: "Jane Smith",
    phone: "+1 234-567-8902",
    startTime: "7:00 AM",
    endTime: "11:00 PM",
    assignedShuttle: "SH-002",
    status: "Active",
    licenseNumber: "DL987654321",
    experience: "3 years",
    rating: 4.9,
  },
  {
    id: 3,
    name: "Mike Johnson",
    phone: "+1 234-567-8903",
    startTime: "8:00 AM",
    endTime: "9:00 PM",
    assignedShuttle: "SH-003",
    status: "Off Duty",
    licenseNumber: "DL456789123",
    experience: "7 years",
    rating: 4.7,
  },
]

export default function DriversPage() {
  const [selectedDriver, setSelectedDriver] = useState<(typeof drivers)[0] | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-gray-600">Manage your driver team</p>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Driver Team</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Assigned Shuttle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>{driver.startTime}</TableCell>
                  <TableCell>{driver.endTime}</TableCell>
                  <TableCell>{driver.assignedShuttle}</TableCell>
                  <TableCell>
                    <Badge variant={driver.status === "Active" ? "default" : "secondary"}>{driver.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDriver(driver)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="grid gap-4 md:hidden">
        {drivers.map((driver) => (
          <Card key={driver.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{driver.name}</h3>
                <Badge variant={driver.status === "Active" ? "default" : "secondary"}>{driver.status}</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Phone:</span> {driver.phone}
                </p>
                <p>
                  <span className="font-medium">Schedule:</span> {driver.startTime} - {driver.endTime}
                </p>
                <p>
                  <span className="font-medium">Shuttle:</span> {driver.assignedShuttle}
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setSelectedDriver(driver)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Driver Details Modal */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="font-semibold">{selectedDriver.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge variant={selectedDriver.status === "Active" ? "default" : "secondary"}>
                      {selectedDriver.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="font-semibold">{selectedDriver.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Assigned Shuttle</label>
                  <p className="font-semibold">{selectedDriver.assignedShuttle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Time</label>
                  <p className="font-semibold">{selectedDriver.startTime}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">End Time</label>
                  <p className="font-semibold">{selectedDriver.endTime}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">License Number</label>
                  <p className="font-semibold">{selectedDriver.licenseNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Experience</label>
                  <p className="font-semibold">{selectedDriver.experience}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Rating</label>
                <p className="font-semibold">{selectedDriver.rating}/5.0 ⭐</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
