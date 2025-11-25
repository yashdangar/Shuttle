import PageLayout from "@/components/layout/page-layout";
import { NotificationsClient } from "@/components/interfaces/common/notifications";

export default function NotificationsPage() {
  return (
    <PageLayout
      title="Notifications"
      description="Monitor booking alerts, assignment updates, and workspace announcements."
    >
      <NotificationsClient />
    </PageLayout>
  );
}
