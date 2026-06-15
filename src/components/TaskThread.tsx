import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Gift, Clock, Briefcase, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { PaymentQRUpload } from "@/components/PaymentQRUpload";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import supabase from "@/integrations/supabase/client"; // Fallback to your configured path if different

// Define structural representation for requests taken by the user
type AssignedTask = {
  id: string;
  title: string;
  description: string | null;
  locationLabel: string;
  reward: string | null;
  type: string;
  userId: string; // The creator/requester of the task
  takenBy: string | null;
  createdAt: number;
  completedAt: number | null;
  takerCompletedAt: number | null;
  feeSettledAt: number | null;
};

export const Route = createFileRoute("/my-tasks")({
  head: () => ({
    meta: [
      { title: "My accepted tasks — PLAN T" },
      { name: "description", content: "Track and update tasks you are performing for others." },
    ],
  }),
  component: MyTasksPage,
});

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<AssignedTask[] | null>(null);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchMyTasks = async (userId: string) => {
    try {
      // Fetching records from your local storage/database schema where user is the worker
      const { data, error } = await supabase
        .from("help_requests") // Assumes your master schema name, replace if using standard API helpers
        .select("*")
        .eq("takenBy", userId)
        .order("createdAt", { ascending: false });

      if (error) throw error;
      setTasks((data || []) as AssignedTask[]);
    } catch (err) {
      toast.error("Failed to sync your accepted tasks");
      setTasks([]);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMyTasks(user.id);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleMarkTakerDone = async (taskId: string) => {
    setUpdatingTaskId(taskId);
    try {
      const { data, error } = await supabase
        .from("help_requests")
        .update({ 
          takerCompletedAt: Date.now() 
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) =>
        prev ? prev.map((t) => (t.id === taskId ? { ...t, takerCompletedAt: data.takerCompletedAt } : t)) : prev
      );
      toast.success("Task execution submitted! Awaiting owner confirmation.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update state");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const activeTasks = tasks?.filter((t) => !t.completedAt) || [];
  const completedTasks = tasks?.filter((t) => !!t.completedAt) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Badge variant="secondary" className="rounded-full mb-3">Worker Dashboard</Badge>
          <h1 className="text-4xl font-bold tracking-tight">Tasks you accepted</h1>
          <p className="text-muted-foreground mt-2">
            Manage fulfillment, submit proof collections, and communicate with requesters.
          </p>
        </div>

        {tasks === null ? (
          <p className="text-muted-foreground">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <Card className="p-12 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Briefcase className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">No tasks assigned yet</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              You haven't won or claimed any open listings from the bulletin board.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/">Browse Open Requests</Link>
            </Button>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active" className="relative">
                Active Shifts
                {activeTasks.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                    {activeTasks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Archive History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active work items on your plate right now.</p>
              ) : (
                activeTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={user.id}
                    isChatOpen={activeChatTaskId === task.id}
                    onToggleChat={() => setActiveChatTaskId(activeChatTaskId === task.id ? null : task.id)}
                    onMarkDone={handleMarkTakerDone}
                    isUpdating={updatingTaskId === task.id}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No completed tasks history discovered.</p>
              ) : (
                completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={user.id}
                    isChatOpen={activeChatTaskId === task.id}
                    onToggleChat={() => setActiveChatTaskId(activeChatTaskId === task.id ? null : task.id)}
                    onMarkDone={handleMarkTakerDone}
                    isUpdating={false}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

// Internal reusable card layout context for clean architecture
function TaskCard({
  task,
  currentUserId,
  isChatOpen,
  onToggleChat,
  onMarkDone,
  isUpdating,
}: {
  task: AssignedTask;
  currentUserId: string;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onMarkDone: (id: string) => void;
  isUpdating: boolean;
}) {
  const isTakerDone = !!task.takerCompletedAt;
  const isOwnerConfirmed = !!task.completedAt;

  return (
    <Card className="p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="rounded-full text-xs capitalized">
              {task.type}
            </Badge>
            
            {!isTakerDone && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 rounded-full text-xs">
                In Progress
              </Badge>
            )}

            {isTakerDone && !isOwnerConfirmed && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 rounded-full text-xs gap-1">
                <Clock className="h-3 w-3" /> Sent to confirmation
              </Badge>
            )}

            {isOwnerConfirmed && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 rounded-full text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> Fully Confirmed
              </Badge>
            )}

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> accepted {timeAgo(task.createdAt)}
            </span>
          </div>

          <Link
            to="/request/$id"
            params={{ id: task.id }}
            className="font-semibold text-lg leading-tight hover:underline block truncate"
          >
            {task.title}
          </Link>
          
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-accent" />
              {task.locationLabel}
            </span>
            {task.reward && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Gift className="h-3 w-3 text-accent" />
                {task.reward}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2 justify-start">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/request/$id" params={{ id: task.id }}>View Detail</Link>
          </Button>

          <Button
            size="sm"
            variant={isChatOpen ? "secondary" : "outline"}
            className="rounded-full gap-1"
            onClick={onToggleChat}
          >
            <MessageSquare className="h-4 w-4" />
            {isChatOpen ? "Close Chat" : "Chat"}
          </Button>

          {!isTakerDone && (
            <Button
              size="sm"
              className="rounded-full"
              disabled={isUpdating}
              onClick={() => onMarkDone(task.id)}
            >
              Mark Done
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Real-time Thread view */}
      {isChatOpen && (
        <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <TaskThread
            requestId={task.id}
            currentUserId={currentUserId}
            requestOwnerId={task.userId} // The customer's ID
          />
        </div>
      )}

      {/* Payment handling components exposed for helpers */}
      {isTakerDone && (
        <div className="mt-4 pt-4 border-t border-muted-foreground/20">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            Ensure your payout instructions/QR codes are attached below to secure quick settlement.
          </p>
          <PaymentQRUpload
            requestId={task.id}
            takerId={currentUserId}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </Card>
  );
}
