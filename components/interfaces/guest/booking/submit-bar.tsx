"use client";

import { Button } from "@/components/ui/button";

export function SubmitBar() {
  return (
    <div className="flex justify-center">
      <Button
        type="button"
        size="lg"
        className="rounded-full px-12 text-base font-semibold tracking-wide shadow-lg shadow-primary/20"
      >
        Submit
      </Button>
    </div>
  );
}

