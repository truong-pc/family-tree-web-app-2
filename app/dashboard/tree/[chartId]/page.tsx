"use client"


import React, { useState, useEffect } from 'react';


interface TreeChartPageProps {
    params: {
        chartId: string;
    };
}

export default function TreeChartPage({ params }: TreeChartPageProps) {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                setLoading(true);
                // Fetch data based on chartId
                const response = await fetch(`/api/charts/${params.chartId}`);
                if (!response.ok) throw new Error('Failed to fetch chart');
                const data = await response.json();
                setChartData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [params.chartId]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!chartData) return <div>No data found</div>;

    return (
        <div className="container mx-auto p-4">
            <h1>Family Tree - {params.chartId}</h1>
            {/* Add your tree chart component here */}
        </div>
    );
}