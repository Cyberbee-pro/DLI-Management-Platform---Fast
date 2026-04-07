import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
