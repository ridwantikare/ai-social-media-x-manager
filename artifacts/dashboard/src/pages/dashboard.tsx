import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAnalyticsOverview, useListContent } from "@workspace/api-client-react";
import { Activity, CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardOverview() {
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsOverview();
  const { data: recentContent, isLoading: contentLoading } = useListContent({
    status: "pending",
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">System telemetry and active generation queues.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Content"
          value={analytics?.total}
          icon={FileText}
          loading={analyticsLoading}
          testid="stat-total"
        />
        <StatCard
          title="Pending"
          value={analytics?.pending}
          icon={Clock}
          loading={analyticsLoading}
          testid="stat-pending"
          color="text-yellow-500"
        />
        <StatCard
          title="Approved"
          value={analytics?.approved}
          icon={CheckCircle}
          loading={analyticsLoading}
          testid="stat-approved"
          color="text-green-500"
        />
        <StatCard
          title="Rejected"
          value={analytics?.rejected}
          icon={XCircle}
          loading={analyticsLoading}
          testid="stat-rejected"
          color="text-red-500"
        />
        <StatCard
          title="Posted"
          value={analytics?.posted}
          icon={Activity}
          loading={analyticsLoading}
          testid="stat-posted"
          color="text-primary"
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent Pending Content</h2>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-0">
            {contentLoading ? (
              <div className="flex flex-col gap-4 p-6">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentContent && recentContent.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentContent.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 p-6 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary uppercase">
                        {item.type}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{item.topic}</span>
                    </div>
                    <p className="text-sm">{item.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                No pending content in queue.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  testid,
  color = "text-muted-foreground",
}: {
  title: string;
  value?: number;
  icon: any;
  loading: boolean;
  testid: string;
  color?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/50" data-testid={testid}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon size={16} className={color} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold font-mono">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
