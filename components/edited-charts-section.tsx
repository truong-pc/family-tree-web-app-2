"use client";

import { useEffect, useState } from "react";
import * as chartApi from "@/lib/api/chart"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Chart {
  _id: string;
  ownerId: string;
  ownerName: string;
  editors?: string[];
  name: string | null;
  description: string | null;
  published?: boolean;
  createdAt: string;
}

export default function EditedChartsSection() {
  const { token } = useAuthStore()
  const [charts, setCharts] = useState<Chart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        if (!token) {
          setError("Vui lòng đăng nhập để xem danh sách gia phả được chia sẻ");
          setIsLoading(false);
          return;
        }

        console.log("Starting fetch edited charts...");
        const data = await chartApi.getEditedCharts(token);
        console.log("Successfully fetched edited charts:", data);
        setCharts(data || []);
        setError("");
      } catch (err) {
        console.error("Edited charts fetch failed:", err);
        setError("Không thể tải danh sách gia phả. Vui lòng thử lại sau.");
        setCharts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
        <div className="space-y-2">
          <p className="font-semibold text-yellow-800 dark:text-yellow-200">
            ⚠️ Lỗi Kết Nối
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  if (charts.length === 0) {
    return (
      <Card
        className="relative overflow-hidden p-12 text-center border border-white/40 shadow-md"
        style={{
          background:
            "linear-gradient(120deg, rgba(56,189,248,0.3) 0%, rgba(110, 56, 248, 0.3) 100%)",
        }}
      >
        <p className="text-muted-foreground mb-4">
          Bạn chưa được phân quyền chỉnh sửa gia phả nào
        </p>
        <p className="text-sm text-muted-foreground">
          Khi ai đó chia sẻ quyền chỉnh sửa gia phả với bạn, gia phả đó sẽ xuất
          hiện ở đây.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {charts.map((chart) => (
        <Card
          key={chart._id}
          className="relative overflow-hidden p-6 border border-white/40 shadow-md hover:border-primary/50 transition-colors"
          style={{
            background:
              "linear-gradient(120deg, rgba(56,189,248,0.3) 0%, rgba(110, 56, 248, 0.3) 100%)",
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground flex-1">
              {chart.name || "Không có tên gia phả"}
            </h3>
            {chart.published && (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">
                Công khai
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {chart.description || "Không có mô tả"}
          </p>
          <div className="space-y-4 mb-4">
            <p className="text-xs text-muted-foreground">
              Chủ sở hữu: {chart.ownerName}
            </p>
            <p className="text-xs text-muted-foreground">
              Ngày tạo: {new Date(chart.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`/dashboard/${chart._id}/tree`}>
              <Button variant="outline" className="w-full bg-white/30 backdrop-blur-lg border border-white/50">
                Chỉnh Sửa
              </Button>
            </Link>
            <Link href={`/dashboard/${chart._id}/events`}>
              <Button variant="outline" className="w-full bg-white/30 backdrop-blur-lg border border-white/50">
                Xem Sự Kiện
              </Button>
            </Link>
            <Link href={`/dashboard/${chart._id}/news`}>
              <Button variant="outline" className="w-full bg-white/30 backdrop-blur-lg border border-white/50">
                Quản Lý Tin Tức
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
