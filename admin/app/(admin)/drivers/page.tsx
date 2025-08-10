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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  User,
  BusFront,
  CalendarClock,
  Plus,
  Edit,
  Trash2,
  EyeOff,
  Lock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { EmptyState } from "../../../components/ui/empty-state";
import { toast } from "sonner";
import { withAuth } from "@/components/withAuth";

interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  schedules?: Schedule[];
}

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  shuttle: {
    id: string;
    vehicleNumber: string;
  };
}

interface Hotel {
  id: number;
  name: string;
}

function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "email" | "createdAt">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [copiedField, setCopiedField] = useState<null | "email" | "phone">(null);
  const DISPLAY_TZ = "Asia/Kolkata";
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [confirmAcknowledge, setConfirmAcknowledge] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    hotel: "",
  });

  // Helper: format in hotel timezone (IST)
  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: DISPLAY_TZ,
    });
  };

  // Helper: compare dates by day in a specific timezone
  const isSameDateInTimeZone = (d1: Date, d2: Date, tz: string) => {
    const fmt: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: tz,
    };
    const a = d1.toLocaleDateString("en-CA", fmt); // YYYY-MM-DD
    const b = d2.toLocaleDateString("en-CA", fmt);
    return a === b;
  };

  const copyToClipboard = async (text: string, key: "email" | "phone") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1200);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/get/driver");
      setDrivers(Array.isArray(response?.drivers) ? response.drivers : []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
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
    fetchHotel();
  }, []);

  const filteredDrivers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return drivers;
    return drivers.filter((d) =>
      [d.name, d.email, d.phoneNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query))
    );
  }, [drivers, searchQuery]);

  const sortedDrivers = useMemo(() => {
    const copy = [...filteredDrivers];
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
  }, [filteredDrivers, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedDrivers.length / pageSize));
  const pagedDrivers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDrivers.slice(start, start + pageSize);
  }, [currentPage, sortedDrivers]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingDriver) {
        const response = await api.put(
          `/admin/edit/driver/${editingDriver.id}`,
          {
            name: formData.name,
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            hotelId: parseInt(hotels[0]?.id.toString() || ""),
          }
        );
        if (drivers) {
          setDrivers(
            drivers.map((driver) =>
              driver.id === editingDriver.id
                ? {
                    ...driver,
                    name: formData.name,
                    phoneNumber: formData.phoneNumber,
                    email: formData.email,
                  }
                : driver
            )
          );
          setEditingDriver(null);
        }
        toast.success("Driver updated successfully");
      } else {
        const response = await api.post("/admin/add/driver", {
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          password: formData.password,
          hotelId: parseInt(hotels[0]?.id.toString() || ""),
        });
        const newDriver: Driver = {
          id: response.driver.id,
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          hotel: hotels[0]?.name || "",
          createdAt: new Date().toISOString().split("T")[0],
          schedules: [],
        };
        setDrivers([...(drivers || []), newDriver]);
        toast.success("Driver added successfully");
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error submitting driver:", error);
      toast.error("Failed to save driver");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      email: driver.email,
      password: "", // Don't pre-fill password for security
      hotel: hotels[0]?.id.toString() || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await api.delete(`/admin/delete/driver/${id}`);
      setDrivers((prev) => prev.filter((driver) => driver.id !== id));
      toast.success("Driver deleted successfully");
    } catch (error) {
      console.error("Delete driver error:", error);
      toast.error("Failed to delete driver");
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;
    await handleDelete(driverToDelete.id);
    setIsDeleteDialogOpen(false);
    setDriverToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phoneNumber: "",
      email: "",
      password: "",
      hotel: hotels[0]?.id.toString() || "",
    });
    setEditingDriver(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Skeleton className="h-9 w-full sm:w-64" />
                <Skeleton className="h-9 w-24 sm:ml-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-12 bg-muted/40 px-4 py-2 text-sm font-medium text-slate-600">
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Schedules</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                    <div className="col-span-3 flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="col-span-3">
                      <Skeleton className="h-5 w-56" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-28" />
                    </div>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Drivers Management</h1>
        <p className="text-slate-600">Manage shuttle drivers and their information</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Drivers List</span>
              <Badge variant="secondary" className="ml-1">{drivers.length}</Badge>
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
              <Button variant="outline" onClick={fetchDrivers} disabled={loading} className="sm:ml-2">
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
                    Add New Driver
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDriver ? "Edit Driver" : "Add New Driver"}
                    </DialogTitle>
                    <p className="text-sm text-slate-500">
                      {editingDriver
                        ? "Update the driver's details."
                        : "Create a new driver account for your hotel."}
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
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="John Doe"
                          required
                          disabled={submitting}
                          autoComplete="name"
                          autoFocus
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Enter the driver's legal full name.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="driver@example.com"
                          required
                          disabled={submitting}
                          autoComplete="email"
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-slate-500">This will be used for login and communication.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, phoneNumber: e.target.value })
                          }
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
                    {!editingDriver && (
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({ ...formData, password: e.target.value })
                            }
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
                            {editingDriver ? "Updating..." : "Adding..."}
                          </>
                        ) : editingDriver ? (
                          "Update Driver"
                        ) : (
                          "Add Driver"
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
          {!drivers || drivers.length === 0 ? (
            <EmptyState
              icon={User}
              title="No drivers available"
              description="Add your first driver to start managing your fleet."
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
                  <TableHead>Schedules</TableHead>
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
                {pagedDrivers?.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {driver.name
                              ?.split(" ")
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{driver.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.phoneNumber}</TableCell>
                    <TableCell>
                      {(() => {
                        const today = new Date();
                        const todays = (driver.schedules || []).filter((s) =>
                          isSameDateInTimeZone(new Date(s.startTime), today, DISPLAY_TZ)
                        );
                        if (todays.length === 0) {
                          return <span className="text-slate-400">No schedules today</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {todays.map((s) => (
                              <Badge key={s.id} variant="secondary" className="whitespace-nowrap">
                                {formatTimeForDisplay(s.startTime)} - {formatTimeForDisplay(s.endTime)}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(driver.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDriver(driver)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(driver)}
                          disabled={deleting === driver.id}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDriverToDelete(driver);
                            setConfirmAcknowledge(false);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                          disabled={deleting === driver.id}
                        >
                          {deleting === driver.id ? (
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
        {drivers && drivers.length > 0 ? (
          <div className="flex items-center justify-between px-6 pb-6 pt-2 text-sm text-slate-600">
            <div>
              Showing {(pagedDrivers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0)}-
              {Math.min(currentPage * pageSize, sortedDrivers.length)} of {sortedDrivers.length}
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

      {/* Driver Details Modal */}
      <Dialog
        open={!!selectedDriver}
        onOpenChange={() => setSelectedDriver(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {selectedDriver.name
                      ?.split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedDriver.name}</h3>
                      <p className="text-sm text-slate-500">Joined {new Date(selectedDriver.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`tel:${selectedDriver.phoneNumber}`}>
                                <Phone className="h-4 w-4 mr-2" /> Call
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Call driver</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${selectedDriver.email}`}>
                                <Mail className="h-4 w-4 mr-2" /> Email
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Email driver</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-white p-3">
                      <div className="text-xs text-slate-500">Email</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 truncate">{selectedDriver.email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(selectedDriver.email, "email")}
                          aria-label="Copy email"
                        >
                          {copiedField === "email" ? (
                            <ChevronDown className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <div className="text-xs text-slate-500">Phone</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 truncate">{selectedDriver.phoneNumber}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(selectedDriver.phoneNumber, "phone")}
                          aria-label="Copy phone"
                        >
                          {copiedField === "phone" ? (
                            <ChevronDown className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Today's Schedules</label>
                  <Badge variant="secondary">{selectedDriver.schedules?.length ?? 0}</Badge>
                </div>
                {selectedDriver.schedules && selectedDriver.schedules.length > 0 ? (
                  <ScrollArea className="mt-3 max-h-64 pr-2">
                    <div className="space-y-3">
                      {selectedDriver.schedules.map((schedule) => (
                        <div key={schedule.id} className="relative pl-6">
                          <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
                          <div className="rounded-lg border bg-white p-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="inline-flex items-center text-sm text-slate-600">
                                <CalendarClock className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="font-medium text-slate-900">
                                  {formatTimeForDisplay(schedule.startTime)}
                                </span>
                                <span className="mx-1 text-slate-400">–</span>
                                <span className="font-medium text-slate-900">
                                  {formatTimeForDisplay(schedule.endTime)}
                                </span>
                              </div>
                              <Badge variant="outline" className="inline-flex items-center gap-1">
                                <BusFront className="h-3.5 w-3.5" />
                                {schedule.shuttle.vehicleNumber}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-slate-400 mt-2">No schedules today</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDriverToDelete(null);
            setConfirmAcknowledge(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-b from-red-500/10 to-red-600/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle>Delete driver</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Deleting a driver will permanently remove their account.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {driverToDelete ? (
            <div className="mt-3 rounded-xl border bg-white/80 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {driverToDelete.name
                      ?.split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{driverToDelete.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5">
                      <Mail className="h-3.5 w-3.5" /> {driverToDelete.email}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5">
                      <Phone className="h-3.5 w-3.5" /> {driverToDelete.phoneNumber}
                    </span>
                  </div>
                  <div className="mt-3">
                    {(() => {
                      const today = new Date();
                      const todays = (driverToDelete.schedules || []).filter((s) =>
                        isSameDateInTimeZone(new Date(s.startTime), today, DISPLAY_TZ)
                      );
                      return todays.length > 0 ? (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Today's schedules</div>
                          <div className="flex flex-wrap gap-1">
                            {todays.map((s) => (
                              <Badge key={s.id} variant="secondary" className="whitespace-nowrap">
                                {formatTimeForDisplay(s.startTime)} - {formatTimeForDisplay(s.endTime)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">No schedules today</div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <Checkbox id="acknowledge" checked={confirmAcknowledge} onCheckedChange={(v) => setConfirmAcknowledge(Boolean(v))} />
            <label htmlFor="acknowledge" className="select-none">
              I understand that this action is permanent.
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!confirmAcknowledge || !!deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting === driverToDelete?.id ? (
                <span className="inline-flex items-center gap-2">
                  <Loader className="h-4 w-4" /> Deleting...
                </span>
              ) : (
                "Delete driver"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default withAuth(DriversPage);
