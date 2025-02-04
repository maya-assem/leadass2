import React from "react"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <p className="text-muted-foreground">Navigation coming soon...</p>
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}


