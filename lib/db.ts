interface DealAssignment {
  id: string
  dealId: string
  dealTitle: string
  agentId: string
  agentName: string
  assignedAt: string
}

export function recordAssignment(dealId: string, dealTitle: string, agentId: string, agentName: string) {
  const assignments = getAssignments()
  const newAssignment: DealAssignment = {
    id: Date.now().toString(),
    dealId,
    dealTitle,
    agentId,
    agentName,
    assignedAt: new Date().toISOString(),
  }
  assignments.push(newAssignment)
  localStorage.setItem("dealAssignments", JSON.stringify(assignments))
}

export function getRecentAssignments(limit = 10): DealAssignment[] {
  const assignments = getAssignments()
  return assignments.slice(-limit).reverse()
}

function getAssignments(): DealAssignment[] {
  const storedAssignments = localStorage.getItem("dealAssignments")
  return storedAssignments ? JSON.parse(storedAssignments) : []
}


