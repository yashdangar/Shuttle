"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"

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

interface PaymentStatsProps {
  paymentStats: {
    paid: number;
    unpaid: number;
    refunded: number;
    waived: number;
  };
  paymentMethodStats: {
    app: number;
    frontdesk: number;
    deposit: number;
  };
}

const chartConfig = {
  paid: {
    label: "Paid",
    color: "var(--chart-1)",
  },
  unpaid: {
    label: "Unpaid",
    color: "var(--chart-2)",
  },
  refunded: {
    label: "Refunded",
    color: "var(--chart-3)",
  },
  waived: {
    label: "Waived",
    color: "var(--chart-4)",
  },
  app: {
    label: "App",
    color: "var(--chart-1)",
  },
  frontdesk: {
    label: "Front Desk",
    color: "var(--chart-2)",
  },
  deposit: {
    label: "Deposit",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

function PaymentStatusPieChart({ paymentStats }: { paymentStats: PaymentStatsProps['paymentStats'] }) {
  const [timePeriod, setTimePeriod] = useState("7days");

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "7days":
        return "Payment status for the last 7 days";
      case "14days":
        return "Payment status for the last 14 days";
      case "month":
        return "Payment status for the last month";
      case "6months":
        return "Payment status for the last 6 months";
      case "year":
        return "Payment status for the last year";
      default:
        return "Payment status for the last 7 days";
    }
  };

  const chartData = [
    { status: "paid", count: paymentStats.paid, fill: "var(--color-paid)" },
    { status: "unpaid", count: paymentStats.unpaid, fill: "var(--color-unpaid)" },
    { status: "refunded", count: paymentStats.refunded, fill: "var(--color-refunded)" },
    { status: "waived", count: paymentStats.waived, fill: "var(--color-waived)" },
  ].filter(item => item.count > 0);

  const total = paymentStats.paid + paymentStats.unpaid + paymentStats.refunded + paymentStats.waived;
  const paidPercentage = total > 0 ? Math.round((paymentStats.paid / total) * 100) : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <CardTitle>Payment Status</CardTitle>
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
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              stroke="0"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {paidPercentage}% of bookings are paid
        </div>
        <div className="text-muted-foreground leading-none">
          Out of {total.toLocaleString()} total bookings
        </div>
      </CardFooter>
    </Card>
  )
}

function PaymentMethodsPieChart({ paymentMethodStats }: { paymentMethodStats: PaymentStatsProps['paymentMethodStats'] }) {
  const [timePeriod, setTimePeriod] = useState("7days");

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "7days":
        return "Payment methods for the last 7 days";
      case "14days":
        return "Payment methods for the last 14 days";
      case "month":
        return "Payment methods for the last month";
      case "6months":
        return "Payment methods for the last 6 months";
      case "year":
        return "Payment methods for the last year";
      default:
        return "Payment methods for the last 7 days";
    }
  };

  const chartData = [
    { method: "app", count: paymentMethodStats.app, fill: "var(--color-app)" },
    { method: "frontdesk", count: paymentMethodStats.frontdesk, fill: "var(--color-frontdesk)" },
    { method: "deposit", count: paymentMethodStats.deposit, fill: "var(--color-deposit)" },
  ].filter(item => item.count > 0);

  const total = paymentMethodStats.app + paymentMethodStats.frontdesk + paymentMethodStats.deposit;
  const appPercentage = total > 0 ? Math.round((paymentMethodStats.app / total) * 100) : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <CardTitle>Payment Methods</CardTitle>
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
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="method" />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="method"
              stroke="0"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {appPercentage}% of payments via app
        </div>
        <div className="text-muted-foreground leading-none">
          Out of {total.toLocaleString()} total payments
        </div>
      </CardFooter>
    </Card>
  )
}

export function PaymentStats({ paymentStats, paymentMethodStats }: PaymentStatsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PaymentStatusPieChart paymentStats={paymentStats} />
      <PaymentMethodsPieChart paymentMethodStats={paymentMethodStats} />
    </div>
  );
}
