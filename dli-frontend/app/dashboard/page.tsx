"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Clock } from "lucide-react";

export default function DashboardPage() {
  // We'd normally fetch this from `/api/v1/dashboard/me`
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Mocking the fetch with our JSON data
    setUserData({
      name: "Alex Rivera",
      rank: "Expert",
      points: { balance: "12450.0" },
      activeCourse: { title: "Neural Network Architecture", progress: 68 },
    });
  }, []);

  if (!userData) return <div className="p-8 text-lime-400 font-mono">LOADING_NODE_DATA...</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner: Status & Points */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="col-span-2 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-lime-400 mb-2">Current Status</p>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold text-white uppercase">{userData.rank} RANK</h2>
            <div className="text-right">
              <span className="font-mono text-4xl text-white">{userData.points.balance}</span>
              <span className="text-sm text-neutral-400 ml-2 uppercase">XP</span>
            </div>
          </div>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-neutral-950">
            <div className="h-full w-[80%] bg-lime-500" />
          </div>
          <p className="mt-2 text-xs text-neutral-500">You are in the top 2% of contributors. 1,500 XP to next tier.</p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">System Status</p>
          <div className="flex items-center text-lime-400">
            <Activity className="mr-2" size={20} />
            <span className="font-mono">OPTIMAL // CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Active Module */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex items-center justify-center min-h-[300px]">
           <span className="text-neutral-600 font-mono text-sm">[ Analytics Chart Placeholder ]</span>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <span className="rounded bg-lime-500/20 px-2 py-1 text-[10px] font-bold text-lime-400 uppercase">Active Module</span>
             <BookOpen size={16} className="text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-white leading-tight mb-2">
            {userData.activeCourse?.title || "No Active Course"}
          </h3>
          <p className="text-sm text-neutral-400 flex-grow">
            Mastering high-velocity data processing within decentralized environments.
          </p>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400 uppercase">Progress</span>
              <span className="text-lime-400 font-mono">{userData.activeCourse?.progress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-950 mb-4">
              <div className="h-full bg-lime-500" style={{ width: `${userData.activeCourse?.progress}%` }} />
            </div>
            <button className="w-full rounded bg-neutral-800 py-2 text-sm text-white transition hover:bg-neutral-700">
              Resume Course
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}