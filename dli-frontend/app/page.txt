"use client";

import { useRef, type RefObject } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import BorderGlow from "@/components/BorderGlow";

const SPRING_CONFIG = {
  stiffness: 100,
  damping: 30,
  restDelta: 0.001,
} as const;

const PARALLAX_DISTANCE = 250;

// --- REFINED STAGGERED ANIMATION HOOK ---
function useStaggeredCluster(targetRef: RefObject<HTMLDivElement | null>) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    // Start the animation when the top of the container is 85% down the screen
    offset: ["start 85%", "end start"],
  });

  const progress = useSpring(scrollYProgress, SPRING_CONFIG);

  return {
    // PIC 1: Quick, subtle lift (150px) and fade in. Then Parallax.
    p1_y: useTransform(progress, [0.0, 0.15, 1], [150, 0, -PARALLAX_DISTANCE * 0.9]),
    p1_o: useTransform(progress, [0.0, 0.1], [0, 1]),

    // PIC 2: Slightly delayed, lifts from 200px.
    p2_y: useTransform(progress, [0.05, 0.2, 1], [200, 0, -PARALLAX_DISTANCE * 0.73]),
    p2_o: useTransform(progress, [0.05, 0.15], [0, 1]),

    // PIC 3: Lifts from 250px.
    p3_y: useTransform(progress, [0.1, 0.25, 1], [250, 0, -PARALLAX_DISTANCE * 0.63]),
    p3_o: useTransform(progress, [0.1, 0.2], [0, 1]),

    // PIC 4: Last to arrive, lifts from 300px.
    p4_y: useTransform(progress, [0.15, 0.3, 1], [300, 0, -PARALLAX_DISTANCE * 0.45]),
    p4_o: useTransform(progress, [0.15, 0.25], [0, 1]),

    // iOS Stacking Effect: Scale and fade out as it leaves the top of the screen
    scale: useTransform(progress, [0.75, 1], [1, 0.85]),
    opacity: useTransform(progress, [0.85, 1], [1, 0.2]),
  };
}

export default function BrilliantLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fastathonRef = useRef<HTMLDivElement>(null);
  const workshopRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  // --- SCROLL ANIMATIONS ---
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    ...SPRING_CONFIG,
  });

  // Transform values for the Logo Lockup
  const logoScale = useTransform(smoothProgress, [0, 0.2], [1, 0.8]);
  const logoOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);

  // Hook into our newly refined staggered logic
  const fMotion = useStaggeredCluster(fastathonRef);
  const wMotion = useStaggeredCluster(workshopRef);
  const tMotion = useStaggeredCluster(teamRef);

  return (
    <div
      ref={containerRef}
      className="relative bg-black text-white selection:bg-lime-500/30 font-sans"
    >
      {/* 1. INITIAL HERO: FAST X NVIDIA LOCKUP */}
      <section className="relative h-[200vh] w-full">
        <motion.div
          style={{ scale: logoScale, opacity: logoOpacity }}
          className="sticky top-0 h-screen flex flex-col items-center justify-center text-center px-4"
        >
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
        <div className="sticky top-32 space-y-8 z-50">
          <p className="text-lime-400 font-mono text-[10px] uppercase tracking-[0.5em]">
            {"// Operational Excellence"}
          </p>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]">
            Deploying the <br /> next class of <br />{" "}
            <span className="italic font-light">AI Engineers.</span>
          </h2>
          <p className="text-lg text-neutral-500 max-w-md font-light leading-relaxed">
            From regional hackathons to global NVIDIA certifications, the F.A.S.T.
            ecosystem tracks every milestone in your technical evolution.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-4 px-8 py-4 bg-white font-bold rounded-full hover:bg-lime-400 transition-all hover:scale-105 hover:text-white"
          >
            <div className="flex text-black hover:text-white items-center gap-2">
              AUTHENTICATE TERMINAL <ArrowRight size={18} />
            </div>
          </Link>
        </div>

        {/* OVERLAPPING STICKY COLLAGE */}
        <div className="relative pb-[30vh] pt-32 w-full max-w-5xl mx-auto">
          
          {/* ---------------- 1. FASTATHON CLUSTER ---------------- */}
          {/* Reduced from h-[130vh] to h-[100vh] to tighten the gaps between clusters */}
          <div ref={fastathonRef} className="relative h-[100vh]">
            <div className="sticky top-24 z-10 h-[70vh] w-full">
              <motion.div
                style={{ scale: fMotion.scale, opacity: fMotion.opacity }}
                className="w-full h-full relative"
              >
                <motion.div style={{ y: fMotion.p1_y, opacity: fMotion.p1_o }} className="absolute top-0 left-0 w-[55%] h-[65%] rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900/50">
                  <Image src="/events/Fastathon/fst1.JPG" alt="Fastathon" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                  <div className="absolute bottom-4 left-4 text-[10px] font-mono bg-black/70 backdrop-blur px-2 py-1 text-lime-400">2026_FASTATHON</div>
                </motion.div>

                <motion.div style={{ y: fMotion.p2_y, opacity: fMotion.p2_o }} className="absolute top-[10%] right-0 w-[50%] h-[55%] z-20 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-800">
                  <Image src="/events/Fastathon/fst3.JPG" alt="Fastathon" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>

                <motion.div style={{ y: fMotion.p3_y, opacity: fMotion.p3_o }} className="absolute bottom-0 left-[15%] w-[45%] h-[55%] z-30 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900/50">
                  <Image src="/events/Fastathon/fst2.JPG" alt="Fastathon" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>

                <motion.div style={{ y: fMotion.p4_y, opacity: fMotion.p4_o }} className="absolute bottom-[10%] right-[5%] w-[35%] h-[40%] z-40 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900">
                  <Image src="/events/Fastathon/fst6.jpg" alt="Fastathon" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* ---------------- 2. WORKSHOP CLUSTER ---------------- */}
          <div ref={workshopRef} className="relative h-[100vh]">
            <div className="sticky top-32 z-20 h-[70vh] w-full">
              <motion.div
                style={{ scale: wMotion.scale, opacity: wMotion.opacity }}
                className="w-full h-full relative"
              >
                <motion.div style={{ y: wMotion.p1_y, opacity: wMotion.p1_o }} className="absolute top-0 right-0 w-[60%] h-[70%] rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900/50">
                  <Image src="/events/workshops/ragevn7.JPG" alt="NVIDIA Workshop" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                  <div className="absolute bottom-4 left-4 text-[10px] font-mono bg-black/70 backdrop-blur px-2 py-1 text-lime-400">RAG_LLMs</div>
                </motion.div>

                <motion.div style={{ y: wMotion.p2_y, opacity: wMotion.p2_o }} className="absolute top-[20%] left-0 w-[45%] h-[60%] z-20 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-800">
                  <Image src="/events/workshops/ragevn4.JPG" alt="NVIDIA Workshop" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>

                <motion.div style={{ y: wMotion.p3_y, opacity: wMotion.p3_o }} className="absolute bottom-0 right-[15%] w-[50%] h-[45%] z-30 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900/50">
                  <Image src="/events/workshops/ragevn1.JPG" alt="NVIDIA Workshop" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* ---------------- 3. TEAMS CLUSTER ---------------- */}
          <div ref={teamRef} className="relative h-[100vh]">
            <div className="sticky top-40 z-30 h-[70vh] w-full">
              <motion.div 
                style={{ scale: tMotion.scale, opacity: tMotion.opacity }}
                className="w-full h-full relative"
              >
                <motion.div style={{ y: tMotion.p1_y, opacity: tMotion.p1_o }} className="absolute top-0 left-[5%] w-[50%] h-[60%] rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900/50">
                  <Image src="/events/Team/tm1.jpg" alt="Team" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                  <div className="absolute bottom-4 left-4 text-[10px] font-mono bg-black/70 backdrop-blur px-2 py-1 text-lime-400">NODE_TEAMS</div>
                </motion.div>

                <motion.div style={{ y: tMotion.p2_y, opacity: tMotion.p2_o }} className="absolute top-[15%] right-0 w-[45%] h-[55%] z-20 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-800">
                  <Image src="/events/Team/tm3.JPG" alt="Team" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>

                <motion.div style={{ y: tMotion.p3_y, opacity: tMotion.p3_o }} className="absolute bottom-[5%] left-[25%] w-[40%] h-[50%] z-30 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900/50">
                  <Image src="/events/Team/tm2.JPG" alt="Team" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>

                <motion.div style={{ y: tMotion.p4_y, opacity: tMotion.p4_o }} className="absolute bottom-0 right-[10%] w-[35%] h-[40%] z-40 rounded-2xl overflow-hidden grayscale-0 hover:grayscale-[75%] transition-all duration-700 shadow-2xl border border-neutral-900">
                  <Image src="/events/Team/tm4.JPG" alt="Team" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BENTO ECOSYSTEM */}
      <section className="px-6 py-32 bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <div className="mb-24">
            <h3 className="text-6xl md:text-8xl font-bold tracking-tighter italic">
              The <span className="not-italic">Ecosystem.</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/tasks" className="md:col-span-2">
              <BorderGlow borderRadius={24} glowColor="163 230 53" glowRadius={100} glowIntensity={1.5}>
                <div className="group h-full aspect-video bg-neutral-900 rounded-3xl p-12 flex flex-col justify-end border border-white/5 transition-all duration-400 hover:bg-lime-500/15">
                  <h4 className="text-4xl font-bold tracking-tight mb-4">Task Board</h4>
                  <p className="text-neutral-500 max-w-sm group-hover:text-white">
                    Live bounty system for deep learning infrastructure projects.
                  </p>
                </div>
              </BorderGlow>
            </Link>

            <Link href="/login">
              <BorderGlow borderRadius={24} glowColor="0 0 0" glowRadius={80}>
                <div className="h-full aspect-square bg-lime-500 rounded-3xl p-12 flex flex-col justify-between text-black transition-transform duration-300 hover:scale-[0.98]">
                  <ArrowRight size={48} className="-rotate-45" />
                  <h4 className="text-3xl font-bold tracking-tight">
                    Access <br /> Registry.
                  </h4>
                </div>
              </BorderGlow>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="px-8 py-12 flex flex-col md:flex-row justify-between items-center border-t border-white/5 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600">
        <div className="flex gap-8">
          <Link href="#" className="hover:text-white">GitHub</Link>
          <Link href="#" className="hover:text-white">Discord</Link>
        </div>
        <div className="mt-8 md:mt-0 italic">FAST X NVIDIA // SRM KTR 2026</div>
      </footer>
    </div>
  );
}