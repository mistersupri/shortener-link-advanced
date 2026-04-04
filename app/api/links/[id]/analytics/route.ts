import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership or admin
    const link = await prisma.link.findUnique({
      where: { id },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (link.user_id !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get click counts by day (last 30 days)
    const clicksByDay = (await prisma.$queryRaw`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as clicks
      FROM clicks
      WHERE link_id = ${id}
        AND clicked_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(clicked_at)
      ORDER BY date ASC
    `) as { date: string; clicks: bigint }[];

    // Get clicks by device
    const clicksByDevice = await prisma.click.groupBy({
      by: ["device_type"],
      where: { link_id: id },
      _count: { device_type: true },
      orderBy: { _count: { device_type: "desc" } },
      take: 10,
    });

    // Get clicks by browser
    const clicksByBrowser = await prisma.click.groupBy({
      by: ["browser"],
      where: { link_id: id },
      _count: { browser: true },
      orderBy: { _count: { browser: "desc" } },
      take: 10,
    });

    // Get clicks by country
    const clicksByCountry = await prisma.click.groupBy({
      by: ["country"],
      where: { link_id: id },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    });

    // Get recent clicks
    const recentClicks = await prisma.click.findMany({
      where: { link_id: id },
      orderBy: { clicked_at: "desc" },
      take: 20,
    });

    return NextResponse.json({
      totalClicks: link.click_count,
      clicksByDay: clicksByDay.map((row) => ({
        date: row.date,
        clicks: Number(row.clicks),
      })),
      clicksByDevice: clicksByDevice.map((row) => ({
        device: row.device_type || "Unknown",
        clicks: row._count.device_type,
      })),
      clicksByBrowser: clicksByBrowser.map((row) => ({
        browser: row.browser || "Unknown",
        clicks: row._count.browser,
      })),
      clicksByCountry: clicksByCountry.map((row) => ({
        country: row.country || "Unknown",
        clicks: row._count.country,
      })),
      recentClicks,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
