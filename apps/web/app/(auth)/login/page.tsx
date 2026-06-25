'use client';
import { useState } from 'react';
import { Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [error, setError] = useState('');
  async function submit(formData: FormData) {
    setError('');
    const response = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1') + '/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.get('email'), password: formData.get('password'), companySlug: formData.get('companySlug') }) });
    const json = await response.json();
    if (!response.ok) return setError('Invalid credentials');
    localStorage.setItem('growsafe_token', json.data.accessToken);
    window.location.href = '/overview';
  }
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-sm"><CardContent className="p-6"><div className="mb-6 flex items-center justify-center gap-2 text-xl font-semibold"><Sprout className="h-6 w-6 text-primary" />GrowSafe</div><form action={submit} className="grid gap-3"><Input name="companySlug" placeholder="Company slug" defaultValue="bukoola" /><Input name="email" type="email" placeholder="Email" defaultValue="admin@bukoola.com" /><Input name="password" type="password" placeholder="Password" defaultValue="Admin@2026" />{error && <p className="text-sm text-danger">{error}</p>}<Button>Sign in</Button></form></CardContent></Card></main>;
}
