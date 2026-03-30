import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { isValidSlug, isSlugAvailable } from "@/lib/slug";

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

    const links = await sql`
      SELECT l.*, u.email as user_email, u.name as user_name
      FROM links l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.id = ${id}
    `;

    if (links.length === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const link = links[0];

    // Check ownership or admin
    if (link.user_id !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Get link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check ownership or admin
    const existingLinks = await sql`SELECT * FROM links WHERE id = ${id}`;
    if (existingLinks.length === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const existingLink = existingLinks[0];
    if (existingLink.user_id !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.originalUrl !== undefined) {
      try {
        new URL(body.originalUrl);
        updates.original_url = body.originalUrl;
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 },
        );
      }
    }

    if (body.slug !== undefined && body.slug !== existingLink.slug) {
      if (!isValidSlug(body.slug)) {
        return NextResponse.json(
          {
            error:
              "Slug must be 3-50 characters and contain only letters, numbers, hyphens, and underscores",
          },
          { status: 400 },
        );
      }
      const slugAvailable = await isSlugAvailable(body.slug, id);
      if (!slugAvailable) {
        return NextResponse.json(
          { error: "Slug is already taken" },
          { status: 409 },
        );
      }
      updates.slug = body.slug;
    }

    if (body.password !== undefined) {
      updates.password_hash = body.password
        ? await hashPassword(body.password)
        : null;
    }

    if (body.expiresAt !== undefined) {
      updates.expires_at = new Date(body.expiresAt).toISOString();
    }

    if (body.isActive !== undefined) {
      updates.is_active = body.isActive;
    }

    // Perform update
    const link = await sql`
      UPDATE links
      SET 
        original_url = COALESCE(${updates.original_url ?? null}, original_url),
        slug = COALESCE(${updates.slug ?? null}, slug),
        password_hash = ${updates.password_hash !== undefined ? updates.password_hash : existingLink.password_hash},
        expires_at = ${updates.expires_at !== undefined ? updates.expires_at : existingLink.expires_at},
        is_active = COALESCE(${updates.is_active ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({ link: link[0] });
  } catch (error) {
    console.error("Update link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const existingLinks = await sql`SELECT * FROM links WHERE id = ${id}`;
    if (existingLinks.length === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const existingLink = existingLinks[0];
    if (existingLink.user_id !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete associated clicks first
    await sql`DELETE FROM clicks WHERE link_id = ${id}`;

    // Delete the link
    await sql`DELETE FROM links WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
