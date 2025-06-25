"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
  type: "bar" | "line" | "pie";
  data: any[];
  dataKey: string;
  categories?: string[];
  colors?: string[];
  xAxisDataKey?: string;
  height?: number;
  legend?: ReactNode;
}

const DEFAULT_COLORS = [
  "#0284c7", // blue-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
];

export function ChartCard({
  title,
  description,
  className,
  type,
  data,
  dataKey,
  categories = [],
  colors = DEFAULT_COLORS,
  xAxisDataKey = "name",
  height = 300,
  legend,
}: ChartCardProps) {
  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey={xAxisDataKey} 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <Bar 
                    key={category}
                    dataKey={category} 
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))
              ) : (
                <Bar 
                  dataKey={dataKey} 
                  fill={colors[0]}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey={xAxisDataKey} 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <Line
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={colors[0]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                dataKey={dataKey}
                label={({ name, percent }) => `${name}: ${(percent ? percent * 100 : 0).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
          {legend && <div className="flex items-center space-x-4">{legend}</div>}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {renderChart()}
      </CardContent>
    </Card>
  );
} 