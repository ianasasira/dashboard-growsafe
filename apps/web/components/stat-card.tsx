import { Card, CardContent } from './ui/card';
export function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) { return <Card><CardContent><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div><div className="mt-2 text-xs text-primary">{trend}</div></CardContent></Card>; }
