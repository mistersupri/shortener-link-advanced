"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, Shield, Clock, Link2 } from "lucide-react";
import { useState } from "react";
import type { Link as LinkType } from "@/lib/types";

interface RecentLinksTableProps {
  links: LinkType[];
}

export function RecentLinksTable({ links }: RecentLinksTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (slug: string, id: string) => {
    const baseUrl = window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (links.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No links created yet. Create your first link!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Short Link
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">
              Destination
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              Clicks
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
              Status
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => {
            const isExpired =
              link.expires_at && new Date(link.expires_at) < new Date();
            const baseUrl =
              typeof window !== "undefined" ? window.location.origin : "";

            return (
              <tr
                key={link.id}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`${baseUrl}/${link.slug}`}
                      target="_blank"
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                    >
                      {baseUrl}/{link.slug}{" "}
                      <ExternalLink className="w-3 h-3 m-0 p-0" />
                    </a>
                    {link.password_hash && (
                      <Shield
                        className="w-3 h-3 text-purple-500"
                        title="Password protected"
                      />
                    )}
                    {link.expires_at && !isExpired && (
                      <Clock
                        className="w-3 h-3 text-amber-500"
                        title="Has expiration"
                      />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <a
                    href={link.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground truncate block max-w-[200px]"
                  >
                    {link.original_url}
                  </a>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium">{link.click_count}</span>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  {!link.is_active ? (
                    <Badge variant="secondary">Disabled</Badge>
                  ) : isExpired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(link.slug, link.id)}
                      title="Copy link"
                      className="cursor-pointer"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="View details"
                    >
                      <Link href={`/dashboard/links/${link.id}`}>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
