"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BookingsChartProps {
  data: Array<{
    date: string;
    total: number;
    confirmed: number;
    pending: number;
    rejected: number;
    earnings: number;
  }>;
}

const chartConfig = {
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-2)",
  },
  rejected: {
    label: "Rejected",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function BookingsChart({ data }: BookingsChartProps) {
  const [timePeriod, setTimePeriod] = useState("7days");

  const getTimePeriodData = () => {
    switch (timePeriod) {
      case "7days":
        return data.slice(-7);
      case "14days":
        return data.slice(-14);
      case "month":
        return data.slice(-30);
      case "6months":
        return data.slice(-180);
      case "year":
        return data.slice(-365);
      default:
        return data.slice(-7);
    }
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "7days":
        return "Daily bookings for the last 7 days";
      case "14days":
        return "Daily bookings for the last 14 days";
      case "month":
        return "Daily bookings for the last month";
      case "6months":
        return "Daily bookings for the last 6 months";
      case "year":
        return "Daily bookings for the last year";
      default:
        return "Daily bookings for the last 7 days";
    }
  };

  const periodData = getTimePeriodData();
  
  // Transform data for chart
  const chartData = periodData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: (timePeriod === "6months" || timePeriod === "year") ? '2-digit' : undefined
    }),
    confirmed: item.confirmed,
    pending: item.pending,
    rejected: item.rejected,
  }));

  // Calculate trend
  const recentBookings = chartData.slice(-3).reduce((sum, item) => sum + item.confirmed + item.pending + item.rejected, 0);
  const previousBookings = chartData.slice(-6, -3).reduce((sum, item) => sum + item.confirmed + item.pending + item.rejected, 0);
  const trendPercentage = previousBookings > 0 ? ((recentBookings - previousBookings) / previousBookings * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Booking Status</CardTitle>
            <CardDescription>{getTimePeriodLabel()}</CardDescription>
          </div>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="14days">14 Days</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="confirmed"
              stackId="a"
              fill="var(--color-confirmed)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="pending"
              stackId="a"
              fill="var(--color-pending)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="rejected"
              stackId="a"
              fill="var(--color-rejected)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {Number(trendPercentage) > 0 ? 'Trending up' : Number(trendPercentage) < 0 ? 'Trending down' : 'Stable'} by {Math.abs(Number(trendPercentage))}% this period 
          {Number(trendPercentage) > 0 ? <TrendingUp className="h-4 w-4" /> : Number(trendPercentage) < 0 ? <TrendingUp className="h-4 w-4 rotate-180" /> : null}
        </div>
        <div className="text-muted-foreground leading-none">
          {getTimePeriodLabel()}
        </div>
      </CardFooter>
    </Card>
  )
}
