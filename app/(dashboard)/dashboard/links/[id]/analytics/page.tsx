"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  MousePointerClick,
  Globe,
  Monitor,
  Chrome,
} from "lucide-react";
import type { Link, AnalyticsData } from "@/lib/types";
import { ClicksChart } from "@/components/dashboard/clicks-chart";
import { AnalyticsPieChart } from "@/components/dashboard/analytics-pie-chart";

export default function LinkAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [link, setLink] = useState<Link | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [linkRes, analyticsRes] = await Promise.all([
          fetch(`/api/links/${id}`),
          fetch(`/api/links/${id}/analytics`),
        ]);

        const linkData = await linkRes.json();
        const analyticsData = await analyticsRes.json();

        if (linkRes.ok) {
          setLink(linkData.link);
        }
        if (analyticsRes.ok) {
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading analytics...
        </div>
      </div>
    );
  }

  if (!link || !analytics) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Link or analytics not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Link Analytics</h1>
          <p className="text-muted-foreground font-mono">
            {baseUrl}/{link.slug}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clicks
            </CardTitle>
            <MousePointerClick className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClicks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Country
            </CardTitle>
            <Globe className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.clicksByCountry[0]?.country || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Device
            </CardTitle>
            <Monitor className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.clicksByDevice[0]?.device || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Browser
            </CardTitle>
            <Chrome className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.clicksByBrowser[0]?.browser || "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clicks Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Clicks Over Time</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ClicksChart data={analytics.clicksByDay} />
        </CardContent>
      </Card>

      {/* Breakdown Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsPieChart
              data={analytics.clicksByDevice}
              dataKey="device"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsPieChart
              data={analytics.clicksByBrowser}
              dataKey="browser"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsPieChart
              data={analytics.clicksByCountry}
              dataKey="country"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clicks</CardTitle>
          <CardDescription>Last 20 clicks</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentClicks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clicks recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                      Country
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                      Device
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Browser
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentClicks.map((click) => (
                    <tr key={click.id} className="border-b border-border">
                      <td className="py-2 px-3 text-sm">
                        {new Date(click.clicked_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {click.country || "Unknown"}
                      </td>
                      <td className="py-2 px-3 text-sm hidden sm:table-cell">
                        {click.device_type || "Unknown"}
                      </td>
                      <td className="py-2 px-3 text-sm hidden md:table-cell">
                        {click.browser || "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
