"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Car } from "lucide-react";
import { api } from "@/lib/api";

interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  hotel: string;
  assignedShuttle?: string;
  createdAt: string;
  startTime: string;
  endTime: string;
}

interface Hotel {
  id: number;
  name: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const shuttles = ["SH-001", "SH-002", "SH-003", "SH-004", "SH-005"];

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    hotel: hotels[0]?.id.toString() || "",
    assignedShuttle: "",
    startTime: "",
    endTime: "",
  });

  const formatTimeForDB = (time: string) => {
    if (!time) return null;
    const today = new Date();
    const [hours, minutes] = time.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return today.toISOString();
  };

  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const fetchDrivers = async () => {
      const response = await api.get("/admin/get/driver");
      setDrivers(response.driver.map((driver: Driver) => ({
        ...driver,
        startTime: formatTimeForDisplay(driver.startTime),
        endTime: formatTimeForDisplay(driver.endTime)
      })));
    };
    const fetchHotel = async () => {
      const response = await api.get("/admin/get/hotel");
      setHotels([
        {
          id: response.hotel.id,
          name: response.hotel.name,
        },
      ]);
    };
    fetchDrivers();
    fetchHotel();
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      const response = await api.put(`/admin/edit/driver/${editingDriver.id}`, {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        hotelId: parseInt(hotels[0]?.id.toString() || ""),
        assignedShuttle:
          formData.assignedShuttle === "none"
            ? undefined
            : formData.assignedShuttle,
        startTime: formatTimeForDB(formData.startTime),
        endTime: formatTimeForDB(formData.endTime),
      });
      if (drivers) {
        setDrivers(
          drivers.map((driver) =>
            driver.id === editingDriver.id
              ? {
                  ...driver,
                  ...formData,
                  assignedShuttle:
                    formData.assignedShuttle === "none"
                      ? undefined
                      : formData.assignedShuttle,
                }
              : driver
          )
        );
        setEditingDriver(null);
      }
    } else {
      const response = await api.post("/admin/add/driver", {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        hotelId: parseInt(hotels[0]?.id.toString() || ""),
        assignedShuttle:
          formData.assignedShuttle === "none"
            ? undefined
            : formData.assignedShuttle,
        startTime: formatTimeForDB(formData.startTime),
        endTime: formatTimeForDB(formData.endTime),
      });
      const newDriver: Driver = {
        id: response.driver.id,
        ...formData,
        assignedShuttle:
          formData.assignedShuttle === "none"
            ? undefined
            : formData.assignedShuttle,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDrivers([...(drivers || []), newDriver]);
    }
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      hotel: hotels[0]?.id.toString() || "",
      assignedShuttle: driver.assignedShuttle || "",
      startTime: driver.startTime || "",
      endTime: driver.endTime || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.delete(`/admin/delete/driver/${id}`);
      setDrivers(drivers?.filter((driver) => driver.id !== id) || []);
    } catch (error) {
      console.error("Delete driver error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phoneNumber: "",
      hotel: hotels[0]?.id.toString() || "",
      assignedShuttle: "",
      startTime: "",
      endTime: "",
    });
    setEditingDriver(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Drivers Management
          </h1>
          <p className="text-slate-600">
            Manage shuttle drivers and their assignments
          </p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
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
              <DialogTitle>
                {editingDriver ? "Edit Driver" : "Add New Driver"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder="+1-555-0123"
                  required
                />
              </div>
              <div>
                <Label htmlFor="hotel">Hotel</Label>
                <Select
                  value={formData.hotel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hotel: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      key={hotels[0]?.id}
                      value={hotels[0]?.id.toString()}
                    >
                      {hotels[0]?.name}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shuttle">Assigned Shuttle (Optional)</Label>
                <Select
                  value={formData.assignedShuttle}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedShuttle: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shuttle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No shuttle assigned</SelectItem>
                    {shuttles.map((shuttle) => (
                      <SelectItem key={shuttle} value={shuttle}>
                        {shuttle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
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
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers?.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.phoneNumber}</TableCell>
                  <TableCell>{hotels[0]?.name}</TableCell>
                  <TableCell>
                    {driver.assignedShuttle ? (
                      <Badge variant="secondary">
                        {driver.assignedShuttle}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>{driver.startTime}</TableCell>
                  <TableCell>{driver.endTime}</TableCell>
                  <TableCell>
                    {new Date(driver.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(driver)}
                      >
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
  );
}
