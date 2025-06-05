"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fakeReservations } from "@/lib/fakeData";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [reservations, setReservations] = useState(fakeReservations);
  const router = useRouter();

  // Simple auth check
  useEffect(() => {
    if (window.localStorage.getItem("frontdesk_logged_in") !== "true") {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shuttle Reservations</h1>
        <Button onClick={() => alert("Add reservation modal coming soon")}>
          + Add Reservation
        </Button>
      </div>
      <div className="bg-white rounded shadow p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-2">Name</th>
              <th>Pickup</th>
              <th>Destination</th>
              <th>Time</th>
              <th>Persons</th>
              <th>Bags</th>
              <th>Payment</th>
              <th>Status</th>
              <th>QR</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">
                  {r.firstName} {r.lastName}
                </td>
                <td>{r.pickupLocation}</td>
                <td>{r.destination}</td>
                <td>{new Date(r.preferredTime).toLocaleString()}</td>
                <td>{r.numPersons}</td>
                <td>{r.numBags}</td>
                <td>
                  {r.paymentMethod} ({r.paymentStatus})
                </td>
                <td>{r.status}</td>
                <td>
                  {r.qrCode ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
