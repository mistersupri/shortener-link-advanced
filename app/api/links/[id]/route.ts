import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const link = await prisma.link.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

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
    const existingLink = await prisma.link.findUnique({
      where: { id },
    });
    if (!existingLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

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
    const link = await prisma.link.update({
      where: { id },
      data: {
        ...(updates.original_url && {
          original_url: updates.original_url as string,
        }),
        ...(updates.slug && { slug: updates.slug as string }),
        password_hash: updates.password_hash as string | null,
        ...(updates.expires_at && {
          expires_at: new Date(updates.expires_at as string),
        }),
        ...(updates.is_active !== undefined && {
          is_active: updates.is_active as boolean,
        }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ link });
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
    const existingLink = await prisma.link.findUnique({
      where: { id },
    });
    if (!existingLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (existingLink.user_id !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the link (clicks will be deleted due to cascade)
    await prisma.link.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
