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
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "../../../components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { withAuth } from "@/components/withAuth";

interface Hotel {
  id: number;
  name: string;
}

interface FrontDesk {
  id: string;
  name: string;
  phoneNumber: string;
  password: string;
  email: string;
  hotel: number;
  createdAt: string;
}

function FrontDesksPage() {
  const [frontDesks, setFrontDesks] = useState<FrontDesk[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingFrontDesk, setEditingFrontDesk] = useState<FrontDesk | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    hotel: "",
  });

  useEffect(() => {
    const fetchFrontDesks = async () => {
      try {
        const response = await api.get(`/admin/get/frontdesk`);
        setFrontDesks(response.frontdesk);
      } catch (error) {
        console.error("Error fetching frontdesks:", error);
        toast.error("Failed to fetch front desk staff");
      } finally {
        setLoading(false);
      }
    };
    const fetchHotel = async () => {
      try {
        const response = await api.get(`/admin/get/hotel`);
        setHotels([
          {
            id: response.hotel.id,
            name: response.hotel.name,
          },
        ]);
        setFormData((prev) => ({
          ...prev,
          hotel: response.hotel.id.toString(),
        }));
      } catch (error) {
        console.error("Error fetching hotels:", error);
        toast.error("Failed to fetch hotel information");
      }
    };
    fetchFrontDesks();
    fetchHotel();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingFrontDesk) {
        const response = await api.put(
          `/admin/edit/frontdesk/${editingFrontDesk.id} `,
          {
            name: formData.name,
            email: formData.email,
            hotelId: parseInt(formData.hotel),
            phoneNumber: formData.phoneNumber,
          }
        );
        setFrontDesks(
          frontDesks.map((fd) =>
            fd.id === editingFrontDesk.id
              ? {
                  ...fd,
                  ...formData,
                  hotel: parseInt(formData.hotel),
                }
              : fd
          )
        );
        setEditingFrontDesk(null);
        toast.success("Front desk staff updated successfully");
      } else {
        const response = await api.post(`/admin/add/frontdesk`, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          hotelId: parseInt(formData.hotel),
          phoneNumber: formData.phoneNumber,
        });
        const frontdesk = response.frontdesk;
        const newFrontDesk: FrontDesk = {
          id: frontdesk.id,
          name: frontdesk.name,
          phoneNumber: frontdesk.phoneNumber,
          email: frontdesk.email,
          hotel: frontdesk.hotelId,
          password: frontdesk.password,
          createdAt: new Date().toISOString().split("T")[0],
        };
        setFrontDesks([...frontDesks, newFrontDesk]);
        toast.success("Front desk staff added successfully");
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error submitting front desk data:", error);
      toast.error("Failed to save front desk staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (frontDesk: FrontDesk) => {
    setEditingFrontDesk(frontDesk);
    setFormData({
      name: frontDesk.name,
      phoneNumber: frontDesk.phoneNumber,
      email: frontDesk.email,
      password: frontDesk.password,
      hotel: hotels[0]?.id.toString() || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await api.delete(`/admin/delete/frontdesk/${id}`);
      setFrontDesks(frontDesks.filter((fd) => fd.id !== id));
      toast.success("Front desk staff deleted successfully");
    } catch (error) {
      console.error("Delete frontdesk error:", error);
      toast.error("Failed to delete front desk staff");
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phoneNumber: "",
      email: "",
      password: "",
      hotel: hotels[0]?.id.toString() || "",
    });
    setEditingFrontDesk(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Front Desk Management
            </h1>
            <p className="text-slate-600">
              Manage front desk staff across all hotel partners
            </p>
          </div>
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
                  {/* <TableHead>Hotel</TableHead> */}
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
            Front Desk Management
          </h1>
          <p className="text-slate-600">
            Manage front desk staff across all hotel partners
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
              Add New Front Desk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFrontDesk
                  ? "Edit Front Desk Staff"
                  : "Add New Front Desk Staff"}
              </DialogTitle>
              <DialogDescription>
                {editingFrontDesk
                  ? "Update the front desk staff information below."
                  : "Fill in the details to add a new front desk staff member."}
              </DialogDescription>
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
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder="+1-555-0123"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@hotel.com"
                  required
                  disabled={submitting}
                />
              </div>
              <div className={editingFrontDesk ? "hidden" : ""}>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required={!editingFrontDesk}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={submitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="hotel">Hotel</Label>
                <Select value={hotels[0]?.id.toString() || "default"} disabled>
                  <SelectTrigger>
                    <SelectValue>{hotels[0]?.name || "Loading..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={hotels[0]?.id.toString() || "default"}>
                      {hotels[0]?.name || "Loading..."}
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                      {editingFrontDesk ? "Updating..." : "Adding..."}
                    </>
                  ) : editingFrontDesk ? (
                    "Update Staff"
                  ) : (
                    "Add Staff"
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
            <Users className="w-5 h-5 text-green-600" />
            <span>Front Desk Staff</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {frontDesks.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No front desk staff available"
              description="Add your first front desk staff to start managing your partners."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  {/* <TableHead>Hotel</TableHead> */}
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frontDesks.map((frontDesk) => (
                  <TableRow key={frontDesk.id}>
                    <TableCell className="font-medium">
                      {frontDesk.name}
                    </TableCell>
                    <TableCell>{frontDesk.phoneNumber}</TableCell>
                    <TableCell>{frontDesk.email}</TableCell>
                    {/* <TableCell>{hotels[0]?.name || "N/A"}</TableCell> */}
                    <TableCell>
                      {new Date(frontDesk.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(frontDesk)}
                          disabled={deleting === frontDesk.id}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(frontDesk.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={deleting === frontDesk.id}
                        >
                          {deleting === frontDesk.id ? (
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

export default withAuth(FrontDesksPage);