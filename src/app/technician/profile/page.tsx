import ProfilePageContent from "@/components/profile/ProfilePageContent";

export default function TechnicianProfilePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-slate-500">
          Manage your account settings
        </p>
      </div>
      <ProfilePageContent />
    </div>
  );
}
