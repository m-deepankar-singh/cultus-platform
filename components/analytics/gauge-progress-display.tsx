import { Gauge } from "@/components/ui/gauge";

interface GaugeProgressProps {
  percentComplete: number;
  size?: number;
  showLabel?: boolean;
  variant?: "success" | "danger" | "warning" | "info";
  label?: string;
}

/**
 * A circular gauge component for displaying progress or scores
 * 
 * @param percentComplete - The percentage value to display (0-100)
 * @param size - Size of the gauge in pixels
 * @param showLabel - Whether to show a text label below the gauge
 * @param variant - Color variant for the gauge
 * @param label - Optional label text to display below the gauge
 */
export function GaugeProgress({
  percentComplete,
  size = 120,
  showLabel = true,
  variant = "info",
  label = "Progress",
}: GaugeProgressProps) {
  const roundedPercent = Math.round(percentComplete);
  
  // Determine color based on progress value if no variant specified
  const determineVariant = () => {
    if (variant) return variant;
    
    if (roundedPercent < 25) return "danger";
    if (roundedPercent < 50) return "warning";
    if (roundedPercent < 75) return "info";
    return "success";
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <Gauge 
        value={roundedPercent} 
        size={size} 
        primary={determineVariant()}
        strokeWidth={8}
        className={{
          textClassName: "text-2xl"
        }}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground font-medium">
          {label}
        </span>
      )}
    </div>
  );
}

interface ScoreGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

/**
 * A specialized gauge for displaying assessment scores with color coding
 * 
 * @param score - The score value to display (0-100)
 * @param size - Size of the gauge in pixels
 * @param showLabel - Whether to show a text label below the gauge
 */
export function ScoreGauge({
  score,
  size = 120,
  showLabel = true,
}: ScoreGaugeProps) {
  // Determine color based on score value
  const determineVariant = () => {
    if (score < 50) return "danger";
    if (score < 70) return "warning";
    if (score < 85) return "info";
    return "success";
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <Gauge 
        value={score} 
        size={size} 
        primary={determineVariant()}
        strokeWidth={8}
        className={{
          textClassName: "text-2xl"
        }}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground font-medium">
          Score
        </span>
      )}
    </div>
  );
}

interface CompletionGaugeProps {
  completed: number;
  total: number;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

/**
 * A gauge that displays completion as a ratio (e.g., 7/10 modules completed)
 * 
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @param size - Size of the gauge in pixels
 * @param showLabel - Whether to show a text label below the gauge
 * @param label - Optional label text to display below the gauge
 */
export function CompletionGauge({
  completed,
  total,
  size = 120,
  showLabel = true,
  label = "Completed",
}: CompletionGaugeProps) {
  const percentComplete = total > 0 ? (completed / total) * 100 : 0;
  const roundedPercent = Math.round(percentComplete);
  
  // Determine color based on completion percentage
  const determineVariant = () => {
    if (percentComplete < 25) return "danger";
    if (percentComplete < 50) return "warning";
    if (percentComplete < 75) return "info";
    return "success";
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <Gauge 
        value={roundedPercent} 
        size={size} 
        primary={determineVariant()}
        strokeWidth={8}
        showValue={false}
        className={{
          textClassName: "text-xl"
        }}
      />
      <div className="text-center">
        <div className="text-xl font-semibold">{completed}/{total}</div>
        {showLabel && (
          <span className="text-sm text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
} 