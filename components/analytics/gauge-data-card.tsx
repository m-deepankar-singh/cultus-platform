import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "@/components/ui/gauge";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GaugeDataCardProps {
  title: string;
  value: number;
  description?: string;
  icon?: ReactNode;
  showValue?: boolean;
  size?: number;
  variant?: "success" | "danger" | "warning" | "info" | string | { [key: number]: string };
  className?: string;
  gaugeClassName?: string | {
    svgClassName?: string;
    primaryClassName?: string;
    secondaryClassName?: string;
    textClassName?: string;
  };
}

/**
 * A card component that displays data with a gauge visualization
 * 
 * @param title - The title of the card
 * @param value - The numeric value to display (0-100)
 * @param description - Optional description text
 * @param icon - Optional icon to display in the header
 * @param showValue - Whether to show the numeric value inside the gauge
 * @param size - Size of the gauge in pixels
 * @param variant - Color variant for the gauge
 * @param className - Additional class name for the card
 * @param gaugeClassName - Class names for different parts of the gauge
 */
export function GaugeDataCard({
  title,
  value,
  description,
  icon,
  showValue = true,
  size = 100,
  variant = "info",
  className,
  gaugeClassName,
}: GaugeDataCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-2">
        <Gauge
          value={value}
          size={size}
          primary={variant}
          showValue={showValue}
          className={gaugeClassName}
          strokeWidth={8}
        />
        {description && (
          <CardDescription className="mt-4 text-xs text-center">{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
}

interface CompletionDataCardProps {
  title: string;
  completed: number;
  total: number;
  description?: string;
  icon?: ReactNode;
  size?: number;
  className?: string;
}

/**
 * A card component that displays completion data with a gauge visualization
 * 
 * @param title - The title of the card
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @param description - Optional description text
 * @param icon - Optional icon to display in the header
 * @param size - Size of the gauge in pixels
 * @param className - Additional class name for the card
 */
export function CompletionDataCard({
  title,
  completed,
  total,
  description,
  icon,
  size = 100,
  className,
}: CompletionDataCardProps) {
  const percentComplete = total > 0 ? (completed / total) * 100 : 0;
  
  // Determine color based on completion percentage
  const determineVariant = () => {
    if (percentComplete < 25) return "danger";
    if (percentComplete < 50) return "warning";
    if (percentComplete < 75) return "info";
    return "success";
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-2">
        <Gauge
          value={percentComplete}
          size={size}
          primary={determineVariant()}
          showValue={false}
          strokeWidth={8}
        />
        <div className="mt-2 text-lg font-bold">
          {completed}/{total}
        </div>
        {description && (
          <CardDescription className="mt-2 text-xs text-center">{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
} 