"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { get_application_state, update_application_task, create_application_task, delete_application_task, update_application_timeline } from "@/config/functions";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradCapAssistant } from "@/components/assistant/GradCapAssistant";
import useConversationStore from "@/stores/useConversationStore";
import { Loader2, ArrowLeft, Calendar, ListChecks, AlertCircle, BookOpen, CheckCircle2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/layouts/PageWrapper";

interface TimelineEvent {
  label: string;
  target_date: string;
}

interface TaskItem {
  id: string;
  application_id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
}

interface ApplicationData {
  id: string;
  recommendation_id: string;
  program_name?: string;
  institution_name?: string;
  degree_type?: string;
  timeline?: TimelineEvent[];
  planner_response_id?: string | null;
  created_at?: string;
  [key: string]: any;
}

export default function ApplicationPage() {
  const params = useParams();
  const applicationId = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isUpdatingTask, setIsUpdatingTask] = useState<string | null>(null);
  const [previousResponseId, setPreviousResponseIdState] = useState<string | null>(null);

  // Manual CRUD state for timeline
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [editableTimeline, setEditableTimeline] = useState<TimelineEvent[]>([]);
  const [newTimelineLabel, setNewTimelineLabel] = useState("");
  const [newTimelineDate, setNewTimelineDate] = useState("");
  const [loadingTimelineUpdate, setLoadingTimelineUpdate] = useState(false);

  // Manual CRUD state for checklist tasks
  const [editingTasks, setEditingTasks] = useState(false);
  const [editableTasks, setEditableTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [loadingTasksUpdate, setLoadingTasksUpdate] = useState(false);

  const sendUserMessage = useConversationStore((state) => state.sendUserMessage);
  const chatMessages = useConversationStore((state) => state.chatMessages);
  const setPreviousResponseId = useConversationStore((state) => state.setPreviousResponseId);
  const lastMessage = chatMessages[chatMessages.length - 1];

  // Ref to track processed tool call IDs so we don't fetch repeatedly
  const processedToolCallIds = useRef<Set<string>>(new Set());

  // Track processed tool call IDs to avoid duplicate fetches
  const processedToolCallsRef = useRef<Set<string>>(new Set());

  // Live-refresh when assistant completes relevant tool calls
  useEffect(() => {
    let shouldRefresh = false;
    chatMessages.forEach((item: any) => {
      if (item.type === 'tool_call' && item.status === 'completed' && item.id) {
        if (!processedToolCallsRef.current.has(item.id)) {
          processedToolCallsRef.current.add(item.id);
          if (
            item.name === 'update_application_task' ||
            item.name === 'create_application_task' ||
            item.name === 'delete_application_task' ||
            item.name === 'update_application_timeline'
          ) {
            shouldRefresh = true;
          }
        }
      }
    });

    if (shouldRefresh) {
      // Instead of forcing a full page re-render (which remounts all components and
      // causes the GradCapAssistant to lose its transient UI state while still
      // streaming), just re-fetch the latest application data silently. This keeps
      // the current React tree mounted and preserves the assistant session.
      fetchInitialState(true); // silent refresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages]);

  const fetchInitialState = React.useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await fetch(`/api/functions/get_application_state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId }),
      }).then((r) => r.json());

      if (!result.success) {
        setError(result.error || "Failed to load application data");
      } else {
        const app: ApplicationData = result.application;
        setApplication(app);
        const tl = Array.isArray(app.timeline) ? app.timeline : [];
        setTimeline(tl);
        setEditableTimeline(tl);
        const tasksWithAppId = (Array.isArray(result.tasks) ? result.tasks : []).map((task: any) => ({ ...task, application_id: applicationId }));
        setTasks(tasksWithAppId);
        setEditableTasks(tasksWithAppId);

        const plannerRespId: string | null = app?.planner_response_id || null;
        setPreviousResponseId(plannerRespId);
        setPreviousResponseIdState(plannerRespId);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applicationId, setPreviousResponseId]);

  useEffect(() => {
    fetchInitialState();
  }, [fetchInitialState]);

  useEffect(() => {
    if (isUpdatingTask && lastMessage?.type === 'tool_call' && lastMessage.status === 'completed' && lastMessage.name === 'update_application_task') {
      console.log(`Task update tool call completed for task ${isUpdatingTask}. Re-fetching state.`);
      fetchInitialState(true);
      setIsUpdatingTask(null);
    }
    if (isUpdatingTask && lastMessage?.type === 'tool_call' && lastMessage.status === 'failed' && lastMessage.name === 'update_application_task') {
      console.error(`Task update tool call failed for task ${isUpdatingTask}.`);
      setError(`Failed to update task status via assistant.`);
      setIsUpdatingTask(null);
    }
    if (isUpdatingTask && lastMessage?.type === 'message' && lastMessage.role === 'assistant') {
       console.log('Assistant provided final message after task update attempt.');
       if (!tasks.find(t => t.id === isUpdatingTask && t.status !== (tasks.find(ti => ti.id === isUpdatingTask)?.status))){
         fetchInitialState(true);
       }
       setIsUpdatingTask(null);
    }
  }, [lastMessage, isUpdatingTask, fetchInitialState, tasks]);

  // Effect after fetchInitialState is defined: refresh UI when assistant completes tool calls
  useEffect(() => {
    const relevantNames = [
      "update_application_task",
      "create_application_task",
      "delete_application_task",
      "update_application_timeline",
    ];

    const newCalls = chatMessages.filter(
      (item: any) =>
        item.type === "tool_call" &&
        item.status === "completed" &&
        item.name &&
        relevantNames.includes(item.name) &&
        !processedToolCallIds.current.has(item.id)
    ) as any[];

    if (newCalls.length > 0) {
      newCalls.forEach((call) => processedToolCallIds.current.add(call.id));
      fetchInitialState(true);
    }
  }, [chatMessages, fetchInitialState]);

  const handleToggleTask = async (task: TaskItem) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    setError(null);
    setIsUpdatingTask(task.id);

    try {
      console.log(`Updating task ${task.id} to status: ${newStatus}`);
      const result = await update_application_task({
        task_id: task.id,
        updates: { status: newStatus },
      });
      if (!result.success) {
        const message = result.error || "Failed to update task";
        console.error(message);
        setError(message);
      } else {
        setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      }
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err) || "Unknown error updating task";
      console.error("Error updating task:", errorMsg);
      setError(errorMsg);
      setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    } finally {
      setIsUpdatingTask(null);
    }
  };

  // Handlers for CRUD
  const handleToggleTimeline = async () => {
    if (editingTimeline) {
      setLoadingTimelineUpdate(true);
      try {
        await update_application_timeline({ application_id: applicationId, timeline: editableTimeline });
        await fetchInitialState(true);
        setTimeline(editableTimeline);
      } catch (err: any) { setError(err.message || String(err)); } finally { setLoadingTimelineUpdate(false); }
    } else {
      setEditableTimeline(timeline);
    }
    setEditingTimeline(!editingTimeline);
  };
  const handleToggleTasks = async () => {
    if (editingTasks) {
      setLoadingTasksUpdate(true);
      try {
        for (const task of editableTasks) {
          const orig = tasks.find((t) => t.id === task.id);
          const updates: any = {};
          if (orig) {
            if (task.title !== orig.title) updates.title = task.title;
            if (task.description !== orig.description) updates.description = task.description;
            if (task.due_date !== orig.due_date) updates.due_date = task.due_date;
          }
          if (Object.keys(updates).length) await update_application_task({ task_id: task.id, updates });
        }
        setTasks(editableTasks);
      } catch (err: any) { setError(err.message || String(err)); } finally { setLoadingTasksUpdate(false); }
    } else {
      setEditableTasks(tasks);
    }
    setEditingTasks(!editingTasks);
  };
  const handleAddTask = async () => {
    if (!newTaskTitle || !newTaskDueDate) return;
    setLoadingTasksUpdate(true);
    try {
      const res = await create_application_task({ application_id: applicationId, title: newTaskTitle, description: newTaskDescription, due_date: newTaskDueDate, sort_order: editableTasks.length });
      if (res.success && res.task) {
        setEditableTasks([...editableTasks, res.task]); setTasks([...tasks, res.task]);
        setNewTaskTitle(""); setNewTaskDescription(""); setNewTaskDueDate("");
      } else { throw new Error(res.error || "Failed to create task"); }
    } catch (err: any) { setError(err.message || String(err)); } finally { setLoadingTasksUpdate(false); }
  };
  const handleDeleteTask = async (taskId: string) => {
    setLoadingTasksUpdate(true);
    try {
      const res = await delete_application_task({ task_id: taskId });
      if (res.success) {
        const updated = editableTasks.filter((t) => t.id !== taskId);
        setEditableTasks(updated); setTasks(updated);
      } else { throw new Error(res.error || "Failed to delete task"); }
    } catch (err: any) { setError(err.message || String(err)); } finally { setLoadingTasksUpdate(false); }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-6 animate-pulse">
        <div className="flex items-center space-x-4 mb-2">
           <Skeleton className="h-10 w-10 rounded-md" /> 
           <Skeleton className="h-8 w-1/2" />
        </div>
         <Skeleton className="h-4 w-1/4 mb-6" />
         
         <Skeleton className="h-24 w-full rounded-lg" /> 

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
             <Skeleton className="h-48 w-full rounded-lg" />
             <Skeleton className="h-64 w-full rounded-lg" />
           </div>
           <div className="lg:col-span-1">
             <Skeleton className="h-96 w-full rounded-lg sticky top-24" />
           </div>
         </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Application</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!application) {
     return (
      <div className="p-4 max-w-3xl mx-auto">
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Application Not Found</AlertTitle>
          <AlertDescription>The requested application data could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const recId = application?.recommendation_id;
  const programName = application?.program_name || "Application";
  const institutionName = application?.institution_name || "Details unavailable";
  const degreeType = application?.degree_type;

  const completedTasks = tasks.filter(task => task.status === "done").length;
  const totalTasks = tasks.length;
  const checklistProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <PageWrapper requireAuth>
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-8">
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => router.back()}
             className="mb-4 flex items-center gap-2 group transition-all duration-200"
           >
             <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" /> 
             <span>Back to Applications</span>
           </Button>
           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
             <div>
               <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                 {programName}
               </h1>
               <p className="text-base text-muted-foreground">
                 {institutionName}
               </p>
             </div>
             {degreeType && (
               <Badge variant="secondary" className="text-sm md:text-base px-3 py-1 self-start md:self-center">
                 {degreeType}
               </Badge>
             )}
           </div>

        </div>

        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-100 dark:border-blue-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Checklist Progress</CardTitle>
             <ListChecks className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{completedTasks} / {totalTasks} Tasks</div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
               {checklistProgress}% completed
            </p>
            <Progress value={checklistProgress} className="h-2" aria-label={`${checklistProgress}% completed`} />
            {checklistProgress === 100 && (
              <div className="flex items-center text-green-600 text-xs mt-2 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> All tasks done!
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <div className="flex flex-row items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Timeline</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleToggleTimeline} disabled={loadingTimelineUpdate}>
                    {editingTimeline ? "Save" : "Edit"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {!editingTimeline ? (
                    <div className="relative pl-6 border-l-2 border-primary/20">
                      {timeline.map((evt, idx) => (
                        <div key={idx} className="mb-6 relative">
                          <div className="absolute -left-[1.4rem] top-1 w-5 h-5 rounded-full bg-primary ring-4 ring-white dark:ring-gray-900"></div>
                          <div className="ml-4">
                            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{evt.label}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Target: {evt.target_date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editableTimeline.map((evt, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Input value={evt.label} onChange={(e) => { const nt = [...editableTimeline]; nt[idx].label = e.target.value; setEditableTimeline(nt); }} placeholder="Label" />
                          <Input type="date" value={evt.target_date} onChange={(e) => { const nt = [...editableTimeline]; nt[idx].target_date = e.target.value; setEditableTimeline(nt); }} />
                          <Button variant="ghost" size="icon" onClick={() => { const nt = editableTimeline.filter((_, i) => i !== idx); setEditableTimeline(nt); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2 mt-2">
                        <Input value={newTimelineLabel} onChange={(e) => setNewTimelineLabel(e.target.value)} placeholder="New label" />
                        <Input type="date" value={newTimelineDate} onChange={(e) => setNewTimelineDate(e.target.value)} />
                        <Button size="icon" onClick={() => { setEditableTimeline([...editableTimeline, { label: newTimelineLabel, target_date: newTimelineDate }]); setNewTimelineLabel(""); setNewTimelineDate(""); }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <div className="flex flex-row items-center space-x-3">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Checklist</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleToggleTasks} disabled={loadingTasksUpdate}>
                    {editingTasks ? "Save" : "Edit"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {!editingTasks ? (
                    <ul role="list" className="space-y-4">
                      {tasks.map((task) => (
                        <li key={task.id} className="relative group">
                          <div className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition border border-transparent group-hover:border-primary/20 group-hover:bg-primary/5 dark:group-hover:bg-primary/10">
                            <label className="flex-shrink-0 mt-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={task.status === 'done'}
                                onChange={() => handleToggleTask(task)}
                                disabled={isUpdatingTask === task.id}
                                aria-checked={task.status === 'done'}
                                className="h-5 w-5 accent-primary disabled:opacity-50 cursor-pointer"
                              />
                            </label>
                            <div className={cn("flex-grow", isUpdatingTask === task.id ? 'opacity-50' : '')}>
                              <p className={cn("font-medium text-gray-900 dark:text-gray-100", task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</p>
                              {task.description && <p className={cn("text-sm text-gray-600 dark:text-gray-400", task.status === 'done' && 'line-through')}>{task.description}</p>}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due: {task.due_date}</p>
                            </div>
                            {isUpdatingTask === task.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-lg">
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-4">
                      {editableTasks.map((task, idx) => (
                        <div key={task.id} className="flex items-center space-x-2">
                          <Input value={task.title} onChange={(e) => { const nt = [...editableTasks]; nt[idx].title = e.target.value; setEditableTasks(nt); }} />
                          <Input value={task.description} onChange={(e) => { const nt = [...editableTasks]; nt[idx].description = e.target.value; setEditableTasks(nt); }} />
                          <Input type="date" value={task.due_date} onChange={(e) => { const nt = [...editableTasks]; nt[idx].due_date = e.target.value; setEditableTasks(nt); }} />
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2 mt-2">
                        <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="New task title" />
                        <Input value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Description" />
                        <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
                        <Button size="icon" onClick={handleAddTask}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <Card className="sticky top-24 shadow-sm border">
                <CardHeader className="bg-muted/30 dark:bg-muted/40 border-b">
                  <CardTitle className="text-base">Need Help?</CardTitle>
                  <CardDescription>Ask Vista about your <span className="font-medium text-foreground">{programName}</span> application</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <GradCapAssistant
                    contextMessage={`The user is currently viewing their application with ID: ${applicationId} for the program ${programName}. When they ask questions or request actions related to this application (like checking status, creating tasks, deleting tasks, editing timeline events), use the application ID (${applicationId}) with the available tools ('get_application_state', 'update_application_task', 'create_application_task', 'delete_application_task', 'update_application_timeline'). Always refer to the timeline and checklist for this specific application.`}
                    previousResponseId={previousResponseId || undefined}
                    placeholder={`Ask about ${programName}...`}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
} 