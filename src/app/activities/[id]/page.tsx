'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Phone, Users, MessageSquare, Mail, StickyNote, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';


const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call: { label: 'Call', icon: Phone, color: 'bg-blue-50 text-blue-600' },
  meeting: { label: 'Meeting', icon: Users, color: 'bg-violet-50 text-violet-600' },
  message: { label: 'Message', icon: MessageSquare, color: 'bg-sky-50 text-sky-600' },
  email: { label: 'Email', icon: Mail, color: 'bg-amber-50 text-amber-600' },
  note: { label: 'Note', icon: StickyNote, color: 'bg-gray-50 text-gray-600' },
};

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params?.id as string;

  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!activityId) return;
    const fetchActivity = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*, clients(id, name), leads(id, title), user_profiles(full_name)')
        .eq('id', activityId)
        .single();
      if (fetchError) { setError(fetchError.message); setLoading(false); return; }
      setActivity(data);
      setLoading(false);
    };
    fetchActivity();
  }, [activityId]);

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (error) { setError(error.message); setDeleting(false); return; }
    router.push('/activities');
  };

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/activities')} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1"><h1 className="text-2xl font-600 text-foreground">Activity Detail</h1></div>
          {activity && (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all">
              <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-base font-600 text-foreground mb-2">Delete Activity?</h3>
              <p className="text-sm text-muted-foreground mb-5">This will permanently delete this activity log. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-60">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="bg-white border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}</div>}
        {!loading && error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

        {!loading && !error && activity && (() => {
          const tc = typeConfig[activity.type] || { label: activity.type, icon: Activity, color: 'bg-gray-50 text-gray-600' };
          const Icon = tc.icon;
          return (
            <div className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${tc.color}`}>{tc.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.activity_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <p className="text-base font-500 text-foreground">{activity.summary}</p>
                </div>
              </div>
              {activity.notes && (
                <div>
                  <p className="text-xs font-500 text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{activity.notes}</p>
                </div>
              )}
              {activity.clients && (
                <div>
                  <p className="text-xs font-500 text-muted-foreground mb-1">Client</p>
                  <Link href={`/clients/${activity.clients.id}`} className="text-sm text-primary hover:underline">{activity.clients.name}</Link>
                </div>
              )}
              {activity.leads && (
                <div>
                  <p className="text-xs font-500 text-muted-foreground mb-1">Lead</p>
                  <Link href={`/leads/${activity.leads.id}`} className="text-sm text-primary hover:underline">{activity.leads.title}</Link>
                </div>
              )}
              {activity.user_profiles && (
                <div>
                  <p className="text-xs font-500 text-muted-foreground mb-1">Logged By</p>
                  <p className="text-sm text-foreground">{activity.user_profiles.full_name}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </>
  );
}
