import { redirect } from 'next/navigation';
import { getCurrentUser, homeFor } from '@/lib/auth';

export default async function Home() {
  const u = await getCurrentUser();
  redirect(u ? homeFor(u.role) : '/login');
}
