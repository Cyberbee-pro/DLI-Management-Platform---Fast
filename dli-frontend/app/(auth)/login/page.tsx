"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Terminal } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiDiscord } from 'react-icons/si';

import ColorBends from '@/components/ColorBends';
import {Michroma} from "next/font/google";
import PixelBlast from '@/components/PixelBlast'
import { API_BASE_URL } from "@/config/constants";
import TargetCursor from '@/components/TargetCursor';
import { getStoredToken, storeStoredToken } from "@/lib/session";
import FaultyTerminal from '@/components/FaultyTerminal';


const michroma = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-michroma",
});


interface AuthApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    token?: string;
  };
}

function buildLoginEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/auth/login` : "";
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const existingToken = getStoredToken();

    if (existingToken) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const loginEndpoint = buildLoginEndpoint();
    const email = identifier.trim();

    if (!loginEndpoint) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as AuthApiResponse | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Invalid credentials");
      }

      const token = payload?.data?.token;

      if (!token) {
        throw new Error("Login succeeded, but the backend did not return a token.");
      }

      storeStoredToken(token);
      router.push("/dashboard");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to authenticate with the server.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen  bg-neutral-950 p-4">
      <TargetCursor 
        spinDuration={4.3}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.3}/>
      <div className="w-[80vw] h-screen  relative overflow-hidden justify-center items-center flex">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {/* <FaultyTerminal
              scale={2}
              gridMul={[2, 1]}
              digitSize={0.9}
              timeScale={0.7}
              pause={false}
              scanlineIntensity={0.8}
              glitchAmount={1}
              flickerAmount={1}
              noiseAmp={1}
              chromaticAberration={0}
              dither={0}
              curvature={0.0}
              tint="#76B900"
              mouseReact
              mouseStrength={0.6}
              pageLoadAnimation
              brightness={0.6}/> */}

<ColorBends
  colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
  rotation={-180}
  speed={0.37}
  scale={0.2}
  frequency={4}
  warpStrength={1}
  mouseInfluence={2}
  noise={1}
  parallax={0.9}
  iterations={1}
  intensity={2}
  bandWidth={17.5}
  transparent
  autoRotate={0}
  color="#A855F7"
/>
              </div>
            <div className={`absolute flex flex-col gap-8 ml-8 text-5xl text-lime-400 ${michroma.className} `}>
              <p>F.A.S.T. X NVIDIA</p>
              <p> Deep Learning Institute</p>
              <p>Access Terminal</p>
            </div>

      </div>

    <div className="w-[55vw] h-screen relative flex justify-center items-center">
      {/* Background */}
  <PixelBlast
    variant="square"
    pixelSize={1}
    color="#B497CF"
    patternScale={3.5}
    patternDensity={0.05}
    pixelSizeJitter={0}
    enableRipples
    rippleSpeed={0.4}
    rippleThickness={0.12}
    rippleIntensityScale={1.5}
    liquid={false}
    liquidStrength={0.12}
    liquidRadius={1.2}
    liquidWobbleSpeed={5}
    speed={0.7}
    edgeFade={0.25}
    transparent
  />




<div className="flex flex-col absolute gap-6">
        <div className={`  cursor-target ml-8 mb-15 text-5xl ${michroma.className} `}>
        
        LOGIN TERMINAL

        </div>
        <form onSubmit={handleLogin} className="space-y-6 ">
          <div className="space-y-2 cursor-target">
            <label className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-400  cursor-target">
              Email
            </label>
            <input
              type="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white transition-colors focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              placeholder="architect.member@srm.edu"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2  cursor-target">
            <label className=" cursor-target text-xs font-medium uppercase tracking-[0.24em] text-neutral-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white transition-colors focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className=" cursor-target w-full rounded bg-lime-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "AUTHENTICATING..." : "AUTHENTICATE TERMINAL"}
          </button>


          {error ? (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
        </form>
        <div className="flex gap-4 mt-4">
          <Link href="/" className="group inline-flex items-center gap-4 w-fit px-8 py-4 bg-white font-bold  hover:bg-lime-400 transition-all hover:scale-105 hover:text-white cursor-target pointer-events-auto">
              <div className="flex text-black group-hover:text-white items-center gap-2">
                <ArrowLeft size={18} />Back to home 
              </div>
            </Link>
          <Link href="#" className="group inline-flex items-center gap-4 w-fit px-8 py-4 bg-white font-bold  hover:bg-lime-400 transition-all hover:scale-105 hover:text-white cursor-target pointer-events-auto">
              <div className="flex text-black group-hover:text-white items-center gap-2">
                <SiDiscord size={24} />Discord
              </div>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
