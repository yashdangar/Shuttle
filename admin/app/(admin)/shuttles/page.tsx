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
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "@/components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface Shuttle {
  id: string;
  vehicleNumber: string;
  driver?: string;
  hotelId: number;
  seats: number;
  status: "Active" | "Maintenance" | "Inactive";
  createdAt: string;
  startTime: string;
  endTime: string;
  driverId: string | undefined;
}

interface Hotel {
  id: number;
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
  const [loading, setLoading] = useState(true);

  const [hotels, setHotels] = useState<Hotel[]>();
  const [drivers, setDrivers] = useState<Driver[]>();
  const statuses = ["Active", "Maintenance", "Inactive"];

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingShuttle, setEditingShuttle] = useState<Shuttle | null>(null);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    driverId: "",
    hotelId: "",
    seats: "",
    status: "Active" as Shuttle["status"],
    startTime: "",
    endTime: "",
  });
  const formatTimeForDB = (time: string) => {
    if (!time) return null;
    const today = new Date();
    const [hours, minutes] = time.split(":");
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return today.toISOString();
  };
  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await api.get("/admin/get/driver");
        setDrivers(
          response.driver.map((driver: Driver) => ({
            ...driver,
            startTime: formatTimeForDisplay(driver.startTime),
            endTime: formatTimeForDisplay(driver.endTime),
          }))
        );
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
        setShuttles(
          response.shuttle.map((shuttle: Shuttle) => ({
            ...shuttle,
            startTime: formatTimeForDisplay(shuttle.startTime),
            endTime: formatTimeForDisplay(shuttle.endTime),
          }))
        );
      } catch (error) {
        console.error("Error fetching shuttles:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchShuttles();
    fetchHotel();
    fetchDrivers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShuttle) {
      const response = await api.put(
        `/admin/edit/shuttle/${editingShuttle.id}`,
        {
          id: editingShuttle.id,
          vehicleNumber: formData.vehicleNumber,
          driverId:
            formData.driverId === "NoDriver"
              ? undefined
              : parseInt(formData.driverId),
          hotelId: parseInt(formData.hotelId),
          seats: Number.parseInt(formData.seats),
          status: formData.status,
          startTime: formatTimeForDB(formData.startTime),
          endTime: formatTimeForDB(formData.endTime),
        }
      );
      const editedShuttle: Shuttle = {
        id: response.shuttle.id,
        ...formData,
        seats: Number.parseInt(formData.seats),
        driverId:
          formData.driverId === "NoDriver" ? undefined : formData.driverId,
        createdAt: response.shuttle.createdAt,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hotelId: parseInt(formData.hotelId),
      };
      setShuttles(
        shuttles?.map((shuttle) =>
          shuttle.id === editingShuttle.id ? editedShuttle : shuttle
        )
      );
      setEditingShuttle(null);
    } else {
      const response = await api.post("/admin/add/shuttle", {
        vehicleNumber: formData.vehicleNumber,
        driverId:
          formData.driverId === "NoDriver"
            ? undefined
            : parseInt(formData.driverId),
        hotelId: parseInt(formData.hotelId),
        seats: Number.parseInt(formData.seats),
        status: formData.status,
        startTime: formatTimeForDB(formData.startTime),
        endTime: formatTimeForDB(formData.endTime),
      });
      const newShuttle: Shuttle = {
        id: response.shuttle.id,
        ...formData,
        seats: Number.parseInt(formData.seats),
        driverId:
          formData.driverId === "NoDriver" ? undefined : formData.driverId,
        createdAt: response.shuttle.createdAt,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hotelId: parseInt(formData.hotelId),
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
      driverId: shuttle.driverId || "",
      hotelId: shuttle.hotelId.toString(),
      seats: shuttle.seats.toString(),
      status: shuttle.status,
      startTime: shuttle.startTime,
      endTime: shuttle.endTime,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/delete/shuttle/${id}`);
      setShuttles(shuttles?.filter((shuttle) => shuttle.id !== id));
    } catch (error) {
      console.error("Error deleting shuttle:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      driverId: "",
      hotelId: "",
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Shuttles Management
            </h1>
            <p className="text-slate-600">
              Manage shuttle fleet and assignments
            </p>
          </div>
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
                  <TableHead>Created At</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={8} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  value={formData.hotelId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hotelId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels && (
                      <SelectItem
                        key={hotels[0].id}
                        value={hotels[0].id.toString()}
                      >
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
                  value={formData.driverId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, driverId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver (optional)">
                      {formData.driverId && formData.driverId !== "NoDriver"
                        ? drivers?.find((d) => d.id === formData.driverId)?.name
                        : formData.driverId === "NoDriver"
                        ? "No driver assigned"
                        : "Select driver (optional)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NoDriver">No driver assigned</SelectItem>
                    {drivers &&
                      drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
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
          {!shuttles || shuttles.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No shuttles available"
              description="Add your first shuttle to start managing your fleet."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle Number</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shuttles &&
                  shuttles.map((shuttle) => (
                    <TableRow key={shuttle.id}>
                      <TableCell className="font-medium">
                        {shuttle.vehicleNumber}
                      </TableCell>
                      <TableCell>
                        {shuttle.driverId ? (
                          drivers?.find((d) => d.id === shuttle.driverId)?.name
                        ) : (
                          <span className="text-slate-400">
                            No driver assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hotels?.find((h) => h.id === shuttle.hotelId)?.name ||
                          "Unknown Hotel"}
                      </TableCell>
                      <TableCell>{shuttle.seats} seats</TableCell>
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
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
