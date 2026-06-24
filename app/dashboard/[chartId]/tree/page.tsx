"use client"

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import FamilyTreeView from '@/components/tree/family-tree-view';
import DashboardLayout from '@/components/dashboard-layout';

interface TreeChartPageProps {
    params: Promise<{
        chartId: string;
    }>;
}

export default function TreeChartPage({ params }: TreeChartPageProps) {
    const { chartId } = use(params);
    const router = useRouter();
    const { user, token, isLoading } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isLoading && (!user || !token)) {
            router.push("/");
        }
    }, [mounted, user, token, isLoading, router]);

    if (!mounted || isLoading || !user || !token) {
        return null;
    }

    return (
        <DashboardLayout>
            <FamilyTreeView chartId={chartId} />
        </DashboardLayout>
    );
}
