import React from 'react';

export const AUDIENCE_ROLES = [
  { id: 'sales', label: 'Sales', description: 'Deal impact and next actions' },
  { id: 'csm', label: 'CSM', description: 'Customer health and outcomes' },
  { id: 'marketing', label: 'Marketing', description: 'Campaigns, audiences, and handoffs' },
  { id: 'it', label: 'IT', description: 'Systems, security, and implementation' },
];

export function AudienceRoleControl({ value, onChange }) {
  const selected = AUDIENCE_ROLES.find((role) => role.id === value) || AUDIENCE_ROLES[0];

  return (
    <div className="w-full">
      <div className="mb-1.5 flex min-h-4 items-baseline justify-between gap-3">
        <span id="audience-role-label" className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ac-dark-secondary">
          Tailor output for
        </span>
        <span className="truncate text-[10.5px] text-ac-med-gray" aria-live="polite">
          {selected.description}
        </span>
      </div>
      <div
        className="grid w-full grid-cols-4 rounded-lg border border-ac-light-gray bg-ac-warm-white p-0.5"
        role="group"
        aria-labelledby="audience-role-label"
      >
        {AUDIENCE_ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            aria-label={`${role.label}: ${role.description}`}
            aria-pressed={value === role.id}
            className={`min-w-0 rounded-md px-1.5 py-1.5 text-center font-mono text-[9.5px] uppercase tracking-[0.03em] transition-colors ${value === role.id ? 'bg-white text-ac-dark shadow-sm' : 'text-ac-med-gray hover:bg-white/60 hover:text-ac-dark'}`}
          >
            {role.label}
          </button>
        ))}
      </div>
    </div>
  );
}
