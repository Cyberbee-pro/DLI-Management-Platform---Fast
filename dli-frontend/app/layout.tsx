// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { AppSWRProvider } from "@/components/providers/swr-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "F.A.S.T. DLI Platform",
  description: "Operational frontend for the F.A.S.T. DLI Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Added "dark" class here to force the theme regardless of system settings
    <html lang="en" className={cn("h-full bg-black dark", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <AppSWRProvider>{children}</AppSWRProvider>
      </body>
    </html>
  );
}
