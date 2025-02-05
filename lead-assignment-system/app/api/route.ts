import { NextResponse } from "next/server"
import { assignLeadToAgent, findLeastLoadedAgent, getClockedInAgents } from "@/lib/bitrix"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Handle new lead creation webhook
    if (body.event === "ONCRMDEALADD") {
      const dealId = body.data.FIELDS.ID
      const dealTitle = body.data.FIELDS.TITLE

      // Get clocked-in agents
      const agents = await getClockedInAgents()
      if (agents.length === 0) {
        return NextResponse.json({ error: "No agents available" }, { status: 400 })
      }

      // Find agent with least leads
      const leastLoadedAgent = await findLeastLoadedAgent(agents)
      if (!leastLoadedAgent) {
        return NextResponse.json({ error: "Could not determine least loaded agent" }, { status: 400 })
      }

      // Assign lead to agent
      const success = await assignLeadToAgent(
        dealId,
        dealTitle,
        leastLoadedAgent.ID,
        `${leastLoadedAgent.NAME} ${leastLoadedAgent.LAST_NAME}`,
      )
      if (!success) {
        return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        dealId,
        assignedTo: leastLoadedAgent.ID,
      })
    }

    return NextResponse.json({ error: "Unsupported webhook event" }, { status: 400 })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  // This is a test endpoint to manually trigger lead assignment
  const agents = await getClockedInAgents()
  if (agents.length === 0) {
    return NextResponse.json({ error: "No agents available" }, { status: 400 })
  }

  const leastLoadedAgent = await findLeastLoadedAgent(agents)
  if (!leastLoadedAgent) {
    return NextResponse.json({ error: "Could not determine least loaded agent" }, { status: 400 })
  }

  // For testing purposes, we'll create a dummy lead
  const dummyLead = {
    ID: "TEST_" + Date.now(),
    TITLE: "Test Lead",
  }

  const success = await assignLeadToAgent(
    dummyLead.ID,
    dummyLead.TITLE,
    leastLoadedAgent.ID,
    `${leastLoadedAgent.NAME} ${leastLoadedAgent.LAST_NAME}`,
  )
  if (!success) {
    return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    dealId: dummyLead.ID,
    assignedTo: leastLoadedAgent.ID,
  })
}
