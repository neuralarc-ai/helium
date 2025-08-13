import type React from "react"
import { Check, Clock, CheckCircle, AlertTriangle, ListTodo, X, Circle, CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractTaskListData, type Task, type Section } from "@/components/thread/tool-views/task-list/_utils"
import { getToolTitle } from "../utils"
import type { ToolViewProps } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from "@/components/ui/scroll-area"

const TaskItem: React.FC<{ task: Task; index: number }> = ({ task, index }) => {
  const isCompleted = task.status === "completed"
  const isCancelled = task.status === "cancelled"
  const isPending = !isCompleted && !isCancelled

  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      {/* Checkbox Status Indicator */}
      <div className="flex-shrink-0">
        {isCompleted && (
          <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        {isCancelled && (
          <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-500 flex items-center justify-center">
            <X className="h-3 w-3 text-white" />
          </div>
        )}
        {isPending && (
          <div className="w-4 h-4 rounded border-2 border-zinc-400 dark:border-zinc-600 bg-transparent" />
        )}
      </div>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-relaxed",
            isCompleted && "text-green-700 dark:text-green-300 line-through",
            isCancelled && "text-red-500 dark:text-red-400 line-through",
            isPending && "text-zinc-600 dark:text-zinc-300",
          )}
        >
          {task.content}
        </p>
      </div>
    </div>
  )
}

const SectionHeader: React.FC<{ section: Section }> = ({ section }) => {
  const totalTasks = section.tasks.length
  const completedTasks = section.tasks.filter((t) => t.status === "completed").length
  const allCompleted = completedTasks === totalTasks && totalTasks > 0

  return (
    <div className={cn(
      "flex items-center justify-between py-3 px-4 border-b transition-colors",
      allCompleted 
        ? "bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
        : "bg-zinc-50/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-700"
    )}>
      <h3 className={cn(
        "text-sm font-medium",
        allCompleted 
          ? "text-green-800 dark:text-green-300" 
          : "text-zinc-700 dark:text-zinc-300"
      )}>
        {section.title}
        {allCompleted && <span className="ml-2">✅</span>}
      </h3>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn(
          "text-xs h-5 px-2 py-0 font-normal",
          allCompleted 
            ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700" 
            : "bg-white dark:bg-zinc-800"
        )}>
          {completedTasks}/{totalTasks}
        </Badge>
        {allCompleted && (
          <Badge variant="outline" className="text-xs h-5 px-2 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700">
            <Check className="h-3 w-3" />
            Complete
          </Badge>
        )}
      </div>
    </div>
  )
}

const SectionView: React.FC<{ section: Section }> = ({ section }) => {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
      <SectionHeader section={section} />
      <div className="bg-card">
        {section.tasks.map((task, index) => (
          <TaskItem key={task.id} task={task} index={index} />
        ))}
        {section.tasks.length === 0 && (
          <div className="py-6 px-4 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">No tasks in this section</p>
          </div>
        )}
      </div>
    </div>
  )
}



export const TaskListToolView: React.FC<ToolViewProps> = ({
  name = 'task-list',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false
}) => {
  const taskData = extractTaskListData(assistantContent, toolContent)
  const toolTitle = getToolTitle(name)

  // Process task data
  const sections = taskData?.sections || []
  const allTasks = sections.flatMap((section) => section.tasks)
  const totalTasks = taskData?.total_tasks || 0
  // console.log("Tasks", taskData)
  const completedTasks = allTasks.filter((t) => t.status === "completed").length
  const hasData = taskData?.total_tasks && taskData?.total_tasks > 0

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-card">
      <CardHeader className={cn(
        "h-14 bg-gradient-to-br backdrop-blur-sm border-b p-2 px-4 space-y-2 transition-colors",
        completedTasks === totalTasks && totalTasks > 0
          ? "from-green-50/80 to-green-100/60 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800"
          : "from-zinc-50/80 to-zinc-100/60 dark:from-zinc-900/80 dark:to-zinc-800/60"
      )}>
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "relative p-2 rounded-xl border transition-colors",
              completedTasks === totalTasks && totalTasks > 0
                ? "bg-gradient-to-br from-green-500/30 to-green-600/20 border-green-500/30"
                : "bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20"
            )}>
              <ListTodo className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className={cn(
                "text-base font-medium transition-colors",
                completedTasks === totalTasks && totalTasks > 0
                  ? "text-green-800 dark:text-green-300"
                  : "text-zinc-900 dark:text-zinc-100"
              )}>
                {completedTasks === totalTasks && totalTasks > 0 ? "✅ " : ""}{toolTitle}
                {completedTasks === totalTasks && totalTasks > 0 ? " - COMPLETED" : ""}
              </CardTitle>
            </div>
          </div>

          {!isStreaming && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {completedTasks} / {totalTasks} tasks
              </Badge>
              <Badge
                variant="secondary"
                className={
                  isSuccess
                    ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                    : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300"
                }
              >
                {isSuccess ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {isSuccess ? 'Tasks loaded' : 'Failed to load'}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming && !hasData ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-green-100 to-green-50 shadow-inner dark:from-green-800/40 dark:to-green-900/60">
              <Clock className="h-10 w-10 text-green-500 dark:text-green-400 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              Loading Tasks
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Preparing your task list...
            </p>
          </div>
        ) : hasData ? (
          <ScrollArea className="h-full w-full">
            <div className="py-0">
              {sections.map((section) => <SectionView key={section.id} section={section} />)}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-zinc-100 to-zinc-50 shadow-inner dark:from-zinc-800/40 dark:to-zinc-900/60">
              <ListTodo className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              No Tasks Yet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your task list will appear here once created
            </p>
          </div>
        )}
      </CardContent>

      <div className={cn(
        "px-4 py-2 h-10 bg-gradient-to-r backdrop-blur-sm border-t flex justify-between items-center gap-4 transition-colors",
        completedTasks === totalTasks && totalTasks > 0
          ? "from-green-50/90 to-green-100/90 dark:from-green-900/90 dark:to-green-800/90 border-green-200 dark:border-green-800"
          : "from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/90 dark:to-zinc-800/90 border-zinc-200 dark:border-zinc-800"
      )}>
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && hasData && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-6 py-0.5">
                <ListTodo className="h-3 w-3" />
                {sections.length} sections
              </Badge>
              {completedTasks === totalTasks && totalTasks > 0 && (
                <Badge variant="outline" className="h-6 py-0.5 bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700">
                  <Check className="h-3 w-3" />
                  🎉 All complete!
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {toolTimestamp && !isStreaming
            ? new Date(toolTimestamp).toLocaleTimeString()
            : assistantTimestamp
              ? new Date(assistantTimestamp).toLocaleTimeString()
              : ''}
        </div>
      </div>
    </Card>
  )
}