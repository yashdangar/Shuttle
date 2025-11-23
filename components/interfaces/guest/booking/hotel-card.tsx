"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HotelRecord } from "@/convex/hotels";

type HotelCardProps = {
  hotel: HotelRecord;
};

export function HotelCard({ hotel }: HotelCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-6">
        <div className="space-y-1">
          <CardDescription className="text-[11px] uppercase tracking-[0.3em]">
            Selected hotel
          </CardDescription>
          <CardTitle className="text-2xl">{hotel.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{hotel.address}</p>
        </div>
        <Link
          href="/select-hotels"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Change
        </Link>
      </CardHeader>
    </Card>
  );
}

