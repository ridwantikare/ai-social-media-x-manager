import { useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useListZernioAccounts,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const settingsSchema = z.object({
  clientName: z.string().optional(),
  clientNiche: z.string().optional(),
  clientTone: z.string().optional(),
  defaultZernioAccountId: z.string().optional(),
  telegramEnabled: z.boolean(),
  autoGenerateEnabled: z.boolean(),
  generateInterval: z.coerce.number().min(1).max(1440),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSettings();
  const { data: zernioAccounts } = useListZernioAccounts();
  const updateMutation = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      clientName: "",
      clientNiche: "",
      clientTone: "",
      defaultZernioAccountId: undefined,
      telegramEnabled: true,
      autoGenerateEnabled: false,
      generateInterval: 60,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        clientName: settings.clientName ?? "",
        clientNiche: settings.clientNiche ?? "",
        clientTone: settings.clientTone ?? "",
        defaultZernioAccountId: settings.defaultZernioAccountId ?? undefined,
        telegramEnabled: settings.telegramEnabled,
        autoGenerateEnabled: settings.autoGenerateEnabled,
        generateInterval: settings.generateInterval,
      });
    }
  }, [settings, form]);

  function handleSave(values: z.infer<typeof settingsSchema>) {
    updateMutation.mutate(
      {
        data: {
          clientName: values.clientName || undefined,
          clientNiche: values.clientNiche || undefined,
          clientTone: values.clientTone || undefined,
          defaultZernioAccountId: values.defaultZernioAccountId || undefined,
          telegramEnabled: values.telegramEnabled,
          autoGenerateEnabled: values.autoGenerateEnabled,
          generateInterval: values.generateInterval,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Settings saved" });
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
        onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI behavior and integrations.</p>
        </div>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI behavior and integrations.</p>
        </div>
        <Button
          onClick={form.handleSubmit(handleSave)}
          disabled={updateMutation.isPending}
          className="gap-2"
          data-testid="button-save-settings"
        >
          <Save size={15} />
          Save Changes
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-6">

          {/* Client Profile */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Client Profile</CardTitle>
              <CardDescription>Used by Gemini to personalize generated content.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Inc." data-testid="input-client-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientNiche"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niche / Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SaaS, e-commerce, fintech" data-testid="input-client-niche" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientTone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone / Voice</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. professional, witty, bold" data-testid="input-client-tone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Zernio */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Zernio Account</CardTitle>
              <CardDescription>Default X account to post approved content to.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="defaultZernioAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Account</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-zernio-account">
                          <SelectValue placeholder="Select an account..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!zernioAccounts || zernioAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>No accounts connected</SelectItem>
                        ) : (
                          zernioAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              @{acc.username} ({acc.platform})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Connect accounts via your Zernio dashboard.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Telegram Notifications</CardTitle>
              <CardDescription>Route generated content to Telegram for approval before posting.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="telegramEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel className="text-sm">Enable Telegram Approval Flow</FormLabel>
                      <FormDescription className="text-xs">
                        New content will be sent to your Telegram bot for approval.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-telegram-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Auto Generate */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Auto Generation</CardTitle>
              <CardDescription>Automatically generate content on a schedule.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="autoGenerateEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel className="text-sm">Enable Auto Generation</FormLabel>
                      <FormDescription className="text-xs">
                        Periodically generate content from tracked keywords.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-generate"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="generateInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        data-testid="input-generate-interval"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">How often to auto-generate (1–1440 minutes).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
