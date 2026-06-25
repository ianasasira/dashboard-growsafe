import { Card, CardContent } from '@/components/ui/card';

async function getVerification(code: string) {
  const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1') + '/verify/' + code, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const data = await getVerification(params.code);
  const result = data?.result ?? 'invalid';
  const tone = result === 'genuine' ? 'text-green-700' : result === 'recalled' || result === 'invalid' ? 'text-red-700' : 'text-amber-700';
  return <main className="min-h-screen bg-background p-4"><Card className="mx-auto max-w-md"><CardContent className="grid gap-4 p-5"><h1 className={'text-2xl font-bold ' + tone}>{result === 'genuine' ? 'GENUINE PRODUCT' : result === 'already_used' ? 'ALREADY SCANNED' : result === 'recalled' ? 'PRODUCT RECALL' : result === 'expired' ? 'PRODUCT EXPIRED' : 'NOT RECOGNIZED'}</h1><div className="rounded-md bg-slate-50 p-4 text-sm"><p>Product: {data?.product?.product_name ?? 'Unknown'}</p><p>Manufacturer: {data?.product?.company_name ?? 'Unknown'}</p><p>Batch: {data?.product?.batch_number ?? params.code}</p><p>Expiry: {data?.product?.expiry_date ?? 'Unknown'}</p></div><div className="grid gap-2 text-sm"><label>Was this product helpful?</label><div className="text-2xl text-warning">★★★★★</div><textarea className="min-h-24 rounded-md border border-slate-300 p-3" placeholder="Leave feedback" /></div></CardContent></Card></main>;
}
