"use client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ShuttleConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Shuttle Confirmation</h1>
      <div className="mb-4">
        Shuttle ID: <span className="font-mono">{id}</span>
      </div>
      <Button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </Button>
      <div className="mt-8 text-gray-500">
        Confirmation details coming soon...
      </div>
    </div>
  );
}
