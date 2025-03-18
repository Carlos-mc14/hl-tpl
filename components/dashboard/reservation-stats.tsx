import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ReservationStats() {
  // In a real app, this data would come from an API or database
  const stats = [
    {
      title: "Total Reservations",
      value: "254",
      description: "Current month",
    },
    {
      title: "Available Rooms",
      value: "12",
      description: "Out of 50 rooms",
    },
    {
      title: "Occupancy Rate",
      value: "76%",
      description: "Current month",
    },
    {
      title: "Revenue",
      value: "$24,532",
      description: "Current month",
    },
  ]

  return (
    <>
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

