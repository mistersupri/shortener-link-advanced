import { nanoid } from "nanoid";
import { prisma } from "./db";

export function generateSlug(): string {
  return nanoid(7);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}

export async function isSlugAvailable(
  slug: string,
  excludeLinkId?: string,
): Promise<boolean> {
  const link = await prisma.link.findFirst({
    where: {
      slug,
      ...(excludeLinkId && { id: { not: excludeLinkId } }),
    },
  });
  return !link;
}
