import axios from "axios"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const BITRIX_URL = "https://diet-hub.bitrix24.com/rest/1/q5iy1s9aemfpc1j1"

export interface Deal {
  ID: string
  TITLE: string
  ASSIGNED_BY_ID: string
  DATE_CREATE: string
  STAGE_ID: string
}

export interface Agent {
  ID: string
  NAME: string
  LAST_NAME: string
  ACTIVE: boolean
  LEAD_DEAL_COUNT?: number
}

class BitrixAPI {
  private assignedDeals: Set<string> = new Set()

  private async request(endpoint: string, method = "GET", data?: any, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url: `${BITRIX_URL}/${endpoint}`,
          data,
        })
        return response.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.log(`Rate limit hit, retrying in ${(i + 1) * 1000}ms...`)
          await delay((i + 1) * 1000) // Wait for 1s, 2s, 3s before retrying
        } else {
          throw error
        }
      }
    }
    throw new Error(`Failed after ${retries} retries`)
  }

  async getClockedInAgents(): Promise<Agent[]> {
    console.log("Getting clocked-in agents...")
    try {
      const result = await this.request("user.get")
      const activeAgents = result.result.filter((agent: any) => agent.IS_ONLINE === "Y")
      console.log(`Found ${activeAgents.length} clocked-in agents`)
      return activeAgents as Agent[]
    } catch (error) {
      console.error("Error getting clocked-in agents:", error)
      return []
    }
  }

  async getAgentLeadDealCount(agentId: string): Promise<number> {
    console.log(`Getting lead deal count for agent ${agentId}...`)
    try {
      const result = await this.request("crm.deal.list", "GET", {
        filter: {
          ASSIGNED_BY_ID: agentId,
          STAGE_ID: "NEW", // Assuming "NEW" is the stage ID for leads
        },
        select: ["ID"],
      })
      console.log(`Agent ${agentId} has ${result.result.length} lead deals`)
      return result.result.length
    } catch (error) {
      console.error(`Error getting lead deal count for agent ${agentId}:`, error)
      return 0
    }
  }

  async getAgentsWithLeadDealCounts(): Promise<Agent[]> {
    const agents = await this.getClockedInAgents()
    const agentsWithCountsPromises = agents.map(async (agent) => {
      try {
        const leadDealCount = await this.getAgentLeadDealCount(agent.ID)
        return { ...agent, LEAD_DEAL_COUNT: leadDealCount }
      } catch (error) {
        console.error(`Failed to get lead deal count for agent ${agent.ID}:`, error)
        return { ...agent, LEAD_DEAL_COUNT: 0 }
      }
    })
    const results = await Promise.allSettled(agentsWithCountsPromises)
    return results
      .filter((result): result is PromiseFulfilledResult<Agent> => result.status === "fulfilled")
      .map((result) => result.value)
  }

  async findLeastLoadedAgent(agents: Agent[]): Promise<Agent | null> {
    console.log("Finding least loaded agent...")
    if (agents.length === 0) return null
    const validAgents = agents.filter((agent) => agent.LEAD_DEAL_COUNT !== undefined)
    if (validAgents.length === 0) {
      console.log("No agents with valid lead deal counts found")
      return null
    }
    return validAgents.reduce((min, agent) =>
      (agent.LEAD_DEAL_COUNT || 0) < (min.LEAD_DEAL_COUNT || Number.POSITIVE_INFINITY) ? agent : min,
    )
  }

  async assignDealToAgent(dealId: string, agentId: string): Promise<boolean> {
    if (this.assignedDeals.has(dealId)) {
      console.log(`Deal ${dealId} has already been assigned. Skipping.`)
      return false
    }

    console.log(`Assigning deal ${dealId} to agent ${agentId}...`)
    try {
      const result = await this.request("crm.deal.update", "POST", {
        id: dealId,
        fields: {
          ASSIGNED_BY_ID: agentId,
        },
      })
      if (result.result) {
        this.assignedDeals.add(dealId)
        return true
      }
      return false
    } catch (error) {
      console.error("Error assigning deal:", error)
      return false
    }
  }

  async getNewDeals(): Promise<Deal[]> {
    console.log("Checking for new deals...")
    try {
      const result = await this.request("crm.deal.list", "GET", {
        filter: {
          STAGE_ID: "NEW", // Only deals in the "lead" stage
          ASSIGNED_BY_ID: 0, // Unassigned deals
          ">DATE_CREATE": new Date(Date.now() - 60 * 1000).toISOString(), // Only deals created in the last 1 minute
        },
        select: ["ID", "TITLE", "ASSIGNED_BY_ID", "DATE_CREATE", "STAGE_ID"],
      })
      console.log(`Found ${result.result.length} new deals`)
      return result.result as Deal[]
    } catch (error) {
      console.error("Error getting new deals:", error)
      return []
    }
  }

  async assignNewDealsToAgents(): Promise<{ dealId: string; agentId: string; agentName: string }[]> {
    const newDeals = await this.getNewDeals()
    let agents = await this.getAgentsWithLeadDealCounts()
    const assignments: { dealId: string; agentId: string; agentName: string }[] = []

    for (const deal of newDeals) {
      if (!this.assignedDeals.has(deal.ID)) {
        const leastLoadedAgent = await this.findLeastLoadedAgent(agents)
        if (leastLoadedAgent) {
          const success = await this.assignDealToAgent(deal.ID, leastLoadedAgent.ID)
          if (success) {
            assignments.push({
              dealId: deal.ID,
              agentId: leastLoadedAgent.ID,
              agentName: `${leastLoadedAgent.NAME} ${leastLoadedAgent.LAST_NAME}`,
            })
            leastLoadedAgent.LEAD_DEAL_COUNT = (leastLoadedAgent.LEAD_DEAL_COUNT || 0) + 1

            // Update the agents array with the new lead deal count
            agents = agents.map((agent) => (agent.ID === leastLoadedAgent.ID ? leastLoadedAgent : agent))
          }
        } else {
          console.log(`No available agent to assign deal ${deal.ID}`)
        }
      } else {
        console.log(`Deal ${deal.ID} has already been assigned. Skipping.`)
      }
    }

    return assignments
  }
}

export const bitrixApi = new BitrixAPI()
