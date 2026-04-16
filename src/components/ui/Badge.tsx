import React from 'react';

type BadgeVariant =
  | 'new' |'contacted' |'qualified' |'proposal' |'converted' |'lost' |'pending' |'in-progress' |'completed' |'overdue' |'active' |'inactive' |'call' |'meeting' |'message' |'email' |'admin' |'staff' |'today' |'this-week' |'default';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  new: 'bg-blue-50 text-blue-700 border border-blue-200',
  contacted: 'bg-sky-50 text-sky-700 border border-sky-200',
  qualified: 'bg-violet-50 text-violet-700 border border-violet-200',
  proposal: 'bg-amber-50 text-amber-700 border border-amber-200',
  converted: 'bg-green-50 text-green-700 border border-green-200',
  lost: 'bg-red-50 text-red-600 border border-red-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  'in-progress': 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  overdue: 'bg-red-50 text-red-600 border border-red-200',
  active: 'bg-green-50 text-green-700 border border-green-200',
  inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
  call: 'bg-blue-50 text-blue-700 border border-blue-200',
  meeting: 'bg-violet-50 text-violet-700 border border-violet-200',
  message: 'bg-sky-50 text-sky-700 border border-sky-200',
  email: 'bg-amber-50 text-amber-700 border border-amber-200',
  admin: 'bg-primary/10 text-primary border border-primary/20',
  staff: 'bg-gray-100 text-gray-600 border border-gray-200',
  today: 'bg-red-50 text-red-600 border border-red-200',
  'this-week': 'bg-amber-50 text-amber-700 border border-amber-200',
  default: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const variantLabels: Record<BadgeVariant, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal Sent',
  converted: 'Converted',
  lost: 'Lost',
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
  active: 'Active',
  inactive: 'Inactive',
  call: 'Call',
  meeting: 'Meeting',
  message: 'Message',
  email: 'Email',
  admin: 'Admin',
  staff: 'Staff',
  today: 'Today',
  'this-week': 'This Week',
  default: 'Unknown',
};

export default function Badge({ variant, label, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-600 leading-tight tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {label ?? variantLabels[variant]}
    </span>
  );
}