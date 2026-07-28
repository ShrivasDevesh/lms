import type { LucideIcon } from 'lucide-react';

export const StatCard = ({ label, value, helper, icon: Icon, tone = 'violet' }: { label: string; value: string | number; helper?: string; icon: LucideIcon; tone?: string }) => (
  <article className="stat-card">
    <div className={`stat-icon tone-${tone}`}><Icon size={21} /></div>
    <div>
      <p className="stat-label">{label}</p>
      <h3>{value}</h3>
      {helper && <p className="stat-helper">{helper}</p>}
    </div>
  </article>
);
