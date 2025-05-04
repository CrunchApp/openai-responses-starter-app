"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { get_application_state, update_application_task } from "@/config/functions";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradCapAssistant } from "@/components/assistant/GradCapAssistant";
import useConversationStore from "@/stores/useConversationStore";
import { Loader2, ArrowLeft, Calendar, ListChecks, AlertCircle, BookOpen, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

  const sendUserMessage = useConversationStore((state) => state.sendUserMessage);
  const chatMessages = useConversationStore((state) => state.chatMessages);
  const setPreviousResponseId = useConversationStore((state) => state.setPreviousResponseId);
  const lastMessage = chatMessages[chatMessages.length - 1];

  const fetchInitialState = React.useCallback(async () => {
    setLoading(true);
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
        setTimeline(Array.isArray(app.timeline) ? app.timeline : []);
        const tasksWithAppId = (Array.isArray(result.tasks) ? result.tasks : []).map((task: any) => ({ ...task, application_id: applicationId }));
        setTasks(tasksWithAppId);

        const plannerRespId: string | null = app?.planner_response_id || null;
        setPreviousResponseId(plannerRespId);
        setPreviousResponseIdState(plannerRespId);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [applicationId, setPreviousResponseId]);

  useEffect(() => {
    fetchInitialState();
  }, [fetchInitialState]);

  useEffect(() => {
    if (isUpdatingTask && lastMessage?.type === 'tool_call' && lastMessage.status === 'completed' && lastMessage.name === 'update_application_task') {
      console.log(`Task update tool call completed for task ${isUpdatingTask}. Re-fetching state.`);
      fetchInitialState();
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
         fetchInitialState();
       }
       setIsUpdatingTask(null);
    }

  }, [lastMessage, isUpdatingTask, fetchInitialState, tasks]);

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
              <CardHeader className="flex flex-row items-center space-x-3">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length > 0 ? (
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
                   <p className="text-gray-500 dark:text-gray-400 pl-1">No timeline data available yet.</p>
                 )} 
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center space-x-3">
                <ListChecks className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
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
                  <p className="text-gray-500 dark:text-gray-400 pl-1">No checklist tasks available yet.</p>
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
                  contextMessage={`The user is currently viewing their application with ID: ${applicationId} for the program ${programName}. When they ask questions or request actions related to this application (like checking status, updating tasks, asking about deadlines), use the application ID (${applicationId}) with the available tools ('get_application_state', 'update_application_task'). Always refer to the timeline and checklist for this specific application.`}
                  previousResponseId={previousResponseId || undefined}
                  placeholder={`Ask about ${programName}...`}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 