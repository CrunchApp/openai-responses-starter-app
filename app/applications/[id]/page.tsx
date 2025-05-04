"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { get_application_state, update_application_task } from "@/config/functions";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradCapAssistant } from "@/components/assistant/GradCapAssistant";
import useConversationStore from "@/stores/useConversationStore";
import { Loader2, ArrowLeft, Calendar, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

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

export default function ApplicationPage() {
  const params = useParams();
  const applicationId = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        const app = result.application;
        setTimeline(Array.isArray(app.timeline) ? app.timeline : []);
        const tasksWithAppId = (Array.isArray(result.tasks) ? result.tasks : []).map((task: any) => ({ ...task, application_id: applicationId }));
        setTasks(tasksWithAppId);

        // Store planner_response_id in conversation store and local state
        const plannerRespId: string | null = app?.planner_response_id || null;
        setPreviousResponseId(plannerRespId);
        setPreviousResponseIdState(plannerRespId);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

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
      }
      // Refresh the application state to reflect changes
      await fetchInitialState();
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err) || "Unknown error updating task";
      console.error("Error updating task:", errorMsg);
      setError(errorMsg);
    } finally {
      setIsUpdatingTask(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading application...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  const completedTasks = tasks.filter(task => task.status === "done").length;
  const totalTasks = tasks.length;
  const checklistProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Page Header */}
      <div className="mb-6 flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Application Progress</h1>
      </div>

      {/* Checklist Progress Card */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Checklist Progress</CardTitle>
            <CardDescription>{completedTasks}/{totalTasks} tasks completed</CardDescription>
          </div>
          <div className="w-1/2">
            <Progress value={checklistProgress} className="h-4" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline and Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card>
              <CardHeader className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 ml-2.5"></div>
                  {timeline.map((evt, idx) => (
                    <div key={idx} className="mb-6 relative">
                      <div className="absolute left-0 w-5 h-5 rounded-full bg-primary -ml-2.5"></div>
                      <div className="ml-6">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{evt.label}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{evt.target_date}</p>
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && <p className="text-gray-500 dark:text-gray-400">No timeline data available.</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Checklist Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card>
              <CardHeader className="flex items-center space-x-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ul role="list" className="space-y-4">
                  {tasks.map((task) => (
                    <li key={task.id} className="relative">
                      <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-700">
                        <label className="flex items-center space-x-3 w-full cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.status === 'done'}
                            onChange={() => handleToggleTask(task)}
                            disabled={isUpdatingTask === task.id}
                            aria-checked={task.status === 'done'}
                            className="h-5 w-5 accent-primary disabled:opacity-50"
                          />
                          <div className={cn(isUpdatingTask === task.id ? 'opacity-50' : '')}>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                            {task.description && <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>}
                            <p className="text-xs text-gray-500 dark:text-gray-400">Due: {task.due_date}</p>
                          </div>
                        </label>
                        {isUpdatingTask === task.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                  {tasks.length === 0 && <p className="text-gray-500 dark:text-gray-400">No tasks found for this application.</p>}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Assistant Panel */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>Ask Vista about your application</CardDescription>
              </CardHeader>
              <CardContent>
                <GradCapAssistant
                  contextMessage={`The user is currently viewing their application with ID: ${applicationId}. When they ask questions or request actions related to this application (like checking status, updating tasks, asking about deadlines), use the application ID (${applicationId}) with the available tools ('get_application_state', 'update_application_task'). Always refer to the timeline and checklist for this specific application.`}
                  previousResponseId={previousResponseId || undefined}
                  placeholder="Ask Vista about this application..."
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 