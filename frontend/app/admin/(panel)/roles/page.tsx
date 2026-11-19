"use client";

import { useMemo, useState } from "react";
import { Card, ConfirmDialog, LoadState, Modal, PageHeader, RequirePermission } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { useToast } from "@/components/providers/Toast";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { titleCase } from "@/lib/format";
import type { PermissionGroup, Role } from "@/lib/types";

function RoleNameForm({ role, onDone, onClose }: { role?: Role; onDone: () => void; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(role?.name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Enter a role name of at least 2 characters.");
    setBusy(true);
    setError("");
    try {
      if (role) await api(`/admin/roles/${role.id}`, { method: "PUT", scope: "admin", body: { name: name.trim(), permissions: role.permissions } });
      else await api("/admin/roles", { method: "POST", scope: "admin", body: { name: name.trim(), permissions: [] } });
      toast(role ? "Role renamed." : "Role created. Tick its permissions below and save.");
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? (e.field("name") ?? e.message) : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={role ? "Rename role" : "New role"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Role name" htmlFor="role-name" error={error}>
          <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!error} maxLength={50} className="!rounded-lg" autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" shape="rounded" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" shape="rounded" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Matrix() {
  const toast = useToast();
  const roles = useAdminQuery<Role[]>("/admin/roles");
  const groups = useAdminQuery<PermissionGroup[]>("/admin/permissions");
  // edits = roles the user changed on screen; everything else shows what is saved on the server
  const [edits, setEdits] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameForm, setNameForm] = useState<{ role?: Role } | null>(null);
  const [toDelete, setToDelete] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const draft = useMemo<Record<number, string[]>>(
    () => Object.fromEntries((roles.data ?? []).map((role) => [role.id, edits[role.id] ?? role.permissions])),
    [roles.data, edits],
  );
  const setDraft = (next: Record<number, string[]>) => setEdits(next);

  const dirty = useMemo(
    () =>
      (roles.data ?? []).filter((role) => {
        if (role.is_protected) return false;
        const current = [...(draft[role.id] ?? [])].sort().join(",");
        return current !== [...role.permissions].sort().join(",");
      }),
    [roles.data, draft],
  );

  const toggle = (role: Role, permission: string) => {
    if (role.is_protected) return;
    const current = draft[role.id] ?? [];
    setDraft({ ...draft, [role.id]: current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission] });
  };

  const toggleGroup = (role: Role, group: PermissionGroup) => {
    if (role.is_protected) return;
    const names = group.permissions.map((p) => p.name);
    const current = draft[role.id] ?? [];
    const all = names.every((name) => current.includes(name));
    setDraft({ ...draft, [role.id]: all ? current.filter((p) => !names.includes(p)) : Array.from(new Set([...current, ...names])) });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      for (const role of dirty) {
        await api(`/admin/roles/${role.id}`, { method: "PUT", scope: "admin", body: { name: role.name, permissions: draft[role.id] } });
      }
      toast(`Saved ${dirty.length} role${dirty.length > 1 ? "s" : ""}.`);
      setEdits({});
      roles.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the changes.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/admin/roles/${toDelete.id}`, { method: "DELETE", scope: "admin" });
      toast("Role deleted.");
      roles.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not delete the role.", "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Choose what each role can do. Changes apply the next time a staff member loads a page."
        actions={
          <>
            <Button variant="outline" shape="rounded" onClick={() => setNameForm({})}>
              + New role
            </Button>
            <Button shape="rounded" disabled={dirty.length === 0} loading={saving} onClick={save}>
              Save changes{dirty.length > 0 ? ` (${dirty.length})` : ""}
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <LoadState loading={(roles.loading && !roles.data) || (groups.loading && !groups.data)} error={roles.error || groups.error}>
        {roles.data && groups.data && (
          <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th scope="col" className="sticky left-0 bg-white px-4 py-3 text-left font-medium dark:bg-neutral-900">
                    Permission
                  </th>
                  {roles.data.map((role) => (
                    <th key={role.id} scope="col" className="px-3 py-3 text-center align-bottom">
                      <div className="font-semibold">{role.name}</div>
                      <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-normal text-neutral-500">
                        {role.is_protected ? <Badge tone="blue">Locked</Badge> : <span>{role.users_count} staff</span>}
                      </div>
                      {!role.is_protected && (
                        <div className="mt-1 flex justify-center gap-2 text-[11px] font-normal">
                          <button type="button" className="text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setNameForm({ role })}>
                            Rename
                          </button>
                          <button type="button" className="text-red-600 hover:underline" onClick={() => setToDelete(role)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.data.map((group) => (
                  <GroupRows key={group.group} group={group} roles={roles.data!} draft={draft} onToggle={toggle} onToggleGroup={toggleGroup} />
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-xs text-neutral-500">The Super Admin role always has every permission and cannot be edited or deleted.</p>
          </>
        )}
      </LoadState>

      {nameForm && (
        <RoleNameForm
          role={nameForm.role}
          onClose={() => setNameForm(null)}
          onDone={() => {
            setNameForm(null);
            roles.reload();
          }}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete role"
          message={
            <>
              Delete <strong>{toDelete.name}</strong>? A role that is still given to staff members cannot be deleted.
            </>
          }
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}

function GroupRows({
  group,
  roles,
  draft,
  onToggle,
  onToggleGroup,
}: {
  group: PermissionGroup;
  roles: Role[];
  draft: Record<number, string[]>;
  onToggle: (role: Role, permission: string) => void;
  onToggleGroup: (role: Role, group: PermissionGroup) => void;
}) {
  return (
    <>
      <tr className="bg-neutral-50 dark:bg-neutral-800/50">
        <th scope="row" className="sticky left-0 bg-neutral-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800">
          {titleCase(group.group)}
        </th>
        {roles.map((role) => {
          const granted = role.is_protected ? group.permissions.length : group.permissions.filter((p) => draft[role.id]?.includes(p.name)).length;
          return (
            <td key={role.id} className="px-3 py-2 text-center">
              <button
                type="button"
                disabled={role.is_protected}
                onClick={() => onToggleGroup(role, group)}
                className="text-[11px] text-neutral-500 hover:underline disabled:no-underline"
                aria-label={`Toggle all ${group.group} permissions for ${role.name}`}
              >
                {granted}/{group.permissions.length}
              </button>
            </td>
          );
        })}
      </tr>
      {group.permissions.map((permission) => (
        <tr key={permission.id} className="border-t border-neutral-100 dark:border-neutral-800">
          <th scope="row" className="sticky left-0 bg-white px-4 py-2.5 text-left font-normal dark:bg-neutral-900">
            {titleCase(permission.name.split(".")[1] ?? permission.name)}
            <span className="ml-2 font-mono text-[11px] text-neutral-400">{permission.name}</span>
          </th>
          {roles.map((role) => (
            <td key={role.id} className="px-3 py-2.5 text-center">
              <input
                type="checkbox"
                checked={role.is_protected || (draft[role.id]?.includes(permission.name) ?? false)}
                disabled={role.is_protected}
                onChange={() => onToggle(role, permission.name)}
                aria-label={`${role.name}: ${permission.name}`}
                className="h-4 w-4 rounded"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission permission="roles.manage">
      <Matrix />
    </RequirePermission>
  );
}
