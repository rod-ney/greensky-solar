"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/Button";
import ChangePasswordForm from "./ChangePasswordForm";
import LoginActivityTable from "./LoginActivityTable";
import AvatarUpload from "./AvatarUpload";
import Modal from "@/components/ui/Modal";
import type { Profile } from "@/lib/server/profile-repository";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  technician: "Technician",
  client: "Client",
};

export default function ProfilePageContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showLoginActivity, setShowLoginActivity] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Profile;
          setProfile(data);
          const [first, ...rest] = (data.name || "").trim().split(/\s+/);
          setEditFirstName(first ?? "");
          setEditLastName(rest.join(" ") ?? "");
          setEditContact(data.contactNumber ?? "");
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const openEdit = () => {
    if (profile) {
      const [first, ...rest] = (profile.name || "").trim().split(/\s+/);
      setEditFirstName(first ?? "");
      setEditLastName(rest.join(" ") ?? "");
      setEditContact(profile.contactNumber ?? "");
      setSaveError("");
      setShowEditModal(true);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    const fullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(" ");
    if (!fullName) {
      setSaveError("First name is required.");
      return;
    }
    const digits = editContact.replace(/\D/g, "");
    const contactValue = digits.length === 0 ? null : digits.length === 10 ? digits : undefined;
    if (digits.length > 0 && digits.length !== 10) {
      setSaveError("Contact number must be exactly 10 digits.");
      return;
    }
    setIsSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          contactNumber: contactValue,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setShowEditModal(false);
      } else {
        setSaveError(data.error ?? "Failed to update profile");
      }
    } catch {
      setSaveError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex animate-pulse gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 rounded bg-slate-200" />
            <div className="h-4 w-40 rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-3/4 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        Unable to load profile.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Profile header */}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AvatarUpload
              avatarUrl={profile.avatarUrl}
              name={profile.name}
              size="lg"
              onUploadComplete={(updated) =>
                setProfile((p) => (p ? { ...p, avatarUrl: updated.avatarUrl } : p))
              }
            />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{profile.name}</h1>
              <p className="text-slate-600">{profile.email}</p>
              <p className="mt-1 text-sm text-slate-500">
                {roleLabels[profile.role] ?? profile.role}
                {profile.contactNumber && ` · ${profile.contactNumber}`}
              </p>
            </div>
          </div>
          <Button onClick={openEdit} variant="outline" size="sm" className="shrink-0">
            Edit profile
          </Button>
        </div>

        {/* Info section - simple list */}
        <div className="border-t border-slate-100 px-6 py-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</dt>
              <dd className="mt-0.5 text-slate-900">{profile.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</dt>
              <dd className="mt-0.5 text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</dt>
              <dd className="mt-0.5 text-slate-900">{profile.contactNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Role</dt>
              <dd className="mt-0.5 text-slate-900">{roleLabels[profile.role] ?? profile.role}</dd>
            </div>
          </dl>
        </div>

        {/* Security & Password */}
        <div className="space-y-4 border-t border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-800">Security</h2>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={profile.twoFactorEnabled}
              disabled={twoFALoading}
              onChange={async (e) => {
                const checked = e.target.checked;
                setTwoFALoading(true);
                try {
                  const res = await fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ twoFactorEnabled: checked }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                  }
                } finally {
                  setTwoFALoading(false);
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span className="text-sm text-slate-700">Two-factor authentication</span>
            {twoFALoading && <span className="text-xs text-slate-400">Saving…</span>}
          </label>

          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-700">Change password</h3>
            <ChangePasswordForm />
          </div>
        </div>

        {/* Login Activity - collapsible */}
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowLoginActivity((p) => !p)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
          >
            <span className="text-sm font-semibold text-slate-800">Login activity</span>
            {showLoginActivity ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showLoginActivity && (
            <div className="border-t border-slate-100 px-6 pb-6 pt-2">
              <LoginActivityTable />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit profile"
      >
        <div className="space-y-4">
          {saveError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">First name</label>
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                placeholder="Your first name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Last name</label>
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                placeholder="Your last name"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Contact number (10 digits)
            </label>
            <input
              type="tel"
              value={editContact}
              onChange={(e) => setEditContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
              placeholder="09123456789"
              maxLength={10}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveProfile} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
