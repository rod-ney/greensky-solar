"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, ShieldCheck, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { toast } from "@/lib/toast";
import { useSessionUser } from "@/lib/client-session";
import type { User, UserRole } from "@/types";

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4 text-red-500" />,
  technician: <UserCheck className="h-4 w-4 text-green-500" />,
  client: <UserCheck className="h-4 w-4 text-slate-500" />,
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  technician: "Technician",
  client: "Client",
};

const roleBgColors: Record<UserRole, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  technician: "bg-green-50 text-green-700 border-green-200",
  client: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as User[];
        setUsers(data);
      } catch {
        setUsers([]);
      }
    };
    void loadUsers();
  }, []);

  const sessionUser = useSessionUser();
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editedRole, setEditedRole] = useState<UserRole>("client");
  const [editedContactNumber, setEditedContactNumber] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleSaveError, setRoleSaveError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showSaveUserConfirm, setShowSaveUserConfirm] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const editUser = users.find((u) => u.id === selectedUser);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage user accounts and role assignments
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Add User
        </Button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["admin", "technician", "client"] as const).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
              className={`rounded-xl border p-4 text-left transition-all ${
                roleFilter === role
                  ? "border-brand bg-brand-50 ring-1 ring-brand/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {roleIcons[role]}
                <span className="text-xs font-medium text-slate-500 capitalize">
                  {roleLabels[role]}s
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-slate-900">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setRoleFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === "all"
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Users ({users.length})
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                Email
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">
                Contact
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                Role
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                Last Login
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                      {user.avatar}
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {user.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600 hidden md:table-cell">
                  {user.email}
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600 hidden sm:table-cell">
                  {user.contactNumber ? `+63 ${user.contactNumber}` : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBgColors[user.role]}`}
                  >
                    {roleIcons[user.role]}
                    {roleLabels[user.role]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 hidden lg:table-cell">
                  {new Date(user.lastLogin).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setSelectedUser(user.id);
                        setEditedRole(user.role);
                        setEditedContactNumber(user.contactNumber ?? "");
                        setRoleSaveError("");
                        setShowEditModal(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      disabled={user.email.toLowerCase() === sessionUser.email?.toLowerCase()}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      title={
                        user.email.toLowerCase() === sessionUser.email?.toLowerCase()
                          ? "Cannot delete your own account"
                          : "Delete user"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Auth Ready Notice */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <p className="text-sm text-slate-500">
          Authentication integration ready — connect your auth provider (NextAuth.js, Clerk, etc.) to enable login and role-based access control.
        </p>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add User"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="email@greensky.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role
            </label>
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand">
              <option value="technician">Technician</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add User</Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => {
          setUserToDelete(null);
          setDeleteError("");
        }}
        title="Delete User"
      >
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{userToDelete.name}</strong> (
              {userToDelete.email})? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError("");
                  try {
                    const res = await fetch(`/api/users/${userToDelete.id}`, {
                      method: "DELETE",
                    });
                    const data = (await res.json()) as { error?: string };
                    if (!res.ok) {
                      const err = data.error ?? "Failed to delete user.";
                      setDeleteError(err);
                      toast.error(err);
                      return;
                    }
                    setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
                    setUserToDelete(null);
                    toast.success("User deleted successfully.");
                  } catch {
                    setDeleteError("Failed to delete user.");
                    toast.error("Failed to delete user.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Save User */}
      <ConfirmModal
        isOpen={showSaveUserConfirm}
        onClose={() => setShowSaveUserConfirm(false)}
        onConfirm={async () => {
          if (!selectedUser) return;
          const digitsOnly = editedContactNumber.replace(/\D/g, "");
          try {
            setIsSavingRole(true);
            const body: { role: UserRole; contactNumber: string } = {
              role: editedRole,
              contactNumber: digitsOnly,
            };
            const response = await fetch(`/api/users/${selectedUser}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const payload = (await response.json()) as User | { error?: string };
            if (!response.ok) {
              const err = "error" in payload && payload.error ? payload.error : "Failed to update role.";
              setRoleSaveError(err);
              toast.error(err);
              return;
            }
            const updatedUser = payload as User;
            setUsers((prev) =>
              prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
            );
            setShowEditModal(false);
            setSelectedUser(null);
            setShowSaveUserConfirm(false);
            toast.success("User updated successfully.");
          } catch {
            setRoleSaveError("Failed to update role.");
            toast.error("Failed to update role.");
          } finally {
            setIsSavingRole(false);
          }
        }}
        title="Save Changes"
        message={
          editUser ? (
            <>
              Are you sure you want to save changes to{" "}
              <span className="font-semibold text-slate-900">{editUser.name}</span>?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Save Changes"
        variant="primary"
        isLoading={isSavingRole}
      />

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
          setRoleSaveError("");
        }}
        title="Edit User"
      >
        {editUser && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedUser) return;
              const digitsOnly = editedContactNumber.replace(/\D/g, "");
              if (
                digitsOnly.length > 0 &&
                (digitsOnly.length !== 10 || !/^\d{10}$/.test(digitsOnly))
              ) {
                setRoleSaveError("Contact number must be exactly 10 digits.");
                return;
              }
              setRoleSaveError("");
              setShowSaveUserConfirm(true);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={editUser.name}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                defaultValue={editUser.email}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Number
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                <span className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                  +63
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9123456789"
                  value={editedContactNumber}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setEditedContactNumber(digitsOnly);
                  }}
                  className="w-full px-3 py-2 text-sm outline-none"
                />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Exactly 10 digits. Leave empty to keep current.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={editedRole}
                  onChange={(event) => setEditedRole(event.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="technician">Technician</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  defaultValue={editUser.status}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {roleSaveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {roleSaveError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setRoleSaveError("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingRole}>
                {isSavingRole ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
