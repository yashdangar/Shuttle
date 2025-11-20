 "use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type HotelSetupRequiredProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
};

export function HotelSetupRequired({
  title = "Complete Your Hotel Setup",
  description = "Create your hotel before managing drivers, frontdesk staff, or shuttles.",
  actionLabel = "Create Hotel",
}: HotelSetupRequiredProps) {
  return (
    <div className="flex min-h-[90vh] w-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl border-dashed">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            🏨
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
          <p className="max-w-md">{description}</p>
          <Button asChild size="lg">
            <Link href="/admin">{actionLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


