"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Truck } from "lucide-react"

interface Shuttle {
  id: string
  vehicleNumber: string
  driver?: string
  hotel: string
  capacity: number
  status: "Active" | "Maintenance" | "Inactive"
  createdAt: string
}

export default function ShuttlesPage() {
  const [shuttles, setShuttles] = useState<Shuttle[]>([
    {
      id: "1",
      vehicleNumber: "SH-001",
      driver: "John Smith",
      hotel: "Grand Plaza Hotel",
      capacity: 12,
      status: "Active",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      vehicleNumber: "SH-002",
      hotel: "Airport Inn",
      capacity: 8,
      status: "Maintenance",
      createdAt: "2024-01-20",
    },
    {
      id: "3",
      vehicleNumber: "SH-003",
      driver: "Maria Garcia",
      hotel: "Sky View Resort",
      capacity: 15,
      status: "Active",
      createdAt: "2024-02-01",
    },
  ])

  const hotels = ["Grand Plaza Hotel", "Airport Inn", "Sky View Resort", "Business Center Hotel"]
  const drivers = ["John Smith", "Maria Garcia", "David Wilson", "Sarah Johnson"]
  const statuses = ["Active", "Maintenance", "Inactive"]

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingShuttle, setEditingShuttle] = useState<Shuttle | null>(null)
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    driver: "",
    hotel: "",
    capacity: "",
    status: "Active" as Shuttle["status"],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingShuttle) {
      setShuttles(
        shuttles.map((shuttle) =>
          shuttle.id === editingShuttle.id
            ? {
                ...shuttle,
                ...formData,
                capacity: Number.parseInt(formData.capacity),
                driver: formData.driver || undefined,
              }
            : shuttle,
        ),
      )
      setEditingShuttle(null)
    } else {
      const newShuttle: Shuttle = {
        id: Date.now().toString(),
        ...formData,
        capacity: Number.parseInt(formData.capacity),
        driver: formData.driver || undefined,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setShuttles([...shuttles, newShuttle])
    }
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEdit = (shuttle: Shuttle) => {
    setEditingShuttle(shuttle)
    setFormData({
      vehicleNumber: shuttle.vehicleNumber,
      driver: shuttle.driver || "",
      hotel: shuttle.hotel,
      capacity: shuttle.capacity.toString(),
      status: shuttle.status,
    })
    setIsAddDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setShuttles(shuttles.filter((shuttle) => shuttle.id !== id))
  }

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      driver: "",
      hotel: "",
      capacity: "",
      status: "Active",
    })
    setEditingShuttle(null)
  }

  const getStatusColor = (status: Shuttle["status"]) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Maintenance":
        return "bg-orange-100 text-orange-800"
      case "Inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shuttles Management</h1>
          <p className="text-slate-600">Manage shuttle fleet and assignments</p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Shuttle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingShuttle ? "Edit Shuttle" : "Add New Shuttle"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="hotel">Hotel</Label>
                <Select
                  value={formData.hotel}
                  onValueChange={(value) => setFormData({ ...formData, hotel: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((hotel) => (
                      <SelectItem key={hotel} value={hotel}>
                        {hotel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="SH-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="12"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="driver">Assign Driver (Optional)</Label>
                <Select value={formData.driver} onValueChange={(value) => setFormData({ ...formData, driver: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NoDriver">No driver assigned</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver} value={driver}>
                        {driver}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Shuttle["status"] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingShuttle ? "Update Shuttle" : "Add Shuttle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <span>Shuttles Fleet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle Number</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shuttles.map((shuttle) => (
                <TableRow key={shuttle.id}>
                  <TableCell className="font-medium">{shuttle.vehicleNumber}</TableCell>
                  <TableCell>{shuttle.driver || <span className="text-slate-400">Not assigned</span>}</TableCell>
                  <TableCell>{shuttle.hotel}</TableCell>
                  <TableCell>{shuttle.capacity} passengers</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(shuttle.status)}>{shuttle.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(shuttle.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(shuttle)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(shuttle.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
