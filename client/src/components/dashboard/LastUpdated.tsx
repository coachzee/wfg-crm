import { memo, useState, useEffect } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LastUpdatedProps {
  /** UTC timestamp in milliseconds */
  timestamp: number | null | undefined;
  /** Label to show before the time */
  label?: string;
  /** Whether data is currently being refreshed */
  isRefreshing?: boolean;
}

export const LastUpdated = memo(function LastUpdated({
  timestamp,
  label = "Data last updated",
  isRefreshing = false,
}: LastUpdatedProps) {
  const [, setTick] = useState(0);

  // Re-render every 30 seconds to keep "X minutes ago" fresh
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (isRefreshing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
        <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span>Updating...</span>
      </div>
    );
  }

  if (!timestamp) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>No data yet</span>
      </div>
    );
  }

  const date = new Date(timestamp);
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });
  const absoluteTime = format(date, "MMM d, yyyy 'at' h:mm a");
  const isRecent = Date.now() - timestamp < 5 * 60 * 1000; // within 5 minutes

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 text-xs cursor-default transition-colors ${
            isRecent ? "text-emerald-600" : "text-muted-foreground"
          }`}>
            {isRecent ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            <span>{label} {relativeTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{absoluteTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
