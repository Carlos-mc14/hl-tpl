import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RecentActivityProps {
  className?: string
}

export function RecentActivity({ className }: RecentActivityProps) {
  // In a real app, this data would come from an API or database
  const activities = [
    {
      user: "John Doe",
      action: "made a reservation",
      time: "2 hours ago",
    },
    {
      user: "Jane Smith",
      action: "checked in",
      time: "3 hours ago",
    },
    {
      user: "Robert Johnson",
      action: "checked out",
      time: "5 hours ago",
    },
    {
      user: "Emily Davis",
      action: "cancelled reservation",
      time: "1 day ago",
    },
    {
      user: "Michael Wilson",
      action: "modified reservation",
      time: "1 day ago",
    },
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center">
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.user} <span className="text-muted-foreground">{activity.action}</span>
                </p>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

