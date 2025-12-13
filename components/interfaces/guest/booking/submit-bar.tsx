"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SubmitBarProps = {
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export function SubmitBar({ onSubmit, isLoading, disabled }: SubmitBarProps) {
  return (
    <div className="flex justify-center">
      <Button
        type="button"
        size="lg"
        onClick={onSubmit}
        disabled={isLoading || disabled}
        className="rounded-full px-12 text-base font-semibold tracking-wide shadow-lg shadow-primary/20"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </div>
  );
}
