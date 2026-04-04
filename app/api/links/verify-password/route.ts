import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { parseUserAgent } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  try {
    const { slug, password } = await request.json();

    if (!slug || !password) {
      return NextResponse.json(
        { error: "Slug and password required" },
        { status: 400 },
      );
    }

    const link = await prisma.link.findUnique({
      where: { slug },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json({ error: "Link is disabled" }, { status: 403 });
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "Link has expired" }, { status: 410 });
    }

    // Verify password
    if (!link.password_hash) {
      return NextResponse.json(
        { error: "Link is not password protected" },
        { status: 400 },
      );
    }

    const isValid = await compare(password, link.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Record click
    const userAgent = request.headers.get("user-agent") || "";
    const { device, browser, os } = parseUserAgent(userAgent);

    // Get IP and geo info
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const country = request.headers.get("x-vercel-ip-country") || null;
    const city = request.headers.get("x-vercel-ip-city") || null;
    const referer = request.headers.get("referer") || null;

    await prisma.click.create({
      data: {
        link_id: link.id,
        ip_address: ip,
        user_agent: userAgent,
        referer,
        country,
        city,
        device_type: device,
        browser,
        os,
      },
    });

    // Update click count
    await prisma.link.update({
      where: { id: link.id },
      data: { click_count: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      url: link.original_url,
    });
  } catch (error) {
    console.error("Error verifying password:", error);
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 },
    );
  }
}
