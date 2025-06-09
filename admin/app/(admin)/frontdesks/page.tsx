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
import { Plus, Edit, Trash2, Users } from "lucide-react"

interface FrontDesk {
  id: string
  name: string
  phone: string
  email: string
  hotel: string
  createdAt: string
}

export default function FrontDesksPage() {
  const [frontDesks, setFrontDesks] = useState<FrontDesk[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      phone: "+1-555-0123",
      email: "sarah@grandplaza.com",
      hotel: "Grand Plaza Hotel",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Mike Chen",
      phone: "+1-555-0124",
      email: "mike@airportinn.com",
      hotel: "Airport Inn",
      createdAt: "2024-01-20",
    },
    {
      id: "3",
      name: "Emily Davis",
      phone: "+1-555-0125",
      email: "emily@skyview.com",
      hotel: "Sky View Resort",
      createdAt: "2024-02-01",
    },
  ])

  const hotels = ["Grand Plaza Hotel", "Airport Inn", "Sky View Resort", "Business Center Hotel"]

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingFrontDesk, setEditingFrontDesk] = useState<FrontDesk | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    hotel: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingFrontDesk) {
      setFrontDesks(frontDesks.map((fd) => (fd.id === editingFrontDesk.id ? { ...fd, ...formData } : fd)))
      setEditingFrontDesk(null)
    } else {
      const newFrontDesk: FrontDesk = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setFrontDesks([...frontDesks, newFrontDesk])
    }
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEdit = (frontDesk: FrontDesk) => {
    setEditingFrontDesk(frontDesk)
    setFormData({
      name: frontDesk.name,
      phone: frontDesk.phone,
      email: frontDesk.email,
      password: "",
      hotel: frontDesk.hotel,
    })
    setIsAddDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setFrontDesks(frontDesks.filter((fd) => fd.id !== id))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      password: "",
      hotel: "",
    })
    setEditingFrontDesk(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Front Desk Management</h1>
          <p className="text-slate-600">Manage front desk staff across all hotel partners</p>
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
              Add New Front Desk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingFrontDesk ? "Edit Front Desk Staff" : "Add New Front Desk Staff"}</DialogTitle>
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@hotel.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required={!editingFrontDesk}
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
                  {editingFrontDesk ? "Update Staff" : "Add Staff"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-green-600" />
            <span>Front Desk Staff</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frontDesks.map((frontDesk) => (
                <TableRow key={frontDesk.id}>
                  <TableCell className="font-medium">{frontDesk.name}</TableCell>
                  <TableCell>{frontDesk.phone}</TableCell>
                  <TableCell>{frontDesk.email}</TableCell>
                  <TableCell>{frontDesk.hotel}</TableCell>
                  <TableCell>{new Date(frontDesk.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(frontDesk)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(frontDesk.id)}
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
