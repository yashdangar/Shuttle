"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const getDateRangeText = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
    }
    return 'Select date range';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          {getDateRangeText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange.from}
          selected={dateRange}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onDateRangeChange(range);
            }
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
} 