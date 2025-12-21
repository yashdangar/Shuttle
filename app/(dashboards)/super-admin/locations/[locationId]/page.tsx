import { LocationDetailPage } from "@/components/interfaces/superadmin/location-detail-page";

interface LocationPageProps {
  params: Promise<{
    locationId: string;
  }>;
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { locationId } = await params;
  return <LocationDetailPage locationId={locationId} />;
}
