import { SidebarNav } from "@/components/layout/sidebar-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden dark">
      <aside className="hidden md:block w-64 flex-shrink-0">
        <SidebarNav />
      </aside>
      <main className="flex-1 relative overflow-y-auto focus:outline-none bg-background">
        <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}