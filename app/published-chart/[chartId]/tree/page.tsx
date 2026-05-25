"use client"

import { use } from 'react';
import Link from 'next/link';
import FamilyTreeView from '@/components/tree/family-tree-view';

interface PublishedTreePageProps {
  params: Promise<{
    chartId: string;
  }>;
}

export default function PublishedTreePage({ params }: PublishedTreePageProps) {
  const { chartId } = use(params);
  return (
    <>
      {/* Simple Navbar for Published Tree */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
              <span className="font-bold text-lg text-foreground">Gia Phả</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-foreground hover:text-primary transition font-medium">
                Trang Chủ
              </Link>
              <Link href="/login" className="text-foreground hover:text-primary transition font-medium">
                Đăng Nhập
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <FamilyTreeView chartId={chartId} readOnly={true} />
    </>
  );
}

