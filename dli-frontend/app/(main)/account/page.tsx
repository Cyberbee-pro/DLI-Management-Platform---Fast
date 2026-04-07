"use client";

import { useState } from "react";
import { Link2, Mail, Shield, User } from "lucide-react";

export default function AccountPage() {
  const [githubUser, setGithubUser] = useState("arivera-dev");
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Saving settings...");
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold uppercase tracking-wider text-white">
        Node Configuration
      </h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="col-span-1 space-y-6">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-neutral-800">
              <User size={40} className="text-neutral-500" />
            </div>
            <label className="cursor-pointer rounded border border-neutral-700 bg-neutral-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800">
              UPLOAD AVATAR
              <input type="file" className="hidden" accept="image/*" />
            </label>
            <p className="mt-3 text-[10px] text-neutral-500">Max file size: 5MB (JPEG, PNG)</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="mb-4 flex items-center text-xs font-bold uppercase text-neutral-500">
              <Shield size={14} className="mr-2" /> Clearance Level
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <span className="block text-[10px] uppercase text-neutral-500">Identity</span>
                <span className="text-white">Alex Rivera</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-neutral-500">SRM Reg No.</span>
                <span className="font-mono text-lime-400">AR-9924-X</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-neutral-500">System Role</span>
                <span className="text-white">Architect Member</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <form
            onSubmit={handleSave}
            className="space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
          >
            <div className="space-y-4">
              <h3 className="border-b border-neutral-800 pb-2 text-sm font-bold uppercase text-white">
                Integrations
              </h3>

              <div className="space-y-2">
                <label className="flex items-center text-xs font-medium uppercase text-neutral-400">
                  <Link2 size={14} className="mr-2" /> GitHub Username
                </label>
                <input
                  type="text"
                  value={githubUser}
                  onChange={(event) => setGithubUser(event.target.value)}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-lime-500 focus:outline-none"
                />
                <p className="text-[10px] text-neutral-500">
                  Used for automated PR point validation via webhooks.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="border-b border-neutral-800 pb-2 text-sm font-bold uppercase text-white">
                Preferences
              </h3>

              <div className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950 p-3">
                <div className="flex items-center">
                  <Mail size={16} className="mr-3 text-neutral-400" />
                  <div>
                    <p className="text-sm text-white">System Email Alerts</p>
                    <p className="text-xs text-neutral-500">
                      Receive notifications for point approvals and expiring bounties.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={emailAlerts}
                    onChange={() => setEmailAlerts(!emailAlerts)}
                  />
                  <div className="h-5 w-9 rounded-full bg-neutral-700 peer-focus:outline-none peer-checked:bg-lime-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-['']" />
                </label>
              </div>
            </div>

            <div className="flex justify-end border-t border-neutral-800 pt-4">
              <button
                type="submit"
                className="rounded bg-lime-500 px-6 py-2 text-sm font-bold text-neutral-950 transition-colors hover:bg-lime-400"
              >
                UPDATE CONFIGURATION
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
