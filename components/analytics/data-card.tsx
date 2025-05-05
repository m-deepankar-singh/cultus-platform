import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DataCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  className?: string;
}

export function DataCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: DataCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="mt-1 text-xs">{description}</CardDescription>
        )}
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span
              className={cn(
                "mr-1",
                trend.direction === "up" && "text-emerald-500",
                trend.direction === "down" && "text-rose-500"
              )}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "neutral" && "→"} {Math.abs(trend.value)}%
            </span>
            {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 