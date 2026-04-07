import { AppFooter } from "@/components/shell/app-footer";
import { MobileNavigation, Sidebar } from "@/components/shell/sidebar";
import { TopHeader } from "@/components/shell/top-header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />

      <div className="min-h-screen lg:pl-72">
        <TopHeader />
        <MobileNavigation />

        <div className="flex min-h-[calc(100vh-5rem)] flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
          <AppFooter />
        </div>
      </div>
    </>
  );
}
