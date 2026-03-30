import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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
    const links = await sql`SELECT * FROM links WHERE id = ${id}`;
    if (links.length === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const link = links[0];
    if (link.user_id !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get click counts by day (last 30 days)
    const clicksByDay = await sql`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as clicks
      FROM clicks
      WHERE link_id = ${id}
        AND clicked_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(clicked_at)
      ORDER BY date ASC
    `;

    // Get clicks by device
    const clicksByDevice = await sql`
      SELECT 
        COALESCE(device_type, 'Unknown') as device,
        COUNT(*) as clicks
      FROM clicks
      WHERE link_id = ${id}
      GROUP BY device_type
      ORDER BY clicks DESC
      LIMIT 10
    `;

    // Get clicks by browser
    const clicksByBrowser = await sql`
      SELECT 
        COALESCE(browser, 'Unknown') as browser,
        COUNT(*) as clicks
      FROM clicks
      WHERE link_id = ${id}
      GROUP BY browser
      ORDER BY clicks DESC
      LIMIT 10
    `;

    // Get clicks by country
    const clicksByCountry = await sql`
      SELECT 
        COALESCE(country, 'Unknown') as country,
        COUNT(*) as clicks
      FROM clicks
      WHERE link_id = ${id}
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `;

    // Get recent clicks
    const recentClicks = await sql`
      SELECT *
      FROM clicks
      WHERE link_id = ${id}
      ORDER BY clicked_at DESC
      LIMIT 20
    `;

    return NextResponse.json({
      totalClicks: link.click_count,
      clicksByDay: clicksByDay.map((row) => ({
        date: row.date,
        clicks: parseInt(row.clicks as string),
      })),
      clicksByDevice: clicksByDevice.map((row) => ({
        device: row.device,
        clicks: parseInt(row.clicks as string),
      })),
      clicksByBrowser: clicksByBrowser.map((row) => ({
        browser: row.browser,
        clicks: parseInt(row.clicks as string),
      })),
      clicksByCountry: clicksByCountry.map((row) => ({
        country: row.country,
        clicks: parseInt(row.clicks as string),
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
