"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";
import ReasonModal from "@/components/common/ReasonModal";
import { PERMISSIONS, PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import EmptyState from "@/components/common/EmptyState";

// Only these roles count as "the team" — plain USER accounts (public
// self-signups/readers) aren't something an admin manages here.
const TEAM_ROLES = ["ADMIN", "SUBADMIN", "EDITOR", "AUTHOR", "INVESTOR"];
const SUBADMIN_MANAGEABLE_ROLES = ["EDITOR", "AUTHOR", "INVESTOR"];

const ROLE_BADGE = {
  ADMIN: "bg-primary text-white",
  SUBADMIN: "bg-secondary text-white",
  EDITOR: "bg-yellow-500 text-white",
  AUTHOR: "bg-blue-500 text-white",
  INVESTOR: "bg-green-500 text-white",
};

const ROLE_LABEL = {
  ADMIN: "Administrator",
  SUBADMIN: "Subadmin",
  EDITOR: "Editor",
  AUTHOR: "Author",
  INVESTOR: "Investor",
};

const STATUS_BADGE = {
  ACTIVE: "bg-green-600 text-white",
  INACTIVE: "bg-amber-500 text-white",
  DELETED: "bg-error text-on-error",
};
const statusOf = (member) => member.deleted_at ? "DELETED" : (member.status || "ACTIVE");

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
  const [filter, setFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "", permissions: [], assignedEditorId: "" });
  const [rowError, setRowError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const editableRoles = user?.role === "ADMIN" ? TEAM_ROLES : SUBADMIN_MANAGEABLE_ROLES;
  const filteredMembers = filter === "ALL" ? members : members.filter((member) => statusOf(member) === filter);
  const reviewers = members.filter(
    (member) => ["EDITOR", "SUBADMIN"].includes(member.role) && statusOf(member) === "ACTIVE"
  );
  const canHaveReviewer = (role) => ["AUTHOR", "EDITOR"].includes(role);

  useEffect(() => {
    // Refetching intentionally enters a loading state when the refresh key changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    authApi
      .listUsers({ includeDeleted: true })
      .then((data) => setMembers((data.users || []).filter((m) => TEAM_ROLES.includes(m.role))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const startEdit = (member) => {
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      email: member.email,
      role: member.role,
      permissions: member.permissions || [],
      assignedEditorId: member.assigned_editor_id ? String(member.assigned_editor_id) : "",
    });
    setRowError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowError("");
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "role" && value !== prev.role
        ? { permissions: ROLE_DEFAULT_PERMISSIONS[value] || [], assignedEditorId: canHaveReviewer(value) ? prev.assignedEditorId : "" }
        : {}),
    }));
  };

  const togglePermission = (permission) => {
    setEditForm((prev) => {
      const selected = prev.permissions.includes(permission);
      let permissions = selected
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission];
      const siteDataChildren = PERMISSION_GROUPS.find((group) => group.label === "Site Data").permissions.map(([value]) => value);
      if (!selected && siteDataChildren.includes(permission) && !permissions.includes(PERMISSIONS.MANAGE_SITE_DATA)) {
        permissions.push(PERMISSIONS.MANAGE_SITE_DATA);
      }
      if (permission === PERMISSIONS.MANAGE_SITE_DATA && selected) {
        permissions = permissions.filter((item) => !siteDataChildren.includes(item));
      }
      return { ...prev, permissions };
    });
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
    if (JSON.stringify([...editForm.permissions].sort()) !== JSON.stringify([...(member.permissions || [])].sort())) {
      payload.permissions = editForm.permissions;
    }
    const assignedEditorId = canHaveReviewer(editForm.role) && editForm.assignedEditorId
      ? Number(editForm.assignedEditorId)
      : null;
    const currentEditorId = member.assigned_editor_id ? Number(member.assigned_editor_id) : null;
    const assignmentChanged = canHaveReviewer(editForm.role)
      && (editForm.role !== member.role || assignedEditorId !== currentEditorId);

    if (!Object.keys(payload).length && !assignmentChanged) {
      setEditingId(null);
      return;
    }

    setSaving(true);
    try {
      let updatedMember = member;
      if (Object.keys(payload).length) {
        const data = await authApi.updateUser(member.id, payload);
        updatedMember = data.user;
      }
      if (assignmentChanged) {
        const data = await authApi.assignAuthorEditor(member.id, assignedEditorId);
        updatedMember = {
          ...updatedMember,
          assigned_editor_id: data.assignment?.editorId || null,
          assigned_editor_name: data.assignment?.editorName || null,
        };
      } else if (!canHaveReviewer(editForm.role)) {
        updatedMember = { ...updatedMember, assigned_editor_id: null, assigned_editor_name: null };
      }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updatedMember : m)));
      setEditingId(null);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reason) => {
    if (!deleteTarget) return;

    await authApi.deleteUser(deleteTarget.id, reason);
    setMembers((prev) => prev.map((member) => member.id === deleteTarget.id ? { ...member, status: "INACTIVE", deleted_at: new Date().toISOString(), delete_reason: reason } : member));
    setDeleteTarget(null);
  };

  const handleStatus = async (member) => {
    const status = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingId(member.id); setError("");
    try {
      const data = await authApi.updateUser(member.id, { status });
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, ...data.user } : item));
    } catch (requestError) {
      setError(requestError.message || "Unable to update account status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h2 className="font-headline-lg text-primary text-xl mb-4">Team Members</h2>

      {!loading && <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter team members by status">
        {["ALL", "ACTIVE", "INACTIVE", "DELETED"].map((status) => {
          const count = status === "ALL" ? members.length : members.filter((member) => statusOf(member) === status).length;
          return <button key={status} type="button" onClick={() => { setFilter(status); setEditingId(null); }} className={`rounded-full px-3 py-2 text-xs font-bold ${filter === status ? "bg-primary text-on-primary" : "border border-outline-variant/35 bg-surface text-on-surface-variant hover:border-primary"}`}>{status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()} ({count})</button>;
        })}
      </div>}

      {error && (
        <p className="text-sm text-error font-body-md mb-4" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <DashboardRowsSkeleton count={4} />
      ) : filteredMembers.length === 0 ? (
        <EmptyState icon="fa-users" title="No team members found" description={filter === "ALL" ? "Add an Indian Rajneeti team member to see them here." : `No ${filter.toLowerCase()} team members found.`} />
      ) : (
        <div className="mb-10 max-h-[70vh] overflow-auto rounded-lg border border-outline-variant/20">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10">
              <tr className="text-left font-label-md text-xs uppercase tracking-wide text-on-surface-variant">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Assigned reviewer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 ">
              {filteredMembers.map((member) => {
                const isEditing = editingId === member.id;
                const isSelf = member.id === user?.id;
                const canManageMember = user?.role === "ADMIN" || !["ADMIN", "SUBADMIN"].includes(member.role);
                const memberStatus = statusOf(member);
                const isDeleted = memberStatus === "DELETED";

                return (
                  <Fragment key={member.id}>
                  <tr className="bg-surface-container align-top">
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
                          {editableRoles.map((role) => (
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
                    <td className="px-4 py-3 min-w-[12rem]">
                      <span className="font-body-md text-xs text-on-surface-variant">{member.site?.name || "Indian Rajneeti"}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      {isEditing && canHaveReviewer(editForm.role) ? (
                        <select
                          name="assignedEditorId"
                          value={editForm.assignedEditorId}
                          onChange={handleFieldChange}
                          className={fieldClass}
                        >
                          <option value="">Unassigned</option>
                          {reviewers.filter((reviewer) => reviewer.id !== member.id && Number(reviewer.site_id || 1) === Number(member.site_id || 1)).map((reviewer) => (
                            <option key={reviewer.id} value={reviewer.id}>
                              {reviewer.name} ({reviewer.role === "SUBADMIN" ? "Subadmin" : "Editor"})
                            </option>
                          ))}
                        </select>
                      ) : canHaveReviewer(member.role) ? (
                        <span className="font-body-md text-xs text-on-surface-variant">
                          {member.assigned_editor_name || "Unassigned"}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase ${
                          STATUS_BADGE[memberStatus] || "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {memberStatus}
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
                          {user?.role === "ADMIN" && !isDeleted && <button type="button" onClick={() => handleStatus(member)} disabled={isSelf || updatingId === member.id} className="px-3 py-1.5 text-xs font-label-md border border-primary/40 text-primary rounded hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed">{memberStatus === "ACTIVE" ? "Deactivate" : "Activate"}</button>}
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            disabled={!canManageMember || isDeleted}
                            title={!canManageMember ? "Only an Admin can edit this account" : undefined}
                            className="px-3 py-1.5 text-xs font-label-md border border-outline-variant/40 rounded hover:border-primary hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <i className="fa-solid fa-pen mr-1.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(member)}
                            disabled={isSelf || !canManageMember || isDeleted}
                            title={isSelf ? "You cannot delete your own account" : !canManageMember ? "Only an Admin can delete this account" : undefined}
                            className="px-3 py-1.5 text-xs font-label-md border border-error/40 text-error rounded hover:bg-error/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <i className="fa-solid fa-trash mr-1.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-surface-container-low/70">
                      <td colSpan={8} className="border-t border-outline-variant/15 px-4 py-4">
                        {user?.role !== "ADMIN" || editForm.role === "ADMIN" ? (
                          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                            {editForm.role === "ADMIN"
                              ? "Admin accounts always have every privilege."
                              : "Subadmins can assign only the standard privileges for this role."}
                          </div>
                        ) : (
                          <div>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="font-headline-md text-sm text-primary">Edit Privileges</h3>
                                <p className="mt-1 text-xs text-on-surface-variant">Changes take effect on the member&apos;s next API request.</p>
                              </div>
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-label-md text-primary">
                                {editForm.permissions.length} selected
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {PERMISSION_GROUPS.map((group) => (
                                <fieldset key={group.label} className="min-w-0 rounded-lg border border-outline-variant/25 bg-surface p-3">
                                  <legend className="px-1 text-xs font-semibold font-label-md text-primary">{group.label}</legend>
                                  <div className="space-y-1">
                                    {group.permissions.map(([value, label]) => (
                                      <label key={value} className="flex min-h-9 cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-surface-container">
                                        <input
                                          type="checkbox"
                                          checked={editForm.permissions.includes(value)}
                                          onChange={() => togglePermission(value)}
                                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                                        />
                                        <span className="min-w-0 break-words text-xs leading-5 text-on-surface-variant">{label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
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
        title={deleteTarget ? `Delete this ${ROLE_LABEL[deleteTarget.role] || "team member"}?` : "Delete team member?"}
        description={
          deleteTarget
            ? `The ${ROLE_LABEL[deleteTarget.role] || "team member"} account for ${deleteTarget.name} (${deleteTarget.email}) will be moved to Deleted Items. It can be restored later from Deleted Items.`
            : undefined
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
