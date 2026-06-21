"use client"

import { use, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import FamilyTreeView from '@/components/tree/family-tree-view';
import PublicNavbar from '@/components/public-navbar';
import DashboardNavbar from '@/components/dashboard-navbar';

interface PublishedTreePageProps {
  params: Promise<{
    chartId: string;
  }>;
}

export default function PublishedTreePage({ params }: PublishedTreePageProps) {
  const { chartId } = use(params);
  const { user, token } = useAuthStore()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const isAuthed = mounted && !!user && !!token
  

  return (
    <>
      {/* Simple Navbar for Published Tree */}
      {isAuthed ? <DashboardNavbar /> : <PublicNavbar />}
      <FamilyTreeView chartId={chartId} readOnly={true} />
    </>
  );
}

