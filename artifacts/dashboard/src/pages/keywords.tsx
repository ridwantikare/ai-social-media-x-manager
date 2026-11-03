import { useState } from "react";
import {
  useListKeywords,
  useCreateKeyword,
  useDeleteKeyword,
  getListKeywordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tags, Trash2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const keywordSchema = z.object({
  text: z.string().min(1, "Keyword is required").max(100),
});

export default function Keywords() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: keywords, isLoading } = useListKeywords();
  const createMutation = useCreateKeyword();
  const deleteMutation = useDeleteKeyword();

  const form = useForm<z.infer<typeof keywordSchema>>({
    resolver: zodResolver(keywordSchema),
    defaultValues: { text: "" },
  });

  function handleAdd(values: z.infer<typeof keywordSchema>) {
    createMutation.mutate(
      { data: { text: values.text.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Keyword added" });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
        },
        onError: () => toast({ title: "Failed to add keyword", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Keyword removed" });
          queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
        },
        onError: () => toast({ title: "Failed to remove keyword", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keywords</h1>
        <p className="text-muted-foreground text-sm mt-1">Topics the AI monitors and generates content around.</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAdd)} className="flex gap-3">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="e.g. AI automation, SaaS growth..."
                        data-testid="input-keyword"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-add-keyword"
                className="gap-2 h-10"
              >
                <Plus size={15} />
                Add
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !keywords || keywords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <Tags size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No keywords yet. Add topics above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  data-testid={`row-keyword-${kw.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    <span
                      className="text-sm font-medium font-mono"
                      data-testid={`text-keyword-${kw.id}`}
                    >
                      {kw.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(kw.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(kw.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-keyword-${kw.id}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {keywords && keywords.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {keywords.length} keyword{keywords.length !== 1 ? "s" : ""} tracked
        </p>
      )}
    </div>
  );
}
