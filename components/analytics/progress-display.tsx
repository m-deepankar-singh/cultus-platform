import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CourseProgressProps {
  percentComplete: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function CourseProgress({
  percentComplete,
  size = "md",
  showLabel = true,
}: CourseProgressProps) {
  const roundedPercent = Math.round(percentComplete);
  
  const heightClass = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[size];
  
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{roundedPercent}%</span>
        </div>
      )}
      <Progress
        value={roundedPercent}
        className={heightClass}
        aria-label={`${roundedPercent}% course completed`}
      />
    </div>
  );
}

interface AssessmentStatusProps {
  status: "not_started" | "in_progress" | "completed" | "passed" | "failed";
  score?: number;
  showScore?: boolean;
  variant?: "badge" | "text";
}

export function AssessmentStatus({
  status,
  score,
  showScore = true,
  variant = "badge",
}: AssessmentStatusProps) {
  const statusMap = {
    not_started: { label: "Not Started", color: "secondary" },
    in_progress: { label: "In Progress", color: "warning" },
    completed: { label: "Completed", color: "default" },
    passed: { label: "Passed", color: "success" },
    failed: { label: "Failed", color: "destructive" },
  };
  
  const { label, color } = statusMap[status];
  
  if (variant === "badge") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={color as any}>{label}</Badge>
        {showScore && score !== undefined && (
          <span className="text-sm font-medium">
            {score}%
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium text-${color}`}>{label}</span>
      {showScore && score !== undefined && (
        <span className="text-sm">
          {score}%
        </span>
      )}
    </div>
  );
} 