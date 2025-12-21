"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ExternalLink, MapPin, Phone, Mail, Users } from "lucide-react";
import { SuperadminAPI, type SuperadminHotel } from "@/lib/superadmin";
import { useRouter } from "next/navigation";

export function HotelList() {
  const { data: session } = useSession();
  const router = useRouter();
  const [hotels, setHotels] = useState<SuperadminHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      loadHotels();
    }
  }, [session]);

  const loadHotels = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const hotelData = await SuperadminAPI.listAllHotels(session.user.id);
      setHotels(hotelData || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hotels");
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewHotel = (hotelId: string) => {
    router.push(`/super-admin/hotel/${hotelId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading hotels...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-red-600 text-sm">{error}</div>
          <Button onClick={loadHotels} variant="outline" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hotels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredHotels.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-muted-foreground">
                {searchTerm ? "No hotels found matching your search." : "No hotels found."}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredHotels.map((hotel) => (
            <Card key={hotel.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{hotel.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {hotel.address}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleViewHotel(hotel.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{hotel.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{hotel.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{hotel.userIds.length} users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {hotel.shuttleIds.length} shuttles
                    </Badge>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {hotel.locationIds.length} locations
                    </Badge>
                    <Badge variant="secondary">
                      {hotel.tripIds.length} trips
                    </Badge>
                    <Badge variant="secondary">
                      {hotel.bookingIds.length} bookings
                    </Badge>
                    <Badge variant="outline">
                      {hotel.timeZone}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Table view for desktop */}
      {/* <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle>Hotel Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Time Zone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{hotel.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {hotel.address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          {hotel.phoneNumber}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{hotel.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{hotel.userIds.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {hotel.shuttleIds.length} shuttles
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {hotel.locationIds.length} locations
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{hotel.timeZone}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleViewHotel(hotel.id)}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
