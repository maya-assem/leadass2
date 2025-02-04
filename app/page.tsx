import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { LeadAssignmentStats } from "@/components/lead-assignment-stats"
import { RecentAssignments } from "@/components/recent-assignments"
import React from "react"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Lead Assignment Dashboard"
        text="Monitor lead assignments and agent workload in real-time."
      />
      <div className="grid gap-4 md:gap-8">
        <LeadAssignmentStats />
        <RecentAssignments />
      </div>
    </DashboardShell>
  )
}


