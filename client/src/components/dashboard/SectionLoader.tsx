import { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SectionLoaderProps {
  /** Type of section being loaded */
  variant?: "chart" | "metrics" | "card" | "table";
  /** Number of items for metrics variant */
  count?: number;
  /** Custom height for the loader */
  height?: string;
}

export const SectionLoader = memo(function SectionLoader({
  variant = "card",
  count = 3,
  height,
}: SectionLoaderProps) {
  if (variant === "chart") {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 shimmer rounded" />
              <div className="h-3.5 w-64 shimmer rounded" />
            </div>
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-7 w-10 shimmer rounded-md" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`${height || "h-[300px]"} relative overflow-hidden`}>
            {/* Animated bar chart skeleton */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full px-8 pt-8">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex gap-1 items-end" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div
                    className="w-5 shimmer rounded-t"
                    style={{
                      height: `${20 + Math.random() * 60}%`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                  <div
                    className="w-5 shimmer rounded-t"
                    style={{
                      height: `${10 + Math.random() * 40}%`,
                      animationDelay: `${i * 0.15 + 0.05}s`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg shimmer h-20" />
            <div className="p-3 rounded-lg shimmer h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "metrics") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 stagger-children`}>
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-3.5 w-24 shimmer rounded" />
                  <div className="h-8 w-20 shimmer rounded" />
                  <div className="h-3 w-32 shimmer rounded" />
                </div>
                <div className="h-10 w-10 shimmer rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="h-5 w-40 shimmer rounded" />
          <div className="h-3.5 w-56 shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 shimmer rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 shimmer rounded" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card variant
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="h-5 w-40 shimmer rounded" />
        <div className="h-3.5 w-56 shimmer rounded" />
      </CardHeader>
      <CardContent>
        <div className={`${height || "h-32"} shimmer rounded-lg`} />
      </CardContent>
    </Card>
  );
});
