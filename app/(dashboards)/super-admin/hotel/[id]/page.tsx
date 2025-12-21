
import { HotelDetailPage } from "@/components/interfaces/superadmin/hotel-detail-page";

interface HotelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function HotelPage({ params }: HotelPageProps) {
  const { id } = await params;
  return <>
        <HotelDetailPage hotelId={id} />
  </>
}
