"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";
import ReasonModal from "@/components/common/ReasonModal";

// Only these roles count as "the team" — plain USER accounts (public
// self-signups/readers) aren't something an admin manages here.
const TEAM_ROLES = ["ADMIN", "EDITOR", "AUTHOR", "INVESTOR"];

const ROLE_BADGE = {
  ADMIN: "bg-primary text-on-primary",
  EDITOR: "bg-secondary text-on-secondary",
  AUTHOR: "bg-surface-tint text-on-surface",
  INVESTOR: "bg-amber-500 text-black",
};

const STATUS_BADGE = {
  ACTIVE: "bg-green-600 text-white",
  SUSPENDED: "bg-error text-on-error",
};

// Mirrors EMAIL_REGEX in the backend's auth.controller.js.
const EMAIL_REGEX = /^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

const fieldClass =
  "w-full border border-outline-variant/30 bg-surface-container-low rounded px-2 py-1.5 text-on-surface focus:border-primary focus:outline-none font-body-md text-sm";

/**
 * `refreshKey` lets a parent (e.g. after CreateTeamMemberClient creates a
 * new account) force this table to refetch without prop-drilling the list
 * itself — bump the key and the effect below re-runs.
 */
export default function TeamMembersTable({ refreshKey = 0 }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [rowError, setRowError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    setLoading(true);
    authApi
      .listUsers()
      .then((data) => setMembers((data.users || []).filter((m) => TEAM_ROLES.includes(m.role))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const startEdit = (member) => {
    setEditingId(member.id);
    setEditForm({ name: member.name, email: member.email, role: member.role });
    setRowError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowError("");
  };

  const handleFieldChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveEdit = async (member) => {
    setRowError("");

    const name = editForm.name.trim();
    const email = editForm.email.trim().toLowerCase();
    if (!name) {
      setRowError("Name cannot be empty");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setRowError("Please enter a valid email address");
      return;
    }

    const payload = {};
    if (name !== member.name) payload.name = name;
    if (email !== member.email) payload.email = email;
    if (editForm.role !== member.role) payload.role = editForm.role;

    if (!Object.keys(payload).length) {
      setEditingId(null);
      return;
    }

    setSaving(true);
    try {
      const data = await authApi.updateUser(member.id, payload);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? data.user : m)));
      setEditingId(null);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    await authApi.deleteUser(deleteTarget.id);
    setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div>
      <h2 className="font-headline-lg text-primary text-xl mb-4">Team Members</h2>

      {error && (
        <p className="text-sm text-error font-body-md mb-4" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <DashboardRowsSkeleton count={4} />
      ) : members.length === 0 ? (
        <p className="font-body-md text-on-surface-variant mb-8">No team members yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/20 mb-10  max-h-[320px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10">
              <tr className="text-left font-label-md text-xs uppercase tracking-wide text-on-surface-variant">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 ">
              {members.map((member) => {
                const isEditing = editingId === member.id;
                const isSelf = member.id === user?.id;

                return (
                  <tr key={member.id} className="bg-surface-container align-top">
                    <td className="px-4 py-3 min-w-[10rem]">
                      {isEditing ? (
                        <input name="name" value={editForm.name} onChange={handleFieldChange} className={fieldClass} />
                      ) : (
                        <span className="font-body-md text-on-surface">
                          {member.name}
                          {isSelf && <span className="text-on-surface-variant"> (you)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[14rem]">
                      {isEditing ? (
                        <input
                          name="email"
                          type="email"
                          value={editForm.email}
                          onChange={handleFieldChange}
                          className={fieldClass}
                        />
                      ) : (
                        <span className="font-body-md text-on-surface-variant">{member.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[9rem]">
                      {isEditing ? (
                        <select
                          name="role"
                          value={editForm.role}
                          onChange={handleFieldChange}
                          disabled={isSelf}
                          title={isSelf ? "You cannot change your own role" : undefined}
                          className={`${fieldClass} disabled:opacity-60`}
                        >
                          {TEAM_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase ${
                            ROLE_BADGE[member.role] || "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase ${
                          STATUS_BADGE[member.status] || "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-body-md text-on-surface-variant whitespace-nowrap">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 min-w-[8rem]">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          {rowError && <p className="text-xs text-error font-body-md">{rowError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(member)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-label-md bg-primary text-on-primary rounded hover:bg-primary-container transition-colors disabled:opacity-60"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors"
                          >
                            <i className="fa-solid fa-pen mr-1.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(member)}
                            disabled={isSelf}
                            title={isSelf ? "You cannot delete your own account" : undefined}
                            className="px-3 py-1.5 text-xs font-label-md border border-error/40 text-error rounded hover:bg-error/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <i className="fa-solid fa-trash mr-1.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReasonModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this team member?"
        description={
          deleteTarget
            ? `This permanently removes ${deleteTarget.name}'s (${deleteTarget.email}) account. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
