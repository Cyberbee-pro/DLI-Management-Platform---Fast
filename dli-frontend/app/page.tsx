import Link from "next/link";
import { 
  Search, 
  Bell, 
  Play, 
  ArrowRight, 
  ClipboardList, 
  GraduationCap, 
  Users, 
  BarChart3 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-lime-500/30">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900">
        <div className="flex items-center">
          <span className="text-xl font-bold tracking-wide text-lime-400">F.A.S.T. DLI</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-lime-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Terminal..." 
              className="w-64 bg-neutral-900 border border-neutral-800 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
            />
          </div>
          <button className="text-neutral-400 hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-lime-500 rounded-full"></span>
          </button>
          <Link 
            href="/login" 
            className="px-6 py-2 bg-lime-500 text-neutral-950 font-bold rounded-md hover:bg-lime-400 transition-colors text-sm"
          >
            LOGIN
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse mr-2"></span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Direct Liaison Interface</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Deploy your skills into the <br className="hidden md:block"/> high-stakes ecosystem of Deep Learning.
          </h1>
          
          <p className="text-lg text-neutral-400 max-w-lg">
            Master NVIDIA frameworks through gamified bounties and tactical learning modules.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link 
              href="/login" 
              className="group flex items-center justify-center px-8 py-3 bg-lime-500 text-neutral-950 font-bold rounded-md hover:bg-lime-400 transition-all"
            >
              BEGIN MISSION 
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              href="/catalogue" 
              className="px-9 py-3 bg-transparent border border-neutral-700 text-white font-medium rounded-md hover:bg-neutral-900 transition-colors"
            >
              VIEW CATALOGUE
            </Link>

          </div>
        </div>

        {/* Right Visual Placeholder */}
        <div className="relative w-full aspect-video rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-center overflow-hidden group">
          {/* Subtle background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-lime-500/5 to-transparent opacity-50"></div>
          
          <button className="relative z-10 w-16 h-16 rounded-full border border-lime-500/30 bg-neutral-950/80 flex items-center justify-center text-lime-400 hover:bg-lime-500 hover:text-neutral-950 transition-all backdrop-blur-sm group-hover:scale-110">
            <Play size={24} className="ml-1" />
          </button>
          <p className="absolute bottom-4 text-xs font-mono text-neutral-500">[ VIDEO_FEED_PLACEHOLDER ]</p>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-10 right-6 hidden lg:flex space-x-8 text-right">
          <div>
            <p className="text-2xl font-mono font-bold text-lime-400">2,842</p>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Active Nodes</p>
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-lime-400">156</p>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Bounties Claimed</p>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM BENTO GRID */}
      <section className="px-6 py-24 bg-neutral-950 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-lime-400 text-xs font-bold uppercase tracking-widest mb-2">Core Architecture</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white">The Ecosystem.</h2>
            </div>
            <p className="text-sm text-neutral-500 max-w-xs">
              Bespoke tools designed for the next generation of artificial intelligence specialists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[250px]">
            {/* Task Board Card */}
            <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 flex flex-col justify-between group hover:border-neutral-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center text-lime-400 mb-4">
                  <ClipboardList size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Task Board</h3>
                <p className="text-sm text-neutral-400 max-w-md">Gamified challenges designed to test your technical limits and earn exclusive F.A.S.T. points.</p>
              </div>
              <div className="mt-4 border-t border-neutral-800 pt-4 flex justify-between items-center">
                 <span className="text-xs text-neutral-500 font-mono">HOT BOUNTIES AVAILABLE</span>
                 <span className="text-lime-400 text-sm font-bold">VIEW LIVE QUEUE</span>
              </div>
            </div>

            {/* Course Catalogue Card */}
            <div className="md:col-span-1 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 flex flex-col group hover:border-neutral-700 transition-colors relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center text-lime-400 mb-4">
                  <GraduationCap size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Course Catalogue</h3>
                <p className="text-sm text-neutral-400">Official NVIDIA DLI training modules tailored for the F.A.S.T. curriculum.</p>
                <ul className="mt-6 space-y-2 text-xs text-neutral-500">
                  <li className="flex items-center"><span className="w-1 h-1 bg-lime-500 rounded-full mr-2"></span> Computer Vision</li>
                  <li className="flex items-center"><span className="w-1 h-1 bg-lime-500 rounded-full mr-2"></span> Transformer Models</li>
                  <li className="flex items-center"><span className="w-1 h-1 bg-lime-500 rounded-full mr-2"></span> Multi-GPU Scaling</li>
                </ul>
              </div>
            </div>

            {/* Connect Card */}
            <div className="md:col-span-1 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 flex flex-col group hover:border-neutral-700 transition-colors">
               <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center text-lime-400 mb-4">
                  <Users size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connect</h3>
                <p className="text-sm text-neutral-400">Connect with fellow club members and track leaderboard standings.</p>
                <div className="mt-auto flex -space-x-2">
                  {[1,2,3].map((i) => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500">UI</div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-lime-500/20 text-lime-400 flex items-center justify-center text-[10px] font-bold">+42</div>
                </div>
            </div>

            {/* Analytics Card */}
            <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 flex flex-col md:flex-row items-center justify-between group hover:border-neutral-700 transition-colors">
               <div className="w-full md:w-1/2 mb-6 md:mb-0">
                 <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center text-lime-400 mb-4">
                    <BarChart3 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">System Analytics</h3>
                  <p className="text-sm text-neutral-400">Track your real-time performance across the platform's multiple learning vectors.</p>
               </div>
               
               {/* Mock Bar Chart */}
               <div className="w-full md:w-1/2 flex items-end justify-between gap-2 h-24 px-4">
                  {[40, 60, 80, 100, 70, 90, 50].map((height, i) => (
                    <div key={i} className="w-full bg-neutral-800 rounded-t-sm relative group-hover:bg-neutral-700 transition-colors" style={{ height: `${height}%` }}>
                      {i === 3 && <div className="absolute inset-0 bg-lime-500 rounded-t-sm shadow-[0_0_15px_rgba(163,230,53,0.5)]"></div>}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 px-6 bg-gradient-to-b from-neutral-950 to-neutral-900 border-t border-neutral-900 text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
          READY TO <span className="text-lime-400">DEPLOY?</span>
        </h2>
        <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10">
          Join the ranks of elite engineers building the next generation of AI-driven infrastructure. Your mission starts now.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-lime-500 text-neutral-950 font-bold rounded-md hover:bg-lime-400 transition-all text-sm tracking-wide"
          >
            AUTHENTICATE TERMINAL
          </Link>
          <button className="w-full sm:w-auto px-8 py-4 bg-neutral-900 border border-neutral-700 text-white font-medium rounded-md hover:bg-neutral-800 transition-colors text-sm tracking-wide">
            LEARN MORE
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 border-t border-neutral-900 bg-neutral-950 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-600">
        <div>
           <p className="font-bold text-lime-400 mb-1 text-sm">F.A.S.T. DLI</p>
           <p>© 2026 F.A.S.T. SRM KATTANKULATHUR, CHENNAI, TN, INDIA</p>
        </div>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <Link href="#" className="hover:text-lime-400 transition-colors">PRIVACY POLICY</Link>
          <Link href="#" className="hover:text-lime-400 transition-colors">TERMS OF SERVICE</Link>
          <Link href="#" className="hover:text-lime-400 transition-colors">CONTACT</Link>
        </div>
      </footer>
    </div>
  );
}