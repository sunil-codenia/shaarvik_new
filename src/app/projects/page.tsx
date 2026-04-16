'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, FolderOpen, ChevronRight } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import debug from '@/lib/debug';
import { useCompanyId } from '@/hooks/useCompanyId';
import { fetchProjects as fetchProjectsService } from '@/lib/services';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientName: string | null;
  clientId: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-green-50 text-green-700' },
  inactive:  { label: 'Inactive',  color: 'bg-gray-50 text-gray-500' },
  completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700' },
  on_hold:   { label: 'On Hold',   color: 'bg-yellow-50 text-yellow-700' },
};

export default function ProjectsPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const { companyId, loading: profileLoading, userId } = useCompanyId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      debug.authCheck('projects', userId);
      const data = await fetchProjectsService(companyId);
      setProjects(data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        clientName: row.clients?.name || null,
        clientId: row.clients?.id || '',
        createdAt: row.created_at,
      })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load projects.');
      toastError(err?.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, toastError]);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    loadProjects();
  }, [companyId, profileLoading, loadProjects]);

  const filtered = projects.filter(p =>
    !search.trim() ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-600 text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Loading...' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/projects/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm"
          >
            <Plus size={15} /><span>Add Project</span>
          </Link>
        </div>

        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects or clients..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}

        {loading && (
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/5" />
                </div>
                <div className="h-5 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FolderOpen size={22} className="text-primary" />
            </div>
            <h3 className="text-base font-600 text-foreground mb-1">
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {search ? 'Try adjusting your search.' : 'Add your first project to get started.'}
            </p>
            {!search && (
              <Link
                href="/projects/add"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 shadow-sm"
              >
                <Plus size={14} /> Add Project
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {filtered.map(project => {
                const sc = statusConfig[project.status] || { label: project.status, color: 'bg-gray-50 text-gray-600' };
                return (
                  <li key={project.id} className="group">
                    <div
                      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FolderOpen size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-500 text-foreground truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {project.clientName || 'No client'}
                          {project.description && ` · ${project.description}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sc.color}`}>
                          {sc.label}
                        </span>
                        <ChevronRight size={15} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
