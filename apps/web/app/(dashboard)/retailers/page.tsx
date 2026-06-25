import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Page() {
  return <div className="grid gap-4"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Retailers</h1><Button>New</Button></div><Card><CardHeader><CardTitle>Retailers</CardTitle></CardHeader><CardContent><div className="min-h-80 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Retailers workspace with filters, tables, maps, charts, and detail workflows wired to the GrowSafe API.</div></CardContent></Card></div>;
}
