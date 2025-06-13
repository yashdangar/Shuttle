"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { api } from "@/lib/api";

interface Hotel {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  latitude: number;
  longitude: number;
}

export default function HotelsPage() {
  const [hotel, setHotel] = useState<Hotel | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  }>({
    name: "",
    latitude: 0.0,
    longitude: 0.0,
  });

  const fetchHotelData = async () => {
    try {
      const response = await api.get(`/admin/get/hotel`);
      setHotel(response.hotel);
    } catch (error) {
      console.error("Error fetching hotel data:", error);
    }
  };

  useEffect(() => {
    fetchHotelData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await api.put(`/admin/edit/hotel/${editingHotel.id}`, {
          name: formData.name,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
      } else {
        await api.post("/admin/add/hotel", {
          name: formData.name,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
      }

      // Fetch updated data after successful submission
      await fetchHotelData();

      setFormData({ name: "", latitude: 0.0, longitude: 0.0 });
      setIsAddDialogOpen(false);
      setEditingHotel(null);
    } catch (error) {
      console.error("Error submitting hotel data:", error);
    }
  };

  const handleEdit = async (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/delete/hotel/${id}`);
      // Fetch updated data after successful deletion
      await fetchHotelData();
    } catch (error) {
      console.error("Delete hotel error:", error);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", latitude: 0.0, longitude: 0.0 });
    setEditingHotel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hotels Management
          </h1>
          <p className="text-slate-600">
            Manage hotel partners and their information
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
              Add New Hotel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHotel ? "Edit Hotel" : "Add New Hotel"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Hotel Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter hotel name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      latitude: parseFloat(e.target.value),
                    })
                  }
                  placeholder="Enter latitude"
                  required
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      longitude: parseFloat(e.target.value),
                    })
                  }
                  placeholder="Enter longitude"
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
                  {editingHotel ? "Update Hotel" : "Add Hotel"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Hotels List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel Name</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotel && (
                <TableRow>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>{hotel.latitude}</TableCell>
                  <TableCell>{hotel.longitude}</TableCell>
                  <TableCell>
                    {new Date(hotel.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(hotel.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(hotel)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(hotel.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
