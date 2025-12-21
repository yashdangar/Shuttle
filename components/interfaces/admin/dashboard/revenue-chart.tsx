"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts"

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

interface RevenueChartProps {
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
  earnings: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function RevenueChart({ data }: RevenueChartProps) {
  const [timePeriod, setTimePeriod] = useState("7days");

  const getTimePeriodData = () => {
    const now = new Date();
    
    switch (timePeriod) {
      case "7days":
        return data.slice(-7);
      case "14days":
        return data.slice(-14);
      case "month":
        // Last 30 days
        return data.slice(-30);
      case "6months":
        // Last 180 days (approx 6 months)
        return data.slice(-180);
      case "year":
        // Last 365 days
        return data.slice(-365);
      default:
        return data.slice(-7);
    }
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "7days":
        return "Daily earnings for the last 7 days";
      case "14days":
        return "Daily earnings for the last 14 days";
      case "month":
        return "Daily earnings for the last month";
      case "6months":
        return "Daily earnings for the last 6 months";
      case "year":
        return "Daily earnings for the last year";
      default:
        return "Daily earnings for the last 7 days";
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
    earnings: item.earnings,
  }));

  // Calculate trend
  const recentEarnings = chartData.slice(-3).reduce((sum, item) => sum + item.earnings, 0);
  const previousEarnings = chartData.slice(-6, -3).reduce((sum, item) => sum + item.earnings, 0);
  const trendPercentage = previousEarnings > 0 ? ((recentEarnings - previousEarnings) / previousEarnings * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Trend</CardTitle>
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
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="earnings"
              type="monotoneX"
              stroke="var(--color-earnings)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-earnings)",
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => `$${value}`}
              />
            </Line>
          </LineChart>
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
