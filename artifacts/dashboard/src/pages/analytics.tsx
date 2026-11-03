import {
  useGetAnalyticsOverview,
  useListPostedContent,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle, Clock, FileText, XCircle, ExternalLink } from "lucide-react";

export default function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useGetAnalyticsOverview();
  const { data: posted, isLoading: postedLoading } = useListPostedContent();

  const stats = [
    { label: "Total Generated", value: overview?.total, icon: FileText, color: "text-muted-foreground" },
    { label: "Pending Review", value: overview?.pending, icon: Clock, color: "text-yellow-400" },
    { label: "Approved", value: overview?.approved, icon: CheckCircle, color: "text-green-400" },
    { label: "Rejected", value: overview?.rejected, icon: XCircle, color: "text-red-400" },
    { label: "Posted Live", value: overview?.posted, icon: Activity, color: "text-primary" },
    { label: "Keywords", value: overview?.keywords, icon: FileText, color: "text-muted-foreground" },
  ];

  const approvalRate =
    overview && overview.total > 0
      ? Math.round(((overview.approved + overview.posted) / overview.total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Content performance and publishing history.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card/50" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon size={14} className={s.color} />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {overviewLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <div className="text-2xl font-bold font-mono">{s.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Approval Rate</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-2xl font-bold text-primary">{approvalRate}%</span>
                <span className="text-xs text-muted-foreground">of all content approved or posted</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${approvalRate}%` }}
                  data-testid="progress-approval-rate"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Posted Content</h2>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-0">
            {postedLoading ? (
              <div className="flex flex-col gap-4 p-6">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : !posted || posted.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <Activity size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No posted content yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {posted.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`row-posted-${item.id}`}
                    className="flex flex-col gap-2 p-5 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary uppercase">
                          {item.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.topic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                        {item.platformPostUrl && (
                          <a
                            href={item.platformPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                            data-testid={`link-posted-${item.id}`}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
