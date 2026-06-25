import { cn } from '@/lib/utils';
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-green-100', className)} {...props} />; }
