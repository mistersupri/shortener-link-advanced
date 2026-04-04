import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total links
    const totalLinks = await prisma.link.count({
      where: { user_id: user.id },
    });

    // Get total clicks for user's links
    const totalClicks = await prisma.click.count({
      where: {
        link: { user_id: user.id },
      },
    });

    // Get clicks over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const clicksOverTime = (await prisma.$queryRaw`
      SELECT 
        DATE(c.clicked_at) as date,
        COUNT(*) as clicks
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.user_id = ${user.id}
        AND c.clicked_at >= ${thirtyDaysAgo}
      GROUP BY DATE(c.clicked_at)
      ORDER BY date ASC
    `) as { date: string; clicks: bigint }[];

    // Get top performing links
    const topLinks = await prisma.link.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        slug: true,
        original_url: true,
        title: true,
        click_count: true,
      },
      orderBy: { click_count: "desc" },
      take: 5,
    });

    // Get device breakdown
    const deviceData = await prisma.click.groupBy({
      by: ["device_type"],
      where: { link: { user_id: user.id } },
      _count: { device_type: true },
    });
    const deviceBreakdown = deviceData.map((d) => ({
      name: d.device_type || "Unknown",
      value: d._count.device_type,
    }));

    // Get browser breakdown
    const browserData = await prisma.click.groupBy({
      by: ["browser"],
      where: { link: { user_id: user.id } },
      _count: { browser: true },
      orderBy: { _count: { browser: "desc" } },
      take: 5,
    });
    const browserBreakdown = browserData.map((b) => ({
      name: b.browser || "Unknown",
      value: b._count.browser,
    }));

    // Get country breakdown
    const countryData = await prisma.click.groupBy({
      by: ["country"],
      where: { link: { user_id: user.id } },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    });
    const countryBreakdown = countryData.map((c) => ({
      name: c.country || "Unknown",
      value: c._count.country,
    }));

    return NextResponse.json({
      totalClicks,
      totalLinks,
      clicksOverTime: clicksOverTime.map((c) => ({
        date: c.date,
        clicks: Number(c.clicks),
      })),
      topLinks,
      deviceBreakdown,
      browserBreakdown,
      countryBreakdown,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
