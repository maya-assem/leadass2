import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileCheck, AlertCircle } from "lucide-react"
import { bitrixApi, type Agent, type Deal } from "@/lib/bitrix"
import { getRecentAssignments, recordAssignment } from "@/lib/db"
import { useEffect, useState } from "react"

export function LeadAssignmentStats() {
  const [stats, setStats] = useState<{
    agents: Agent[]
    assignedToday: number
    pendingDeals: Deal[]
    recentAssignments: any[]
  }>({
    agents: [],
    assignedToday: 0,
    pendingDeals: [],
    recentAssignments: [],
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgentStats() {
      try {
        const agents = await bitrixApi.getAgentsWithLeadDealCounts()
        setStats((prevStats) => ({ ...prevStats, agents }))
      } catch (err) {
        console.error("Error fetching agent stats:", err)
        setError("Failed to fetch latest agent stats. Please try again later.")
      }
    }

    async function fetchAndAssignNewDeals() {
      try {
        const pendingDeals = await bitrixApi.getNewDeals()
        const newAssignments = await bitrixApi.assignNewDealsToAgents()
        newAssignments.forEach((assignment) => {
          const deal = pendingDeals.find((d) => d.ID === assignment.dealId)
          if (deal) {
            recordAssignment(deal.ID, deal.TITLE, assignment.agentId, assignment.agentName)
          }
        })

        const recentAssignments = getRecentAssignments()
        const today = new Date().toDateString()
        const assignedToday = recentAssignments.filter((a) => new Date(a.assignedAt).toDateString() === today).length

        setStats((prevStats) => ({
          ...prevStats,
          assignedToday,
          pendingDeals,
          recentAssignments,
        }))
      } catch (err) {
        console.error("Error fetching and assigning new deals:", err)
        setError("Failed to fetch and assign new deals. Please try again later.")
      }
    }

    // Initial fetch
    fetchAgentStats()
    fetchAndAssignNewDeals()

    // Set up intervals
    const agentStatsInterval = setInterval(fetchAgentStats, 60000) // Every 1 minute
    const newDealsInterval = setInterval(fetchAndAssignNewDeals, 60000) // Every 1 minute

    // Clean up intervals
    return () => {
      clearInterval(agentStatsInterval)
      clearInterval(newDealsInterval)
    }
  }, [])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <p className="text-xs text-muted-foreground">Deals assigned today</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Deals</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingDeals.length}</div>
          <p className="text-xs text-muted-foreground">Awaiting assignment</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Agent Lead Deal Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.agents.map((agent) => (
              <div key={agent.ID} className="flex justify-between items-center p-2 bg-secondary rounded-md">
                <span>
                  {agent.NAME} {agent.LAST_NAME}
                </span>
                <span className="font-semibold">{agent.LEAD_DEAL_COUNT || 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



