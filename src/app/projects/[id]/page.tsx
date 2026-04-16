'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FolderOpen, Plus, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientName: string | null;
  clientId: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      const [projRes, tasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, description, status, created_at, clients(id, name)')
          .eq('id', projectId)
          .single(),
        supabase
          .from('tasks')
          .select('id, title, status, priority')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

      if (projRes.error) { setError(projRes.error.message); setLoading(false); return; }
      const row = projRes.data as any;
      setProject({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        clientName: row.clients?.name || null,
        clientId: row.clients?.id || '',
        createdAt: row.created_at,
      });
      setTasks(tasksRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <>
        <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto">
          <p className="text-sm text-red-600">{error || 'Project not found.'}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <FolderOpen size={20} className="text-primary" />
            <h1 className="text-2xl font-600 text-foreground">{project.name}</h1>
          </div>
        </div>

        {/* Project info */}
        <div className="bg-white border border-border rounded-xl shadow-sm p-6 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-500">Client:</span>
            <span className="text-foreground">{project.clientName || '—'}</span>
          </div>
          {project.description && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground font-500">Description:</span>
              <span className="text-foreground">{project.description}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-500">Status:</span>
            <span className="capitalize text-foreground">{project.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Tasks under this project */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-600 text-foreground">Tasks ({tasks.length})</h2>
          <Link
            href={`/tasks/add?client_id=${project.clientId}&project_id=${projectId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 text-white bg-primary hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={12} /> Add Task
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col items-center justify-center py-10 text-center">
            <CheckSquare size={20} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No tasks yet for this project.</p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {tasks.map(task => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                >
                  <CheckSquare size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">{task.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
