'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, CheckSquare, ChevronRight, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import debug from '@/lib/debug';
import { useCompanyId } from '@/hooks/useCompanyId';
import { fetchTasks as fetchTasksService, updateTaskStatus } from '@/lib/services';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  clientName: string | null;
  clientId: string | null;
  assigneeName: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-500' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high: { label: 'High', color: 'text-red-600' },
};

export default function TasksPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { companyId, loading: profileLoading, userId } = useCompanyId();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [completing, setCompleting] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      debug.authCheck('tasks', userId);
      const data = await fetchTasksService(companyId);
      setTasks(data.map((row: any) => ({
        id: row.id, title: row.title, description: row.description, status: row.status,
        priority: row.priority, dueDate: row.due_date, clientName: row.clients?.name || null,
        clientId: row.clients?.id || null, assigneeName: null,
        createdAt: row.created_at,
      })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load tasks.');
      toastError(err?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, toastError]);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    loadTasks();
  }, [companyId, profileLoading, loadTasks]);

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    try {
      debug.authCheck('tasks:complete', userId);
      if (!userId) { toastError('You must be logged in.'); setCompleting(null); return; }
      await updateTaskStatus(taskId, 'completed');
      success('Task marked as completed!');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
      await loadTasks();
    } catch (err: any) {
      toastError(err?.message || 'Failed to complete task.');
    }
    setCompleting(null);
  };

  const filtered = tasks.filter(t => {
    const matchesSearch = !search.trim() || t.title?.toLowerCase().includes(search.toLowerCase()) || t.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isOverdue = (task: Task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading...' : `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/tasks/add" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm">
          <Plus size={15} /><span>Add Task</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      {loading && (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-pulse">
              <div className="w-5 h-5 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3.5 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-1/4" /></div>
              <div className="h-5 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4"><CheckSquare size={22} className="text-primary" /></div>
          <h3 className="text-base font-600 text-foreground mb-1">{search || statusFilter !== 'all' ? 'No tasks found' : 'No tasks yet'}</h3>
          <p className="text-sm text-muted-foreground mb-5">{search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first task to get started.'}</p>
          {!search && statusFilter === 'all' && (
            <Link href="/tasks/add" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 shadow-sm">
              <Plus size={14} /> Add Task
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <ul className="divide-y divide-border">
            {filtered.map(task => {
              const sc = statusConfig[task.status] || { label: task.status, color: 'bg-gray-50 text-gray-600' };
              const pc = priorityConfig[task.priority] || { label: task.priority, color: 'text-muted-foreground' };
              const overdue = isOverdue(task);
              return (
                <li key={task.id} className={`group ${overdue ? 'bg-red-50/30' : ''}`}>
                  <div className="flex items-start gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                    {/* Complete button */}
                    <button
                      onClick={() => task.status !== 'completed' && handleComplete(task.id)}
                      disabled={task.status === 'completed' || completing === task.id}
                      className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                        task.status === 'completed' ? 'border-green-500 bg-green-50' : 'border-border hover:border-green-500 hover:bg-green-50'
                      } ${completing === task.id ? 'opacity-50' : ''}`}
                      aria-label={`Mark task complete: ${task.title}`}
                    >
                      {task.status === 'completed' && <CheckCircle2 size={12} className="text-green-500" />}
                    </button>
                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/tasks/${task.id}`)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-500 ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                        {overdue && <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {task.clientName && <span className="text-xs text-muted-foreground truncate">{task.clientName}</span>}
                        {task.dueDate && (
                          <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 font-500' : 'text-muted-foreground'}`}>
                            <Calendar size={10} />{new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {task.assigneeName && <span className="text-xs text-muted-foreground/60">{task.assigneeName}</span>}
                        <span className={`text-xs font-500 ${pc.color}`}>{pc.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sc.color}`}>{sc.label}</span>
                      <ChevronRight size={15} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" onClick={() => router.push(`/tasks/${task.id}`)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
