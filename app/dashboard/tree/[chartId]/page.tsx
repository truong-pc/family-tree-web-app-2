"use client"

import { use } from 'react';
import FamilyTreeView from '@/components/tree/family-tree-view';
import DashboardLayout from '@/components/dashboard-layout';

interface TreeChartPageProps {
    params: Promise<{
        chartId: string;
    }>;
}

export default function TreeChartPage({ params }: TreeChartPageProps) {
    const { chartId } = use(params);
    return (
        <DashboardLayout>
            <FamilyTreeView chartId={chartId} />
        </DashboardLayout>
    );
}