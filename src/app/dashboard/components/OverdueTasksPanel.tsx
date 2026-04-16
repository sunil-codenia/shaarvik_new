'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import Link from 'next/link';

interface OverdueTask {
  id: string;
  title: string;
  clientName: string | null;
  assigneeName: string | null;
  dueDate: string;
  priority: string;
  daysOverdue: number;
}

const priorityConfig: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-muted-foreground',
};

export default function OverdueTasksPanel() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [tasks, setTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!companyId) return;
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date, clients(name), user_profiles!tasks_assigned_to_fkey(full_name)')
        .eq('company_id', companyId)
        .lt('due_date', today)
        .not('status', 'in', '("completed","cancelled")')
        .order('due_date', { ascending: true })
        .limit(6);

      setTasks((data || []).map((row: any) => {
        const dueDate = new Date(row.due_date);
        const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: row.id,
          title: row.title,
          clientName: row.clients?.name || null,
          assigneeName: row.user_profiles?.full_name || null,
          dueDate: row.due_date,
          priority: row.priority,
          daysOverdue,
        };
      }));
    } catch {}
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchTasks();
  }, [companyId, profileLoading, fetchTasks]);

  // Real-time subscription — auto-refresh on tasks changes
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('overdue_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchTasks]);

  const handleComplete = async (taskId: string, taskTitle: string) => {
    setCompleting(taskId);
    try {
      const supabase = createClient();
      await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {}
    setCompleting(null);
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl shadow-card flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <h3 className="text-[15px] font-600 text-red-700">Overdue Tasks</h3>
          {!loading && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-700">
              {tasks.length}
            </span>
          )}
        </div>
        <Link href="/tasks" className="flex items-center gap-1 text-xs font-500 text-red-600 hover:text-red-700 transition-colors">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {loading && (
        <ul className="flex-1 divide-y divide-red-200">
          {[...Array(3)].map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-5 h-5 rounded-full bg-red-200 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2"><div className="h-3.5 bg-red-200 rounded w-3/4" /><div className="h-3 bg-red-200 rounded w-1/2" /></div>
            </li>
          ))}
        </ul>
      )}

      {!loading && tasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-5 text-center">
          <CheckCircle2 size={32} className="text-green-400 mb-2" />
          <p className="text-sm font-600 text-green-700">No overdue tasks</p>
          <p className="text-xs text-muted-foreground mt-1">All tasks are on track</p>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <ul className="flex-1 divide-y divide-red-200 overflow-y-auto scrollbar-thin">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-start gap-3 px-5 py-3.5 hover:bg-red-100/50 transition-all group ${completing === task.id ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <button
                onClick={() => handleComplete(task.id, task.title)}
                className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-red-300 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center group/check"
                aria-label={`Mark task complete: ${task.title}`}
              >
                <CheckCircle2 size={12} className="text-transparent group-hover/check:text-green-500 transition-colors" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-500 text-red-800 leading-snug">{task.title}</p>
                {task.clientName && <p className="text-xs text-red-500 truncate mt-0.5">{task.clientName}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`text-[11px] font-600 ${priorityConfig[task.priority] || 'text-muted-foreground'}`}>
                    {task.daysOverdue}d overdue
                  </span>
                  {task.assigneeName && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User size={10} />{task.assigneeName}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-red-200 bg-red-100/40 rounded-b-xl">
        <p className="text-xs text-red-600">
          <span className="font-600">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span> need immediate attention
        </p>
      </div>
    </div>
  );
}