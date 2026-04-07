"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";

export default function BrilliantLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Transform values for the Logo Lockup (Scaling down and fading)
  const logoScale = useTransform(smoothProgress, [0, 0.2], [1, 0.8]);
  const logoOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);

  // Image movement values (Parallax)
  const imgY1 = useTransform(smoothProgress, [0.1, 0.4], [100, -100]);
  const imgY2 = useTransform(smoothProgress, [0.2, 0.5], [150, -150]);
  const imgY3 = useTransform(smoothProgress, [0.3, 0.6], [200, -200]);

  return (
    <div ref={containerRef} className="bg-black text-white selection:bg-lime-500/30 font-sans">
      
      {/* 1. INITIAL HERO: FAST X NVIDIA LOCKUP */}
      <section className="relative h-[200vh] w-full">
        <motion.div 
          style={{ scale: logoScale, opacity: logoOpacity }}
          className="sticky top-0 h-screen flex flex-col items-center justify-center text-center px-4"
        >
          {/* F.A.S.T. Stylized Logo */}
          <div className="mb-6">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 20H80V35H35V45H70V60H35V80H20V20Z" fill="white" />
              <rect x="75" y="20" width="5" height="60" fill="#a3e635" />
            </svg>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter flex items-center gap-4 md:gap-8 italic">
            FAST <span className="not-italic text-neutral-800">X</span> NVIDIA
          </h1>
          
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-12 flex flex-col items-center gap-2 opacity-50"
          >
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Scroll to Enter</span>
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </section>

      {/* 2. THE TRANSITION & EVENT GALLERY */}
      <section className="relative px-6 pb-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        
        {/* Sticky Headline */}
        <div className="sticky top-32 space-y-8">
          <p className="text-lime-400 font-mono text-[10px] uppercase tracking-[0.5em]">
            // Operational Excellence
          </p>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]">
            Deploying the <br/> next class of <br/> <span className="italic font-light">AI Engineers.</span>
          </h2>
          <p className="text-lg text-neutral-500 max-w-md font-light leading-relaxed">
            From regional hackathons to global NVIDIA certifications, the F.A.S.T. ecosystem tracks every milestone in your technical evolution.
          </p>
          <Link 
            href="/login" 
            className="inline-flex items-center gap-4 px-8 py-4 bg-white font-bold rounded-full hover:bg-lime-400 transition-all hover:scale-105 hover:text-white" >
            <div className="flex text-black hover:text-white">
            AUTHENTICATE TERMINAL <ArrowRight size={18} />
            </div>
          </Link>
        </div>

        {/* Parallax Image Column */}
        <div className="space-y-32 pt-32 lg:pt-64">
          <motion.div style={{ y: imgY1 }} className="relative aspect-[4/5] rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
            <img src="/events/hackathon_01.jpg" alt="Hackathon" className="object-cover w-full h-full" />
            <div className="absolute bottom-6 left-6 text-[10px] font-mono bg-black/50 backdrop-blur px-2 py-1">2026_SRM_HACKATHON</div>
          </motion.div>

          <motion.div style={{ y: imgY2 }} className="relative aspect-[1/1] rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
            <img src="/events/workshop_01.jpg" alt="NVIDIA Workshop" className="object-cover w-full h-full" />
            <div className="absolute bottom-6 left-6 text-[10px] font-mono bg-black/50 backdrop-blur px-2 py-1">NVIDIA_DLI_BOOTCAMP</div>
          </motion.div>

          <motion.div style={{ y: imgY3 }} className="relative aspect-[4/3] rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
            <img src="/events/team_01.jpg" alt="Team" className="object-cover w-full h-full" />
            <div className="absolute bottom-6 left-6 text-[10px] font-mono bg-black/50 backdrop-blur px-2 py-1">ARCHITECT_MEETING_v2</div>
          </motion.div>
          
          {/* Add more event images here up to 10 */}
        </div>
      </section>

      {/* 3. BENTO ECOSYSTEM (REFINED) */}
      <section className="px-6 py-32 bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <div className="mb-24">
            <h3 className="text-6xl md:text-8xl font-bold tracking-tighter italic">The <span className="not-italic">Ecosystem.</span></h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-2 aspect-video bg-neutral-900 rounded-3xl p-12 flex flex-col justify-end border border-white/5">
                <h4 className="text-4xl font-bold tracking-tight mb-4">Task Board</h4>
                <p className="text-neutral-500 max-w-sm">Live bounty system for deep learning infrastructure projects.</p>
             </div>
             <div className="aspect-square bg-lime-500 rounded-3xl p-12 flex flex-col justify-between text-black">
                <ArrowRight size={48} className="-rotate-45" />
                <h4 className="text-3xl font-bold tracking-tight">Access <br/> Registry.</h4>
             </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="px-8 py-12 flex flex-col md:flex-row justify-between items-center border-t border-white/5 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">
        <div className="flex gap-8">
          <Link href="#" className="hover:text-white">GitHub</Link>
          <Link href="#" className="hover:text-white">Discord</Link>
        </div>
        <div className="mt-8 md:mt-0 italic">
          FAST X NVIDIA // SRM KTR 2026
        </div>
      </footer>
    </div>
  );
}