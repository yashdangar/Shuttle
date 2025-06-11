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
import { Plus, Edit, Trash2, Truck } from "lucide-react";
import {api} from "@/lib/api";


interface Shuttle {
  id: string;
  vehicleNumber: string;
  driver?: string;
  hotel: string;
  seats: number;
  status: "Active" | "Maintenance" | "Inactive";
  createdAt: string;
  startTime: string;
  endTime: string;
}

interface Hotel {
  id: string;
  name: string;
}

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
export default function ShuttlesPage() {
  const [shuttles, setShuttles] = useState<Shuttle[]>();


  const [hotels, setHotels] = useState<Hotel[]>();
  const [drivers, setDrivers] = useState<Driver[]>();
  const statuses = ["Active", "Maintenance", "Inactive"];

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingShuttle, setEditingShuttle] = useState<Shuttle | null>(null);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    driver: "",
    hotel: "",
    seats: "",
    status: "Active" as Shuttle["status"],
    startTime: "",
    endTime: "",
  });
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
      try {
        const response = await api.get("/admin/get/driver");
        setDrivers(response.driver.map((driver: Driver) => ({
        ...driver,
        startTime: formatTimeForDisplay(driver.startTime),
        endTime: formatTimeForDisplay(driver.endTime)
        })));
      } catch (error) {
        console.error("Error fetching drivers:", error);
      }
    };
    const fetchHotel = async () => {
      try {
        const response = await api.get("/admin/get/hotel");
        setHotels([
          {
          id: response.hotel.id,
          name: response.hotel.name,
          },
        ]);
      } catch (error) {
        console.error("Error fetching hotels:", error);
      }
    };
    const fetchShuttles = async () => {
      try {
        const response = await api.get("/admin/get/shuttle");
        setShuttles(response.shuttle.map((shuttle: Shuttle) => ({
        ...shuttle,
        startTime: formatTimeForDisplay(shuttle.startTime),
        endTime: formatTimeForDisplay(shuttle.endTime)
        })));
        console.log(response.shuttle);
      } catch (error) {
        console.error("Error fetching shuttles:", error);
      }
    };
    fetchShuttles();
    fetchHotel();
    fetchDrivers();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShuttle) {
      setShuttles(
        shuttles?.map((shuttle) =>
          shuttle.id === editingShuttle.id
            ? {
                ...shuttle,
                ...formData,
                seats: Number.parseInt(formData.seats),
                driver: formData.driver || undefined,
                startTime: formData.startTime,
                endTime: formData.endTime,
              }
            : shuttle
        )
      );
      setEditingShuttle(null);
    } else {
      const newShuttle: Shuttle = {
        id: Date.now().toString(),
        ...formData,
        seats: Number.parseInt(formData.seats),
        driver: formData.driver || undefined,
        createdAt: new Date().toISOString().split("T")[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
      };
      setShuttles([...(shuttles || []), newShuttle]);
    }
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (shuttle: Shuttle) => {
    setEditingShuttle(shuttle);
    setFormData({
      vehicleNumber: shuttle.vehicleNumber,
      driver: shuttle.driver || "",
      hotel: shuttle.hotel,
      seats: shuttle.seats.toString(),
      status: shuttle.status,
      startTime: shuttle.startTime,
      endTime: shuttle.endTime,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setShuttles(shuttles?.filter((shuttle) => shuttle.id !== id));
  };

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      driver: "",
      hotel: "",
      seats: "",
      status: "Active",
      startTime: "",
      endTime: "",
    });
    setEditingShuttle(null);
  };

  const getStatusColor = (status: Shuttle["status"]) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Maintenance":
        return "bg-orange-100 text-orange-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Shuttles Management
          </h1>
          <p className="text-slate-600">Manage shuttle fleet and assignments</p>
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
              Add New Shuttle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingShuttle ? "Edit Shuttle" : "Add New Shuttle"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    {hotels && (
                      <SelectItem key={hotels[0].id} value={hotels[0].id}>
                        {hotels[0].name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNumber: e.target.value })
                  }
                  placeholder="SH-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  value={formData.seats}
                  onChange={(e) =>
                    setFormData({ ...formData, seats: e.target.value })
                  }
                  placeholder="12"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="driver">Assign Driver (Optional)</Label>
                <Select
                  value={formData.driver}
                  onValueChange={(value) =>
                    setFormData({ ...formData, driver: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NoDriver">No driver assigned</SelectItem>
                    {drivers && drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as Shuttle["status"],
                    })
                  }
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
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  placeholder="08:00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  placeholder="18:00"
                  required
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
                <TableHead>Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shuttles && shuttles.map((shuttle) => (
                <TableRow key={shuttle.id}>
                  <TableCell className="font-medium">
                    {shuttle.vehicleNumber}
                  </TableCell>
                  <TableCell>
                    {shuttle.driver || (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>{shuttle.hotel}</TableCell>
                  <TableCell>{shuttle.seats} seats</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(shuttle.status)}>
                      {shuttle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(shuttle.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{shuttle.startTime}</TableCell>
                  <TableCell>{shuttle.endTime}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(shuttle)}
                      >
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
  );
}
