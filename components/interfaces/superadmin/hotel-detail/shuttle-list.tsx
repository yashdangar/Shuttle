"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Bus, Users, MapPin, Calendar } from "lucide-react";

interface Shuttle {
  _id: string;
  name: string;
  licensePlate: string;
  capacity: number;
  hotelId: string;
  driverId?: string;
  status: string;
}

interface ShuttleListProps {
  shuttles: Shuttle[];
}

export function ShuttleList({ shuttles }: ShuttleListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredShuttles = shuttles.filter(shuttle => {
    const matchesSearch = shuttle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shuttle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || shuttle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const shuttlesByStatus = shuttles.reduce((acc, shuttle) => {
    acc[shuttle.status] = (acc[shuttle.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      case "retired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Shuttles</CardTitle>
            <CardDescription>Manage hotel shuttle fleet</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{shuttles.length} total shuttles</Badge>
            {Object.entries(shuttlesByStatus).map(([status, count]) => (
              <Badge key={status} className={getStatusColor(status)}>
                {count} {status}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shuttles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shuttle</TableHead>
              <TableHead>License Plate</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShuttles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" 
                      ? "No shuttles found matching your filters." 
                      : "No shuttles found."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredShuttles.map((shuttle) => (
                <TableRow key={shuttle._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                        <Bus className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{shuttle.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {shuttle._id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{shuttle.licensePlate}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{shuttle.capacity} seats</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {shuttle.driverId ? (
                      <Badge variant="outline">Assigned</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-orange-600">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(shuttle.status)}>
                      {shuttle.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
