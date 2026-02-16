import { memo, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subMonths, startOfYear, subYears, startOfMonth, endOfMonth } from "date-fns";
import type { DateRange as DayPickerDateRange } from "react-day-picker";

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
  const [activePreset, setActivePreset] = useState<DatePreset | "CUSTOM">("ALL");
  const [customRange, setCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetClick = useCallback((preset: DatePreset) => {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    setCustomRange(range);
    onRangeChange(range);
  }, [onRangeChange]);

  const handleCalendarSelect = useCallback((range: DayPickerDateRange | undefined) => {
    if (!range) return;
    
    const newRange: DateRange = {
      from: range.from,
      to: range.to,
    };
    setCustomRange(newRange);
    setActivePreset("CUSTOM");

    // Only apply the filter when both dates are selected
    if (range.from && range.to) {
      onRangeChange(newRange);
      // Close popover after both dates selected
      setTimeout(() => setIsCustomOpen(false), 300);
    }
  }, [onRangeChange]);

  const handleClearCustom = useCallback(() => {
    setCustomRange({ from: undefined, to: undefined });
    setActivePreset("ALL");
    onRangeChange({ from: undefined, to: undefined });
    setIsCustomOpen(false);
  }, [onRangeChange]);

  const customLabel = useMemo(() => {
    if (customRange.from && customRange.to) {
      return `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`;
    }
    if (customRange.from) {
      return `${format(customRange.from, "MMM d, yyyy")} – ...`;
    }
    return null;
  }, [customRange]);

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
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
            variant={activePreset === "CUSTOM" ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2.5 text-xs font-medium gap-1 transition-all ${
              activePreset === "CUSTOM"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {customLabel || "Custom"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Select Date Range</p>
              {customRange.from && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClearCustom}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {customRange.from && !customRange.to && (
              <p className="text-xs text-muted-foreground mt-1">
                Now select the end date
              </p>
            )}
            {customRange.from && customRange.to && (
              <p className="text-xs text-emerald-600 mt-1">
                {format(customRange.from, "MMM d, yyyy")} – {format(customRange.to, "MMM d, yyyy")}
              </p>
            )}
          </div>
          <CalendarComponent
            mode="range"
            selected={customRange.from ? { from: customRange.from, to: customRange.to } : undefined}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            defaultMonth={subMonths(new Date(), 1)}
          />
          <div className="p-3 border-t flex justify-between items-center">
            <div className="flex gap-1.5">
              {(["3M", "6M", "1Y"] as DatePreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    handlePresetClick(preset);
                    setIsCustomOpen(false);
                  }}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-6 px-3 text-xs"
              disabled={!customRange.from || !customRange.to}
              onClick={() => {
                if (customRange.from && customRange.to) {
                  onRangeChange(customRange);
                  setIsCustomOpen(false);
                }
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
