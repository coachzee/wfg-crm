import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
        <div className="space-y-2">
          <div className="h-9 w-64 shimmer rounded-lg" />
          <div className="h-4 w-80 shimmer rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 shimmer rounded-md" />
          <div className="h-7 w-16 shimmer rounded-full" />
        </div>
      </div>

      {/* Key Metrics skeleton - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-3.5 w-24 shimmer rounded" />
                  <div className="h-8 w-16 shimmer rounded" />
                  <div className="h-3 w-32 shimmer rounded" />
                </div>
                <div className="h-10 w-10 shimmer rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Impact Metrics skeleton - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-3.5 w-28 shimmer rounded" />
                  <div className="h-9 w-24 shimmer rounded" />
                  <div className="h-3 w-36 shimmer rounded" />
                </div>
                <div className="h-10 w-10 shimmer rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Flow Chart skeleton */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-56 shimmer rounded" />
              <div className="h-3.5 w-72 shimmer rounded" />
            </div>
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-7 w-10 shimmer rounded-md" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full px-8 pt-8">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex gap-1 items-end">
                  <div
                    className="w-5 shimmer rounded-t"
                    style={{ height: `${20 + Math.sin(i * 0.8) * 30 + 20}%` }}
                  />
                  <div
                    className="w-5 shimmer rounded-t"
                    style={{ height: `${10 + Math.cos(i * 0.6) * 20 + 15}%` }}
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

      {/* Additional sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader>
              <div className="h-5 w-40 shimmer rounded" />
              <div className="h-3.5 w-56 shimmer rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-10 shimmer rounded" style={{ opacity: 1 - j * 0.2 }} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default DashboardSkeleton;
