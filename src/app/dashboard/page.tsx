'use client';

import { DashboardView } from '@/components/wcp/dashboard-view';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  return <DashboardView onNavigate={(path) => router.push(`/dashboard/${path}`)} />;
}
