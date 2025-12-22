import { FrontdeskTripDetail } from "@/components/interfaces/frontdesk/trips/trip-detail";

export default async function FrontdeskTripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <FrontdeskTripDetail tripId={tripId} />;
}
