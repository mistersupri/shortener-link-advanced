import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateSlug, isValidSlug, isSlugAvailable } from "@/lib/slug";
import { hashPassword } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Build query based on role
    const isAdmin = session.role === "admin";

    const searchFilter = search
      ? {
          OR: [
            { slug: { contains: search, mode: "insensitive" as const } },
            {
              original_url: { contains: search, mode: "insensitive" as const },
            },
          ],
        }
      : {};

    const statusFilter =
      status === "active"
        ? { is_active: true }
        : status === "inactive"
          ? { is_active: false }
          : {};

    const userFilter = isAdmin ? {} : { user_id: session.userId };

    const where = {
      ...searchFilter,
      ...statusFilter,
      ...userFilter,
    };

    const orderBy = { [sortBy]: sortOrder };

    const links = await prisma.link.findMany({
      where,
      include: isAdmin
        ? { user: { select: { email: true, name: true } } }
        : false,
      orderBy,
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.link.count({ where });

    return NextResponse.json({
      links,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get links error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { originalUrl, slug, password, expiresAt } = await request.json();

    if (!originalUrl) {
      return NextResponse.json(
        { error: "Original URL is required" },
        { status: 400 },
      );
    }

    // Validate URL
    try {
      new URL(originalUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Generate or validate slug
    let finalSlug = slug || generateSlug();

    if (!isValidSlug(finalSlug)) {
      return NextResponse.json(
        {
          error:
            "Slug must be 3-50 characters and contain only letters, numbers, hyphens, and underscores",
        },
        { status: 400 },
      );
    }

    const slugAvailable = await isSlugAvailable(finalSlug);
    if (!slugAvailable) {
      return NextResponse.json(
        { error: "Slug is already taken" },
        { status: 409 },
      );
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const link = await prisma.link.create({
      data: {
        user_id: session.userId,
        original_url: originalUrl,
        slug: finalSlug,
        password_hash: passwordHash,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        click_count: 0,
      },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
