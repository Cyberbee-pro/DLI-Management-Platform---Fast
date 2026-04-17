"use client";

import { useMemo, useState } from "react";
import { Loader2, PencilLine, Search, Shield } from "lucide-react";

import { TaskModalShell } from "@/components/task-board/task-modal-shell";
import type { ManagedUserRecord, ManagedUserRole } from "@/lib/api";

export interface EditUserRoleForm {
  userId: string;
  role: ManagedUserRole;
  designation?: string | null;
}

interface EditUserModalProps {
  open: boolean;
  users: ManagedUserRecord[];
  designationSuggestions: string[];
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: EditUserRoleForm) => Promise<void>;
}

const ROLE_OPTIONS: ManagedUserRole[] = ["member", "moderator", "admin"];

function formatRole(role: ManagedUserRole) {
  return role.toUpperCase();
}

export function EditUserModal({
  open,
  users,
  designationSuggestions,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}: EditUserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<ManagedUserRole>("member");
  const [designation, setDesignation] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [
        user.name,
        user.email ?? "",
        user.srmRegNo,
        user.role,
        user.designation ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [searchQuery, users]);

  const selectedUser = users.find((user) => user._id === selectedUserId) ?? null;

  function resetState() {
    setSearchQuery("");
    setSelectedUserId("");
    setRole("member");
    setDesignation("");
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSelectUser(user: ManagedUserRecord) {
    setSelectedUserId(user._id);
    setRole(user.role);
    setDesignation(user.designation ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    await onSubmit({
      userId: selectedUser._id,
      role,
      designation: designation.trim() || null,
    });
  }

  const canSubmit = Boolean(selectedUser) && !submitting;

  return (
    <TaskModalShell
      open={open}
      onClose={handleClose}
      title="Edit User Access"
      subtitle="Select an existing operator, then update their RBAC role and designation profile."
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="rounded-sm border border-neutral-800 bg-black/60">
            <div className="border-b border-neutral-800 px-4 py-4">
              <label className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-3">
                <Search className="h-4 w-4 text-lime-300" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, email, SRM, role, or designation"
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-neutral-600"
                />
              </label>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto px-4 py-4">
              {filteredUsers.length === 0 ? (
                <div className="rounded-sm border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-200">
                  No users matched the current search query.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = user._id === selectedUserId;

                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full rounded-sm border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-lime-400/30 bg-lime-400/10 shadow-[0_0_24px_rgba(163,230,53,0.08)]"
                          : "border-neutral-800 bg-neutral-950 hover:border-lime-400/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{user.name}</p>
                          <p className="mt-2 text-xs text-neutral-500">
                            {user.email ?? "No email"} / {user.srmRegNo}
                          </p>
                        </div>

                        <span className="rounded-sm border border-neutral-800 bg-black px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-lime-300">
                          {formatRole(user.role)}
                        </span>
                      </div>

                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        {user.designation?.trim() || "No designation"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-lime-300" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                    Selected Operator
                  </p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {selectedUser ? selectedUser.name : "Select a user from the registry"}
                  </p>
                </div>
              </div>

              {selectedUser ? (
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  {selectedUser.email ?? "NO_EMAIL"} / {selectedUser.srmRegNo}
                </p>
              ) : null}
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <label className="block text-sm font-medium text-zinc-100">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as ManagedUserRole)}
                disabled={!selectedUser}
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {formatRole(roleOption)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <label className="block text-sm font-medium text-zinc-100">Designation</label>
              <input
                type="text"
                list="existing-designations-edit"
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                disabled={!selectedUser}
                placeholder="Frontend Dev, AI Lead, Ops Mentor..."
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <datalist id="existing-designations-edit">
                {designationSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>

            <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime-300">
                Access Preview
              </p>
              <p className="mt-3 text-lg font-semibold text-lime-100">
                {selectedUser ? formatRole(role) : "SELECT USER"}
              </p>
              <p className="mt-2 text-sm text-lime-200/80">
                {designation.trim() || "No designation assigned"}
              </p>
            </div>
          </aside>
        </section>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-5">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
            {submitting ? "UPDATING..." : "SAVE_ACCESS_PROFILE"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-zinc-100"
          >
            CANCEL
          </button>
        </div>
      </form>
    </TaskModalShell>
  );
}
