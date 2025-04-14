"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Stanford",
    users: 450,
    products: 8,
  },
  {
    name: "Acme Corp",
    users: 320,
    products: 5,
  },
  {
    name: "Dept of Ed",
    users: 280,
    products: 4,
  },
  {
    name: "MIT",
    users: 390,
    products: 7,
  },
  {
    name: "TechCorp",
    users: 180,
    products: 3,
  },
]

export function ClientUsage() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Bar dataKey="users" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Active Users" />
        <Bar dataKey="products" fill="#10b981" radius={[4, 4, 0, 0]} name="Products" />
      </BarChart>
    </ResponsiveContainer>
  )
}
