'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    const fetchTask = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*, clients(id, name), leads(id, title), user_profiles!tasks_assigned_to_fkey(full_name), creator:user_profiles!tasks_created_by_fkey(full_name)')
        .eq('id', taskId)
        .single();
      if (fetchError) { setError(fetchError.message); setLoading(false); return; }
      setTask(data);
      setLoading(false);
    };
    fetchTask();
  }, [taskId]);

  const handleComplete = async () => {
    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
    if (!error) setTask((prev: any) => ({ ...prev, status: 'completed' }));
    setCompleting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { setError(error.message); setDeleting(false); return; }
    router.push('/tasks');
  };

  const isOverdue = task && task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/tasks')} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1"><h1 className="text-2xl font-600 text-foreground">Task Details</h1></div>
        {task && (
          <div className="flex items-center gap-2">
            <Link href={`/tasks/${taskId}/edit`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">
              <Edit2 size={14} /><span className="hidden sm:inline">Edit</span>
            </Link>
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all">
              <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-base font-600 text-foreground mb-2">Delete Task?</h3>
            <p className="text-sm text-muted-foreground mb-5">This will permanently delete <strong>{task?.title}</strong>. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="bg-white border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}</div>}
      {!loading && error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      {!loading && !error && task && (() => {
        const sc = statusConfig[task.status] || { label: task.status, color: 'bg-gray-50 text-gray-600' };
        const pc = priorityConfig[task.priority] || { label: task.priority, color: 'text-muted-foreground' };
        return (
          <div className="space-y-5">
            <div className={`bg-white border rounded-xl shadow-sm p-6 ${isOverdue ? 'border-red-200' : 'border-border'}`}>
              <div className="flex items-start gap-4 pb-5 mb-2 border-b border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {isOverdue && <AlertTriangle size={16} className="text-red-500" />}
                    <h2 className={`text-lg font-600 ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sc.color}`}>{sc.label}</span>
                    <span className={`text-xs font-500 ${pc.color}`}>{pc.label} Priority</span>
                    {isOverdue && <span className="text-xs font-500 text-red-600">Overdue</span>}
                  </div>
                </div>
                {task.status !== 'completed' && (
                  <button onClick={handleComplete} disabled={completing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-all disabled:opacity-60">
                    <CheckCircle2 size={14} />{completing ? 'Completing...' : 'Mark Complete'}
                  </button>
                )}
              </div>
              {task.description && (
                <div className="mb-4">
                  <p className="text-xs font-500 text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {task.due_date && (
                  <div>
                    <p className="text-xs font-500 text-muted-foreground mb-1">Due Date</p>
                    <p className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-600 font-500' : 'text-foreground'}`}>
                      <Calendar size={12} />{new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {task.user_profiles && (
                  <div>
                    <p className="text-xs font-500 text-muted-foreground mb-1">Assigned To</p>
                    <p className="text-sm text-foreground">{task.user_profiles.full_name}</p>
                  </div>
                )}
                {task.clients && (
                  <div>
                    <p className="text-xs font-500 text-muted-foreground mb-1">Client</p>
                    <Link href={`/clients/${task.clients.id}`} className="text-sm text-primary hover:underline">{task.clients.name}</Link>
                  </div>
                )}
                {task.leads && (
                  <div>
                    <p className="text-xs font-500 text-muted-foreground mb-1">Lead</p>
                    <Link href={`/leads/${task.leads.id}`} className="text-sm text-primary hover:underline">{task.leads.title}</Link>
                  </div>
                )}
                <div>
                  <p className="text-xs font-500 text-muted-foreground mb-1">Created</p>
                  <p className="text-sm text-foreground">{new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
