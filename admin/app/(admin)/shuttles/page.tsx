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
import { toast } from "sonner";
import { withAuth } from "@/components/withAuth";

interface Shuttle {
  id: string;
  vehicleNumber: string;
  hotelId: number;
  seats: number;
  createdAt: string;
  schedules?: Schedule[];
}

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  driver: {
    id: string;
    name: string;
  };
}

interface Hotel {
  id: number;
  name: string;
}

function ShuttlesPage() {
  const [shuttles, setShuttles] = useState<Shuttle[]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingShuttle, setEditingShuttle] = useState<Shuttle | null>(null);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    hotelId: "",
    seats: "",
  });

  useEffect(() => {
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
        toast.error("Failed to fetch hotel information");
      }
    };
    const fetchShuttles = async () => {
      try {
        const response = await api.get("/admin/get/shuttle");
        setShuttles(response.shuttles);
      } catch (error) {
        console.error("Error fetching shuttles:", error);
        toast.error("Failed to fetch shuttles");
      } finally {
        setLoading(false);
      }
    };
    fetchShuttles();
    fetchHotel();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingShuttle) {
        const response = await api.put(
          `/admin/edit/shuttle/${editingShuttle.id}`,
          {
            vehicleNumber: formData.vehicleNumber,
            hotelId: parseInt(formData.hotelId),
            seats: Number.parseInt(formData.seats),
          }
        );
        const editedShuttle: Shuttle = {
          id: response.shuttle.id,
          vehicleNumber: formData.vehicleNumber,
          seats: Number.parseInt(formData.seats),
          createdAt: response.shuttle.createdAt,
          hotelId: parseInt(formData.hotelId),
          schedules: editingShuttle.schedules,
        };
        setShuttles(
          shuttles?.map((shuttle) =>
            shuttle.id === editingShuttle.id ? editedShuttle : shuttle
          )
        );
        setEditingShuttle(null);
        toast.success("Shuttle updated successfully");
      } else {
        const response = await api.post("/admin/add/shuttle", {
          vehicleNumber: formData.vehicleNumber,
          hotelId: parseInt(formData.hotelId),
          seats: Number.parseInt(formData.seats),
        });
        const newShuttle: Shuttle = {
          id: response.shuttle.id,
          vehicleNumber: formData.vehicleNumber,
          seats: Number.parseInt(formData.seats),
          createdAt: response.shuttle.createdAt,
          hotelId: parseInt(formData.hotelId),
          schedules: [],
        };
        setShuttles([...(shuttles || []), newShuttle]);
        toast.success("Shuttle added successfully");
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error submitting shuttle:", error);
      toast.error("Failed to save shuttle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (shuttle: Shuttle) => {
    setEditingShuttle(shuttle);
    setFormData({
      vehicleNumber: shuttle.vehicleNumber,
      hotelId: shuttle.hotelId.toString(),
      seats: shuttle.seats.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/delete/shuttle/${id}`);
      setShuttles(shuttles?.filter((shuttle) => shuttle.id !== id));
      toast.success("Shuttle deleted successfully");
    } catch (error) {
      console.error("Error deleting shuttle:", error);
      toast.error("Failed to delete shuttle");
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      hotelId: "",
      seats: "",
    });
    setEditingShuttle(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Shuttles Management
            </h1>
            <p className="text-slate-600">Manage shuttle fleet information</p>
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
                  <TableHead>Hotel</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Assigned Schedules</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={6} />
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
          <p className="text-slate-600">Manage shuttle fleet information</p>
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
          <DialogContent className="max-w-md">
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 mr-2" />
                      {editingShuttle ? "Updating..." : "Adding..."}
                    </>
                  ) : editingShuttle ? (
                    "Update Shuttle"
                  ) : (
                    "Add Shuttle"
                  )}
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
                  <TableHead>Hotel</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Assigned Schedules</TableHead>
                  <TableHead>Created At</TableHead>
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
                        {hotels?.find((h) => h.id === shuttle.hotelId)?.name ||
                          "Unknown Hotel"}
                      </TableCell>
                      <TableCell>{shuttle.seats} seats</TableCell>
                      <TableCell>
                        {shuttle.schedules && shuttle.schedules.length > 0 ? (
                          <div className="space-y-1">
                            {shuttle.schedules.map((schedule) => (
                              <Badge
                                key={schedule.id}
                                variant="secondary"
                                className="mr-1"
                              >
                                {schedule.driver.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">No schedules</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(shuttle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(shuttle)}
                            disabled={deleting === shuttle.id}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(shuttle.id)}
                            disabled={deleting === shuttle.id}
                          >
                            {deleting === shuttle.id ? (
                              <Loader className="w-4 h-4" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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

export default withAuth(ShuttlesPage);