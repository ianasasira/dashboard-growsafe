import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatCard } from '@/components/stat-card';
export default function AdminPage() { return <DashboardShell><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[['Total Companies','12','active'],['Total Products','4,820','platform'],['Codes Generated','48,200,000','all tenants'],['Total Scans','12,480,000','platform'],['Fraud Alerts','2,840','platform']].map(([l,v,t]) => <StatCard key={l} label={l} value={v} trend={t} />)}</div></DashboardShell>; }
