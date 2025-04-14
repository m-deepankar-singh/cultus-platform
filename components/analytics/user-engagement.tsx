"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Jan 1",
    users: 2500,
    activeUsers: 1800,
  },
  {
    name: "Jan 5",
    users: 3000,
    activeUsers: 2100,
  },
  {
    name: "Jan 10",

    users: 2800,
    activeUsers: 2000,
  },
  {
    name: "Jan 15",
    users: 3300,
    activeUsers: 2400,
  },
  {
    name: "Jan 20",
    users: 3900,
    activeUsers: 2900,
  },
  {
    name: "Jan 25",
    users: 3700,
    activeUsers: 2800,
  },
  {
    name: "Jan 30",
    users: 4000,
    activeUsers: 3100,
  },
]

export function UserEngagement() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Line type="monotone" dataKey="users" stroke="#0ea5e9" strokeWidth={2} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
