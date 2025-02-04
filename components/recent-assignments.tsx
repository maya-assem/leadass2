import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getRecentAssignments } from "@/lib/db"
import { useEffect, useState } from "react"

export function RecentAssignments() {
  const [assignments, setAssignments] = useState([])

  useEffect(() => {
    function fetchAssignments() {
      const recentAssignments = getRecentAssignments(5)
      setAssignments(recentAssignments)
    }

    fetchAssignments()
    const interval = setInterval(fetchAssignments, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {assignment.agentName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{assignment.dealTitle}</p>
                <p className="text-sm text-muted-foreground">Assigned to {assignment.agentName}</p>
              </div>
              <div className="ml-auto font-medium">{new Date(assignment.assignedAt).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


