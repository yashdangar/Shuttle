import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Car, Truck, UserCheck, CheckCircle, Clock, AlertTriangle } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Hotels",
      value: "12",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Front Desk Staff",
      value: "24",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Active Drivers",
      value: "18",
      icon: Car,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Shuttles",
      value: "15",
      icon: Truck,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Guests",
      value: "1,247",
      icon: UserCheck,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ]

  const quickStats = [
    {
      title: "Active Shuttles",
      value: "8",
      subtitle: "Currently running",
      color: "text-green-600",
    },
    {
      title: "Completed Trips",
      value: "156",
      subtitle: "Today",
      color: "text-blue-600",
    },
    {
      title: "Pending Payments",
      value: "$2,340",
      subtitle: "Awaiting processing",
      color: "text-orange-600",
    },
  ]

  const notifications = [
    {
      type: "warning",
      message: "Shuttle #SH-001 requires maintenance check",
      time: "2 hours ago",
    },
    {
      type: "info",
      message: "New driver John Smith has been registered",
      time: "4 hours ago",
    },
    {
      type: "success",
      message: "Payment of $450 received from Grand Hotel",
      time: "6 hours ago",
    },
    {
      type: "warning",
      message: "Driver Mike Johnson is running late for pickup",
      time: "8 hours ago",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's what's happening with your shuttle operations.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickStats.map((stat) => (
              <div key={stat.title} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{stat.title}</p>
                  <p className="text-sm text-slate-600">{stat.subtitle}</p>
                </div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {notification.type === "warning" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    {notification.type === "info" && <Clock className="w-4 h-4 text-blue-500" />}
                    {notification.type === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{notification.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
