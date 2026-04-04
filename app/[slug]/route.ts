import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseUserAgent } from "@/lib/analytics";
import { verifyPassword } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("p");

    // Find the link
    const link = await prisma.link.findUnique({
      where: { slug },
    });

    if (!link) {
      return NextResponse.redirect(new URL("/404", request.url));
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.redirect(new URL("/link-disabled", request.url));
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at as string) < new Date()) {
      return NextResponse.redirect(new URL("/link-expired", request.url));
    }

    // Check if password protected
    if (link.password_hash) {
      if (!password) {
        // Redirect to password page
        return NextResponse.redirect(new URL(`/p/${slug}`, request.url));
      }

      const isValid = await verifyPassword(
        password,
        link.password_hash as string,
      );
      if (!isValid) {
        return NextResponse.redirect(
          new URL(`/p/${slug}?error=invalid`, request.url),
        );
      }
    }

    // Track click
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      null;
    const referer = request.headers.get("referer");

    const { device, browser, os } = parseUserAgent(userAgent);

    // Get geo from Vercel headers
    const country = request.headers.get("x-vercel-ip-country") || null;
    const city = request.headers.get("x-vercel-ip-city") || null;

    // Insert click record
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

    // Redirect to original URL
    return NextResponse.redirect(link.original_url as string);
  } catch (error) {
    console.error("Redirect error:", error);
    return NextResponse.redirect(new URL("/error", request.url));
  }
}
