import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileCheck, AlertCircle, TrendingUp } from "lucide-react"
import { bitrixApi, type Agent, type Lead } from "@/lib/bitrix"
import { getRecentAssignments, recordAssignment } from "@/lib/db"
import { useEffect, useState } from "react"

export function LeadAssignmentStats() {
  const [stats, setStats] = useState<{
    agents: Agent[]
    assignedToday: number
    pendingLeads: Lead[]
    recentAssignments: any[]
  }>({
    agents: [],
    assignedToday: 0,
    pendingLeads: [],
    recentAssignments: [],
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgentStats() {
      try {
        const agents = await bitrixApi.getAgentsWithLeadCounts()
        setStats((prevStats) => ({ ...prevStats, agents }))
      } catch (err) {
        console.error("Error fetching agent stats:", err)
        setError("Failed to fetch latest agent stats. Please try again later.")
      }
    }

    async function fetchAndAssignNewLeads() {
      try {
        const pendingLeads = await bitrixApi.getNewLeads()
        const newAssignments = await bitrixApi.assignNewLeadsToAgents()
        newAssignments.forEach((assignment) => {
          const lead = pendingLeads.find((l) => l.ID === assignment.leadId)
          if (lead) {
            recordAssignment(lead.ID, lead.TITLE, assignment.agentId, assignment.agentName)
          }
        })

        const recentAssignments = getRecentAssignments()
        const today = new Date().toDateString()
        const assignedToday = recentAssignments.filter((a) => new Date(a.assignedAt).toDateString() === today).length

        setStats((prevStats) => ({
          ...prevStats,
          assignedToday,
          pendingLeads,
          recentAssignments,
        }))
      } catch (err) {
        console.error("Error fetching and assigning new leads:", err)
        setError("Failed to fetch and assign new leads. Please try again later.")
      }
    }

    // Initial fetch
    fetchAgentStats()
    fetchAndAssignNewLeads()

    // Set up intervals
    const agentStatsInterval = setInterval(fetchAgentStats, 60000) // Every 1 minute
    const newLeadsInterval = setInterval(fetchAndAssignNewLeads, 180000) // Every 3 minutes

    // Clean up intervals
    return () => {
      clearInterval(agentStatsInterval)
      clearInterval(newLeadsInterval)
    }
  }, [])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.agents.length}</div>
          <p className="text-xs text-muted-foreground">Currently clocked in</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assigned Today</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.assignedToday}</div>
          <p className="text-xs text-muted-foreground">Leads assigned today</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Leads</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingLeads.length}</div>
          <p className="text-xs text-muted-foreground">Awaiting assignment</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agent Lead Counts</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm max-h-[150px] overflow-y-auto">
            {stats.agents.map((agent) => (
              <div key={agent.ID} className="flex justify-between items-center mb-1">
                <span>
                  {agent.NAME} {agent.LAST_NAME}:
                </span>
                <span className="font-semibold">{agent.LEAD_COUNT || 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


