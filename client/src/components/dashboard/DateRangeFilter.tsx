import { memo, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subMonths, startOfYear, subYears } from "date-fns";

export type DatePreset = "3M" | "6M" | "YTD" | "1Y" | "ALL";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeFilterProps {
  onRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
}

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "YTD", value: "YTD" },
  { label: "1Y", value: "1Y" },
  { label: "All", value: "ALL" },
];

function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "3M":
      return { from: subMonths(now, 3), to: now };
    case "6M":
      return { from: subMonths(now, 6), to: now };
    case "YTD":
      return { from: startOfYear(now), to: now };
    case "1Y":
      return { from: subYears(now, 1), to: now };
    case "ALL":
      return { from: undefined, to: undefined };
  }
}

export const DateRangeFilter = memo(function DateRangeFilter({
  onRangeChange,
  className = "",
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>("ALL");
  const [customRange, setCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    setCustomRange(range);
    onRangeChange(range);
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (!customRange.from || (customRange.from && customRange.to)) {
      // Start new selection
      setCustomRange({ from: date, to: undefined });
      setActivePreset("ALL"); // Clear preset
    } else {
      // Complete selection
      const newRange = date && date < customRange.from
        ? { from: date, to: customRange.from }
        : { from: customRange.from, to: date };
      setCustomRange(newRange);
      onRangeChange(newRange);
      setIsCustomOpen(false);
    }
  };

  const displayLabel = useMemo(() => {
    if (activePreset !== "ALL") {
      return PRESETS.find(p => p.value === activePreset)?.label;
    }
    if (customRange.from && customRange.to) {
      return `${format(customRange.from, "MMM d")} - ${format(customRange.to, "MMM d, yyyy")}`;
    }
    return "All Time";
  }, [activePreset, customRange]);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          variant={activePreset === preset.value ? "default" : "ghost"}
          size="sm"
          className={`h-7 px-2.5 text-xs font-medium transition-all ${
            activePreset === preset.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handlePresetClick(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
          >
            <Calendar className="h-3 w-3" />
            Custom
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={customRange.from}
            onSelect={handleCustomDateSelect}
            initialFocus
            numberOfMonths={2}
          />
          {customRange.from && !customRange.to && (
            <div className="px-4 pb-3 text-xs text-muted-foreground text-center">
              Select end date
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
});
