import { useState } from "react";
import {
  useListContent,
  useGenerateContent,
  useGenerateTrendingContent,
  useApproveContent,
  useRejectContent,
  useDeleteContent,
  useUpdateContent,
  getListContentQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Trash2, Zap, Filter, RefreshCw, Pencil, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const generateSchema = z.object({
  type: z.enum(["tweet", "reply", "idea"]),
  topic: z.string().optional(),
  count: z.coerce.number().min(1).max(10).default(3),
});

const editSchema = z.object({
  content: z.string().min(1),
});

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "posted";
type TypeFilter = "all" | "tweet" | "reply" | "idea";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/15 text-green-400 border-green-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  posted: "bg-primary/15 text-primary border-primary/30",
};

export default function ContentQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const queryParams = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
  };

  const { data: items, isLoading } = useListContent(
    statusFilter !== "all" || typeFilter !== "all" ? queryParams : undefined
  );
  const generateMutation = useGenerateContent();
  const trendingMutation = useGenerateTrendingContent();
  const approveMutation = useApproveContent();
  const rejectMutation = useRejectContent();
  const deleteMutation = useDeleteContent();
  const updateMutation = useUpdateContent();

  const generateForm = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { type: "tweet", topic: "", count: 3 },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { content: "" },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListContentQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListContentQueryKey(queryParams) });
  }

  function handleGenerate(values: z.infer<typeof generateSchema>) {
    generateMutation.mutate(
      { data: { type: values.type, topic: values.topic || undefined, count: values.count } },
      {
        onSuccess: (items) => {
          toast({ title: `Generated ${items.length} item(s)`, description: "Sent to Telegram for approval." });
          setGenerateOpen(false);
          generateForm.reset();
          invalidate();
        },
        onError: () => toast({ title: "Generation failed", variant: "destructive" }),
      }
    );
  }

  function handleApprove(id: number) {
    approveMutation.mutate(
      { id, data: {} },
      {
        onSuccess: () => {
          toast({ title: "Approved and posted" });
          invalidate();
        },
        onError: () => toast({ title: "Approve failed", variant: "destructive" }),
      }
    );
  }

  function handleReject(id: number) {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Rejected" }); invalidate(); },
        onError: () => toast({ title: "Reject failed", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Deleted" }); invalidate(); },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  }

  function openEdit(id: number, content: string) {
    setEditId(id);
    setEditContent(content);
    editForm.setValue("content", content);
  }

  function handleEdit(values: z.infer<typeof editSchema>) {
    if (!editId) return;
    updateMutation.mutate(
      { id: editId, data: { content: values.content } },
      {
        onSuccess: () => {
          toast({ title: "Updated" });
          setEditId(null);
          invalidate();
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated content awaiting review.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => trendingMutation.mutate(undefined, {
              onSuccess: (items) => {
                toast({ title: `${items.length} trending tweet(s) generated`, description: "Sent to Telegram for approval." });
                invalidate();
              },
              onError: () => toast({ title: "Trending generation failed", variant: "destructive" }),
            })}
            disabled={trendingMutation.isPending}
            className="gap-2"
          >
            <TrendingUp size={16} />
            {trendingMutation.isPending ? "Fetching trends..." : "Trending"}
          </Button>
          <Button
            data-testid="button-generate"
            onClick={() => setGenerateOpen(true)}
            className="gap-2"
          >
            <Zap size={16} />
            Generate
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-36 text-sm" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="h-8 w-32 text-sm" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tweet">Tweet</SelectItem>
            <SelectItem value="reply">Reply</SelectItem>
            <SelectItem value="idea">Idea</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-4 p-6">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <Zap size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No content matches the current filter.</p>
              <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)} data-testid="button-generate-empty">
                Generate content
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <div
                  key={item.id}
                  data-testid={`card-content-${item.id}`}
                  className="flex flex-col gap-3 p-5 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary uppercase">
                        {item.type}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.topic}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[item.status] ?? ""}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => handleApprove(item.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-${item.id}`}
                          >
                            <CheckCircle size={14} />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleReject(item.id)}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-${item.id}`}
                          >
                            <XCircle size={14} />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(item.id, item.content)}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{item.content}</p>
                  {item.platformPostUrl && (
                    <a
                      href={item.platformPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                      data-testid={`link-post-${item.id}`}
                    >
                      View on X
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Content</DialogTitle>
          </DialogHeader>
          <Form {...generateForm}>
            <form onSubmit={generateForm.handleSubmit(handleGenerate)} className="flex flex-col gap-4">
              <FormField
                control={generateForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-generate-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tweet">Tweet</SelectItem>
                        <SelectItem value="reply">Reply</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generateForm.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic (optional — uses random keyword if empty)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AI automation" data-testid="input-topic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generateForm.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count (1–10)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} data-testid="input-count" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={generateMutation.isPending} data-testid="button-generate-submit" className="gap-2">
                  {generateMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Generate
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="flex flex-col gap-4">
              <FormField
                control={editForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea rows={5} data-testid="textarea-edit-content" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-edit-submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
