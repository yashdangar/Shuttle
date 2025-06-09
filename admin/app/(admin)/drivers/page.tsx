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
import { Plus, Edit, Trash2, Car } from "lucide-react"

interface Driver {
  id: string
  name: string
  phone: string
  hotel: string
  assignedShuttle?: string
  createdAt: string
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([
    {
      id: "1",
      name: "John Smith",
      phone: "+1-555-0201",
      hotel: "Grand Plaza Hotel",
      assignedShuttle: "SH-001",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Maria Garcia",
      phone: "+1-555-0202",
      hotel: "Airport Inn",
      assignedShuttle: "SH-003",
      createdAt: "2024-01-20",
    },
    {
      id: "3",
      name: "David Wilson",
      phone: "+1-555-0203",
      hotel: "Sky View Resort",
      createdAt: "2024-02-01",
    },
  ])

  const hotels = ["Grand Plaza Hotel", "Airport Inn", "Sky View Resort", "Business Center Hotel"]
  const shuttles = ["SH-001", "SH-002", "SH-003", "SH-004", "SH-005"]

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    hotel: hotels[0], // Updated default value to be a non-empty string
    assignedShuttle: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDriver) {
      setDrivers(
        drivers.map((driver) =>
          driver.id === editingDriver.id
            ? { ...driver, ...formData, assignedShuttle: formData.assignedShuttle || undefined }
            : driver,
        ),
      )
      setEditingDriver(null)
    } else {
      const newDriver: Driver = {
        id: Date.now().toString(),
        ...formData,
        assignedShuttle: formData.assignedShuttle || undefined,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setDrivers([...drivers, newDriver])
    }
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone,
      hotel: driver.hotel,
      assignedShuttle: driver.assignedShuttle || "",
    })
    setIsAddDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setDrivers(drivers.filter((driver) => driver.id !== id))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      hotel: hotels[0], // Updated default value to be a non-empty string
      assignedShuttle: "",
    })
    setEditingDriver(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers Management</h1>
          <p className="text-slate-600">Manage shuttle drivers and their assignments</p>
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
              Add New Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-555-0123"
                  required
                />
              </div>
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
                <Label htmlFor="shuttle">Assigned Shuttle (Optional)</Label>
                <Select
                  value={formData.assignedShuttle}
                  onValueChange={(value) => setFormData({ ...formData, assignedShuttle: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shuttle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No shuttle assigned</SelectItem>
                    {shuttles.map((shuttle) => (
                      <SelectItem key={shuttle} value={shuttle}>
                        {shuttle}
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
                  {editingDriver ? "Update Driver" : "Add Driver"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-purple-600" />
            <span>Drivers List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Assigned Shuttle</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>{driver.hotel}</TableCell>
                  <TableCell>
                    {driver.assignedShuttle ? (
                      <Badge variant="secondary">{driver.assignedShuttle}</Badge>
                    ) : (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(driver.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(driver)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(driver.id)}
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
