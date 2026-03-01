import NotificationsPageContent from "@/components/profile/NotificationsPageContent";

export default function ClientNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View and manage your notifications
        </p>
      </div>
      <NotificationsPageContent
        notificationsApiBase="/api/notifications"
        visibleCategories={["all", "booking", "payment", "document", "system"]}
      />
    </div>
  );
}
