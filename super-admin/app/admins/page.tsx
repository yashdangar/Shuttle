"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { authApi, adminsApi } from "@/lib/api";
import withAuth from "@/components/withAuth";
import { AddAdminModal } from "@/components/add-admin-modal";
import {
  Plus,
  Trash2,
  Calendar,
  Shield,
  Search,
  ArrowLeft,
} from "lucide-react";

interface Admin {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  hotelId: number | null;
  hotel: {
    id: number;
    name: string;
  } | null;
}

function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminsApi.getAll();
      if (response.success && response.data) {
        setAdmins(response.data as Admin[]);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push("/login");
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;

    try {
      const response = await adminsApi.delete(adminId);
      if (response.success) {
        setAdmins(admins.filter((admin) => admin.id !== adminId));
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    const searchTerm = adminSearch.toLowerCase();
    return (
      admin.name.toLowerCase().includes(searchTerm) ||
      admin.email.toLowerCase().includes(searchTerm) ||
      (admin.hotel && admin.hotel.name.toLowerCase().includes(searchTerm)) ||
      admin.id.toString().includes(searchTerm)
    );
  });

  const AdminTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-8 w-8" />
                System Admins
              </h1>
              <p className="text-gray-600 mt-2">
                Manage system administrators and their hotel assignments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddAdminModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Admin Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search admins by name, email, hotel assignment, or ID..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <AdminTableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Hotel Assignment</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No admins found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Create your first admin to get started
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-600" />
                            {admin.name}
                          </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          {admin.hotel ? (
                            <Badge variant="secondary">
                              {admin.hotel.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No Hotel Assigned</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddAdminModal
        open={addAdminModalOpen}
        onOpenChange={setAddAdminModalOpen}
        onAdminCreated={fetchAdmins}
      />
    </div>
  );
}

export default withAuth(AdminsPage);
