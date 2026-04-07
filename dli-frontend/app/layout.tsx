import type { Metadata } from "next";
import "./globals.css";
import { AppFooter } from "@/components/shell/app-footer";
import { MobileNavigation, Sidebar } from "@/components/shell/sidebar";
import { TopHeader } from "@/components/shell/top-header";

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
    <html lang="en" className="h-full bg-background">
      <body className="min-h-full bg-background text-foreground antialiased">
        <Sidebar />

        <div className="min-h-screen lg:pl-72">
          <TopHeader />
          <MobileNavigation />

          <div className="flex min-h-[calc(100vh-5rem)] flex-col">
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
              {children}
            </main>
            <AppFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
