"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye } from "lucide-react"

const shuttles = [
  {
    id: 1,
    shuttleNumber: "SH-001",
    driverName: "John Doe",
    startTime: "6:00 AM",
    endTime: "10:00 PM",
    totalSeats: 12,
    status: "Active",
    phone: "+1 234-567-8901",
    licensePlate: "ABC-123",
  },
  {
    id: 2,
    shuttleNumber: "SH-002",
    driverName: "Jane Smith",
    startTime: "7:00 AM",
    endTime: "11:00 PM",
    totalSeats: 15,
    status: "Active",
    phone: "+1 234-567-8902",
    licensePlate: "DEF-456",
  },
  {
    id: 3,
    shuttleNumber: "SH-003",
    driverName: "Mike Johnson",
    startTime: "8:00 AM",
    endTime: "9:00 PM",
    totalSeats: 10,
    status: "Maintenance",
    phone: "+1 234-567-8903",
    licensePlate: "GHI-789",
  },
]

export default function ShuttlesPage() {
  const [selectedShuttle, setSelectedShuttle] = useState<(typeof shuttles)[0] | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shuttles</h1>
        <p className="text-gray-600">Manage your shuttle fleet</p>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Shuttle Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shuttle Number</TableHead>
                <TableHead>Driver Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Total Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shuttles.map((shuttle) => (
                <TableRow key={shuttle.id}>
                  <TableCell className="font-medium">{shuttle.shuttleNumber}</TableCell>
                  <TableCell>{shuttle.driverName}</TableCell>
                  <TableCell>{shuttle.startTime}</TableCell>
                  <TableCell>{shuttle.endTime}</TableCell>
                  <TableCell>{shuttle.totalSeats}</TableCell>
                  <TableCell>
                    <Badge variant={shuttle.status === "Active" ? "default" : "secondary"}>{shuttle.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedShuttle(shuttle)}>
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
        {shuttles.map((shuttle) => (
          <Card key={shuttle.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{shuttle.shuttleNumber}</h3>
                <Badge variant={shuttle.status === "Active" ? "default" : "secondary"}>{shuttle.status}</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Driver:</span> {shuttle.driverName}
                </p>
                <p>
                  <span className="font-medium">Schedule:</span> {shuttle.startTime} - {shuttle.endTime}
                </p>
                <p>
                  <span className="font-medium">Seats:</span> {shuttle.totalSeats}
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setSelectedShuttle(shuttle)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shuttle Details Modal */}
      <Dialog open={!!selectedShuttle} onOpenChange={() => setSelectedShuttle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shuttle Details</DialogTitle>
          </DialogHeader>
          {selectedShuttle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Shuttle Number</label>
                  <p className="font-semibold">{selectedShuttle.shuttleNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge variant={selectedShuttle.status === "Active" ? "default" : "secondary"}>
                      {selectedShuttle.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Driver Name</label>
                  <p className="font-semibold">{selectedShuttle.driverName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="font-semibold">{selectedShuttle.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Time</label>
                  <p className="font-semibold">{selectedShuttle.startTime}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">End Time</label>
                  <p className="font-semibold">{selectedShuttle.endTime}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Seats</label>
                  <p className="font-semibold">{selectedShuttle.totalSeats}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">License Plate</label>
                  <p className="font-semibold">{selectedShuttle.licensePlate}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
