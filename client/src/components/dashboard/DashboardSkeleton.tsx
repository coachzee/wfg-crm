import { Card } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-4 w-72 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <div className="h-4 w-24 shimmer rounded" />
              <div className="h-8 w-16 shimmer rounded" />
              <div className="h-3 w-32 shimmer rounded" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <div className="h-[400px] shimmer rounded-lg" />
      </Card>
    </div>
  );
}

export default DashboardSkeleton;
