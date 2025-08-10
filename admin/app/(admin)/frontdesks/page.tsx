"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  User,
  Mail,
  Phone,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "../../../components/ui/table-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { withAuth } from "@/components/withAuth";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

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

  // List controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "email" | "createdAt">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Delete confirm dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [frontDeskToDelete, setFrontDeskToDelete] = useState<FrontDesk | null>(null);
  const [confirmAcknowledge, setConfirmAcknowledge] = useState(false);

  const fetchFrontDesks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/get/frontdesk`);
      setFrontDesks(Array.isArray(response?.frontdesk) ? response.frontdesk : []);
    } catch (error) {
      console.error("Error fetching frontdesks:", error);
      toast.error("Failed to fetch front desk staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrontDesks();
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
          `/admin/edit/frontdesk/${editingFrontDesk.id}`,
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
                  name: formData.name,
                  email: formData.email,
                  phoneNumber: formData.phoneNumber,
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
          password: "",
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
      password: "",
      hotel: hotels[0]?.id.toString() || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/delete/frontdesk/${id}`);
      setFrontDesks(frontDesks.filter((fd) => fd.id !== id));
      toast.success("Front desk staff deleted successfully");
    } catch (error) {
      console.error("Delete frontdesk error:", error);
      toast.error("Failed to delete front desk staff");
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = async () => {
    if (!frontDeskToDelete) return;
    await handleDelete(frontDeskToDelete.id);
    setIsDeleteDialogOpen(false);
    setFrontDeskToDelete(null);
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

  // Derived lists
  const filteredFrontDesks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return frontDesks;
    return frontDesks.filter((fd) =>
      [fd.name, fd.email, fd.phoneNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [frontDesks, searchQuery]);

  const sortedFrontDesks = useMemo(() => {
    const copy = [...filteredFrontDesks];
    copy.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "createdAt") {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      } else {
        av = String(a[sortKey] ?? "").toLowerCase();
        bv = String(b[sortKey] ?? "").toLowerCase();
      }
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredFrontDesks, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedFrontDesks.length / pageSize));
  const pagedFrontDesks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFrontDesks.slice(start, start + pageSize);
  }, [currentPage, sortedFrontDesks]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortKey, sortDirection]);

  if (loading) {
    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Front Desk Management</h1>
            <p className="text-slate-600">Manage front desk staff across all hotel partners</p>
          </div>
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <span>Front Desk Staff</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={5} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Front Desk Management</h1>
        <p className="text-slate-600">Manage front desk staff across all hotel partners</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <span>Front Desk Staff</span>
              <Badge variant="secondary" className="ml-1">{frontDesks.length}</Badge>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={fetchFrontDesks} disabled={loading} className="sm:ml-2">
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Dialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                  setIsAddDialogOpen(open);
                  if (!open) resetForm();
                  setShowPassword(false);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 sm:ml-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Front Desk
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingFrontDesk ? "Edit Front Desk Staff" : "Add New Front Desk Staff"}
                    </DialogTitle>
                    <p className="text-sm text-slate-500">
                      {editingFrontDesk
                        ? "Update the front desk staff information below."
                        : "Fill in the details to add a new front desk staff member."}
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          required
                          disabled={submitting}
                          autoComplete="name"
                          autoFocus
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Enter the staff member's full name.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="frontdesk@example.com"
                          required
                          disabled={submitting}
                          autoComplete="email"
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Used for login and communication.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          placeholder="+1 555 0123"
                          required
                          disabled={submitting}
                          inputMode="tel"
                          autoComplete="tel"
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Include country code if outside your region.</p>
                    </div>
                    {!editingFrontDesk && (
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Create a strong password"
                            required
                            disabled={submitting}
                            autoComplete="new-password"
                            className="pl-8 pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            disabled={submitting}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">Use at least 8 characters, mixing letters and numbers.</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
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
          </div>
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
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Name
                      {sortKey === "name" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("email")}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Email
                      {sortKey === "email" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <button
                      type="button"
                      onClick={() => handleSort("createdAt")}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Created
                      {sortKey === "createdAt" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedFrontDesks.map((frontDesk) => (
                  <TableRow key={frontDesk.id}>
                    <TableCell className="font-medium">{frontDesk.name}</TableCell>
                    <TableCell>{frontDesk.email}</TableCell>
                    <TableCell>{frontDesk.phoneNumber}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(frontDesk.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                          onClick={() => {
                            setFrontDeskToDelete(frontDesk);
                            setConfirmAcknowledge(false);
                            setIsDeleteDialogOpen(true);
                          }}
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
        {frontDesks && frontDesks.length > 0 ? (
          <div className="flex items-center justify-between px-6 pb-6 pt-2 text-sm text-slate-600">
            <div>
              Showing {pagedFrontDesks.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
              {Math.min(currentPage * pageSize, sortedFrontDesks.length)} of {sortedFrontDesks.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setFrontDeskToDelete(null);
            setConfirmAcknowledge(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete front desk user</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting a front desk user will permanently remove their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {frontDeskToDelete ? (
            <div className="mt-2 rounded-md border bg-white/80 p-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">{frontDeskToDelete.name}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5">{frontDeskToDelete.email}</span>
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5">{frontDeskToDelete.phoneNumber}</span>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <Checkbox id="acknowledge" checked={confirmAcknowledge} onCheckedChange={(v) => setConfirmAcknowledge(Boolean(v))} />
            <label htmlFor="acknowledge" className="select-none">I understand that this action is permanent.</label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!confirmAcknowledge || !!deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting === frontDeskToDelete?.id ? (
                <span className="inline-flex items-center gap-2">
                  <Loader className="h-4 w-4" /> Deleting...
                </span>
              ) : (
                "Delete user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default withAuth(FrontDesksPage);