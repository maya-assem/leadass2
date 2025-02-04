import axios from "axios"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const BITRIX_URL = "https://diet-hub.bitrix24.com/rest/1/q5iy1s9aemfpc1j1"

export interface Lead {
  ID: string
  TITLE: string
  ASSIGNED_BY_ID: string
  DATE_CREATE: string
  STATUS_ID: string
}

export interface Agent {
  ID: string
  NAME: string
  LAST_NAME: string
  ACTIVE: boolean
  LEAD_COUNT?: number
}

class BitrixAPI {
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

  async getAgentLeadCount(agentId: string): Promise<number> {
    console.log(`Getting lead count for agent ${agentId}...`)
    try {
      const result = await this.request("crm.lead.list", "GET", {
        filter: {
          ASSIGNED_BY_ID: agentId,
          STATUS_ID: "NEW", // Assuming "NEW" is the status ID for new leads
        },
        select: ["ID"],
      })
      console.log(`Agent ${agentId} has ${result.result.length} active leads`)
      return result.result.length
    } catch (error) {
      console.error(`Error getting lead count for agent ${agentId}:`, error)
      return 0
    }
  }

  async getAgentsWithLeadCounts(): Promise<Agent[]> {
    const agents = await this.getClockedInAgents()
    const agentsWithCountsPromises = agents.map(async (agent) => {
      try {
        const leadCount = await this.getAgentLeadCount(agent.ID)
        return { ...agent, LEAD_COUNT: leadCount }
      } catch (error) {
        console.error(`Failed to get lead count for agent ${agent.ID}:`, error)
        return { ...agent, LEAD_COUNT: 0 }
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
    const validAgents = agents.filter((agent) => agent.LEAD_COUNT !== undefined)
    if (validAgents.length === 0) {
      console.log("No agents with valid lead counts found")
      return null
    }
    return validAgents.reduce((min, agent) =>
      (agent.LEAD_COUNT || 0) < (min.LEAD_COUNT || Number.POSITIVE_INFINITY) ? agent : min,
    )
  }

  async assignLeadToAgent(leadId: string, agentId: string): Promise<boolean> {
    console.log(`Assigning lead ${leadId} to agent ${agentId}...`)
    try {
      const result = await this.request("crm.lead.update", "POST", {
        id: leadId,
        fields: {
          ASSIGNED_BY_ID: agentId,
        },
      })
      return !!result.result
    } catch (error) {
      console.error("Error assigning lead:", error)
      return false
    }
  }

  async getNewLeads(): Promise<Lead[]> {
    console.log("Checking for new leads...")
    try {
      const result = await this.request("crm.lead.list", "GET", {
        filter: {
          STATUS_ID: "NEW",
          ASSIGNED_BY_ID: 0, // Unassigned leads
          ">DATE_CREATE": new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Only leads created in the last 5 minutes
        },
        select: ["ID", "TITLE", "ASSIGNED_BY_ID", "DATE_CREATE", "STATUS_ID"],
      })
      console.log(`Found ${result.result.length} new leads`)
      return result.result as Lead[]
    } catch (error) {
      console.error("Error getting new leads:", error)
      return []
    }
  }

  async assignNewLeadsToAgents(): Promise<{ leadId: string; agentId: string; agentName: string }[]> {
    const newLeads = await this.getNewLeads()
    let agents = await this.getAgentsWithLeadCounts()
    const assignments: { leadId: string; agentId: string; agentName: string }[] = []

    for (const lead of newLeads) {
      const leastLoadedAgent = await this.findLeastLoadedAgent(agents)
      if (leastLoadedAgent) {
        const success = await this.assignLeadToAgent(lead.ID, leastLoadedAgent.ID)
        if (success) {
          assignments.push({
            leadId: lead.ID,
            agentId: leastLoadedAgent.ID,
            agentName: `${leastLoadedAgent.NAME} ${leastLoadedAgent.LAST_NAME}`,
          })
          leastLoadedAgent.LEAD_COUNT = (leastLoadedAgent.LEAD_COUNT || 0) + 1

          // Update the agents array with the new lead count
          agents = agents.map((agent) => (agent.ID === leastLoadedAgent.ID ? leastLoadedAgent : agent))
        }
      } else {
        console.log(`No available agent to assign lead ${lead.ID}`)
      }
    }

    return assignments
  }
}

export const bitrixApi = new BitrixAPI()


