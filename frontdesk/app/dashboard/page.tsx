import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, Users, MapPin, Bell } from "lucide-react"

const stats = [
  { name: "Total Shuttles", value: "12", icon: Car, color: "text-blue-600" },
  { name: "Total Drivers", value: "8", icon: Users, color: "text-green-600" },
  { name: "Active Trips", value: "5", icon: MapPin, color: "text-orange-600" },
  { name: "Notifications", value: "3", icon: Bell, color: "text-red-600" },
]

const activeTrips = [
  {
    id: 1,
    guestName: "John Smith",
    shuttleNumber: "SH-001",
    status: "In Progress",
    pickup: "Hotel Lobby",
    dropoff: "Airport Terminal 1",
    time: "2:30 PM",
  },
  {
    id: 2,
    guestName: "Sarah Johnson",
    shuttleNumber: "SH-003",
    status: "Upcoming",
    pickup: "Airport Terminal 2",
    dropoff: "Hotel Lobby",
    time: "3:15 PM",
  },
  {
    id: 3,
    guestName: "Mike Davis",
    shuttleNumber: "SH-002",
    status: "In Progress",
    pickup: "Hotel Lobby",
    dropoff: "Airport Terminal 3",
    time: "2:45 PM",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Trips */}
      <Card>
        <CardHeader>
          <CardTitle>Active & Upcoming Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeTrips.map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{trip.guestName}</h3>
                    <Badge variant={trip.status === "In Progress" ? "default" : "secondary"}>{trip.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Shuttle: {trip.shuttleNumber}</p>
                    <p>
                      {trip.pickup} → {trip.dropoff}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{trip.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
