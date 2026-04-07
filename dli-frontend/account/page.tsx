"use client";

import { useState } from "react";
import { User, Shield, Github, Mail } from "lucide-react";

export default function AccountPage() {
  const [githubUser, setGithubUser] = useState("arivera-dev");
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Fetch PATCH request to `/api/v1/users/me` would go here
    console.log("Saving settings...");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Node Configuration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Identity */}
        <div className="col-span-1 space-y-6">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-800 overflow-hidden">
               <User size={40} className="text-neutral-500" />
            </div>
            <label className="cursor-pointer rounded border border-neutral-700 bg-neutral-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800">
              UPLOAD AVATAR
              <input type="file" className="hidden" accept="image/*" />
            </label>
            <p className="mt-3 text-[10px] text-neutral-500">Max file size: 5MB (JPEG, PNG)</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase mb-4 flex items-center">
               <Shield size={14} className="mr-2" /> Clearance Level
            </h3>
            <div className="space-y-4 text-sm">
               <div>
                 <span className="block text-neutral-500 text-[10px] uppercase">Identity</span>
                 <span className="text-white">Alex Rivera</span>
               </div>
               <div>
                 <span className="block text-neutral-500 text-[10px] uppercase">SRM Reg No.</span>
                 <span className="font-mono text-lime-400">AR-9924-X</span>
               </div>
               <div>
                 <span className="block text-neutral-500 text-[10px] uppercase">System Role</span>
                 <span className="text-white">Architect Member</span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Settings */}
        <div className="col-span-1 md:col-span-2">
          <form onSubmit={handleSave} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase border-b border-neutral-800 pb-2">Integrations</h3>
              
              <div className="space-y-2">
                <label className="flex items-center text-xs font-medium text-neutral-400 uppercase">
                  <Github size={14} className="mr-2" /> GitHub Username
                </label>
                <input
                  type="text"
                  value={githubUser}
                  onChange={(e) => setGithubUser(e.target.value)}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-lime-500 focus:outline-none"
                />
                <p className="text-[10px] text-neutral-500">Used for automated PR point validation via webhooks.</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-white uppercase border-b border-neutral-800 pb-2">Preferences</h3>
              
              <div className="flex items-center justify-between p-3 rounded bg-neutral-950 border border-neutral-800">
                <div className="flex items-center">
                  <Mail size={16} className="text-neutral-400 mr-3" />
                  <div>
                    <p className="text-sm text-white">System Email Alerts</p>
                    <p className="text-xs text-neutral-500">Receive notifications for point approvals and expiring bounties.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={emailAlerts} 
                    onChange={() => setEmailAlerts(!emailAlerts)} 
                  />
                  <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lime-500"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button type="submit" className="rounded bg-lime-500 px-6 py-2 text-sm font-bold text-neutral-950 transition-colors hover:bg-lime-400">
                UPDATE CONFIGURATION
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}