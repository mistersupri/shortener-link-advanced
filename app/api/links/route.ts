import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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

    let links;
    let totalCount;

    if (isAdmin) {
      // Admin sees all links
      if (status === "active") {
        links = await sql`
          SELECT l.*, u.email as user_email, u.name as user_name
          FROM links l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.is_active = true
          AND (l.slug ILIKE ${"%" + search + "%"} OR l.original_url ILIKE ${"%" + search + "%"})
          ORDER BY 
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN l.created_at END DESC,
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc' THEN l.created_at END ASC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'desc' THEN l.click_count END DESC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'asc' THEN l.click_count END ASC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'desc' THEN l.slug END DESC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'asc' THEN l.slug END ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM links 
          WHERE is_active = true 
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
        `;
        totalCount = parseInt(countResult[0].count);
      } else if (status === "inactive") {
        links = await sql`
          SELECT l.*, u.email as user_email, u.name as user_name
          FROM links l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.is_active = false
          AND (l.slug ILIKE ${"%" + search + "%"} OR l.original_url ILIKE ${"%" + search + "%"})
          ORDER BY 
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN l.created_at END DESC,
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc' THEN l.created_at END ASC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'desc' THEN l.click_count END DESC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'asc' THEN l.click_count END ASC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'desc' THEN l.slug END DESC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'asc' THEN l.slug END ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM links 
          WHERE is_active = false 
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
        `;
        totalCount = parseInt(countResult[0].count);
      } else {
        links = await sql`
          SELECT l.*, u.email as user_email, u.name as user_name
          FROM links l
          LEFT JOIN users u ON l.user_id = u.id
          WHERE (l.slug ILIKE ${"%" + search + "%"} OR l.original_url ILIKE ${"%" + search + "%"})
          ORDER BY 
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN l.created_at END DESC,
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc' THEN l.created_at END ASC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'desc' THEN l.click_count END DESC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'asc' THEN l.click_count END ASC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'desc' THEN l.slug END DESC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'asc' THEN l.slug END ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM links 
          WHERE (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
        `;
        totalCount = parseInt(countResult[0].count);
      }
    } else {
      // Regular users only see their own links
      if (status === "active") {
        links = await sql`
          SELECT * FROM links
          WHERE user_id = ${session.userId}
          AND is_active = true
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
          ORDER BY 
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN created_at END DESC,
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc' THEN created_at END ASC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'desc' THEN click_count END DESC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'asc' THEN click_count END ASC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'desc' THEN slug END DESC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'asc' THEN slug END ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM links 
          WHERE user_id = ${session.userId} 
          AND is_active = true 
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
        `;
        totalCount = parseInt(countResult[0].count);
      } else if (status === "inactive") {
        links = await sql`
          SELECT * FROM links
          WHERE user_id = ${session.userId}
          AND is_active = false
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
          ORDER BY 
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN created_at END DESC,
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc' THEN created_at END ASC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'desc' THEN click_count END DESC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'asc' THEN click_count END ASC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'desc' THEN slug END DESC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'asc' THEN slug END ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM links 
          WHERE user_id = ${session.userId} 
          AND is_active = false 
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
        `;
        totalCount = parseInt(countResult[0].count);
      } else {
        links = await sql`
          SELECT * FROM links
          WHERE user_id = ${session.userId}
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
          ORDER BY 
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN created_at END DESC,
            CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc' THEN created_at END ASC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'desc' THEN click_count END DESC,
            CASE WHEN ${sortBy} = 'click_count' AND ${sortOrder} = 'asc' THEN click_count END ASC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'desc' THEN slug END DESC,
            CASE WHEN ${sortBy} = 'slug' AND ${sortOrder} = 'asc' THEN slug END ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countResult = await sql`
          SELECT COUNT(*) as count FROM links 
          WHERE user_id = ${session.userId} 
          AND (slug ILIKE ${"%" + search + "%"} OR original_url ILIKE ${"%" + search + "%"})
        `;
        totalCount = parseInt(countResult[0].count);
      }
    }

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

    const links = await sql`
      INSERT INTO links (user_id, original_url, slug, password_hash, expires_at, click_count)
      VALUES (${session.userId}, ${originalUrl}, ${finalSlug}, ${passwordHash}, ${expiresAt ? new Date(expiresAt).toISOString() : null}, 0)
      RETURNING *
    `;

    return NextResponse.json({ link: links[0] }, { status: 201 });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
