import { cn } from '@/lib/utils';
export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn('inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50', className)} {...props} />; }
