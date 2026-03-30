"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Check,
  Shield,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit,
  BarChart3,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { Link as LinkType } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface LinksTableProps {
  links: LinkType[];
  isLoading: boolean;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function LinksTable({
  links,
  isLoading,
  onRefresh,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: LinksTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<LinkType | null>(null);
  const [qrLink, setQrLink] = useState<LinkType | null>(null);

  async function downloadQRCode() {
    const svg = document.querySelector("#qr-code svg");
    if (!svg) return;

    const clonedSvg = svg.cloneNode(true) as SVGElement;

    // ✅ wajib namespace
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // ✅ inline <image>
    const image = clonedSvg.querySelector("image");
    if (image) {
      let href =
        image.getAttribute("href") ||
        image.getAttributeNS("http://www.w3.org/1999/xlink", "href");

      if (href && !href.startsWith("data:")) {
        try {
          const res = await fetch(href);
          const blob = await res.blob();

          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // 🔥 set BOTH (important)
          image.setAttribute("href", base64);
          image.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            base64,
          );
        } catch (err) {
          console.error("Failed to inline image", err);
        }
      }
    }

    // ✅ serialize SVG
    const svgData = new XMLSerializer().serializeToString(clonedSvg);

    // ✅ convert ke base64 (lebih stabil dari blob)
    const svgBase64 = `data:image/svg+xml;base64,${btoa(
      unescape(encodeURIComponent(svgData)),
    )}`;

    const img = new Image();

    // 🔥 penting untuk CORS
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");

      const width = svg.clientWidth || 200;
      const height = svg.clientHeight || 200;

      // optional: biar HD
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // sedikit delay biar aman render image di dalam SVG
      setTimeout(() => {
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "qr.png";
          link.click();

          URL.revokeObjectURL(url);
        }, "image/png");
      }, 50);
    };

    img.onerror = (e) => {
      console.error("Failed to load SVG into image", e);
    };

    img.src = svgBase64;
  }

  const copyToClipboard = async (slug: string, id: string) => {
    const baseUrl = window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!linkToDelete) return;

    try {
      await fetch(`/api/links/${linkToDelete.id}`, { method: "DELETE" });
      onRefresh();
    } catch (error) {
      console.error("Failed to delete link:", error);
    }

    setDeleteDialogOpen(false);
    setLinkToDelete(null);
  };

  const toggleActive = async (link: LinkType) => {
    try {
      await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !link.is_active }),
      });
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle link:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground animate-pulse">
            Loading links...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (links.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No links found. Create your first link!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AnimatePresence>
        {qrLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQrLink(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-2">{qrLink.slug}</h2>
              <p className="text-sm text-zinc-500 mb-8 truncate">
                {qrLink.original_url}
              </p>

              <div
                id="qr-code"
                className="bg-white p-6 rounded-2xl inline-block mb-8"
              >
                <QRCodeSVG
                  value={`${window.location.origin}/r/${qrLink.slug}`}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "/logo.png",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              <div className="space-y-4">
                <button
                  onClick={downloadQRCode}
                  className="w-full py-3 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Download QR Code
                </button>
                <button
                  onClick={() => setQrLink(null)}
                  className="w-full py-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Short Link
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                    Destination
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Clicks
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                    Created
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
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                          >
                            {baseUrl}/{link.slug}{" "}
                            <ExternalLink className="w-3 h-3 m-0 p-0" />
                          </a>
                          <div className="flex gap-1">
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
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <a
                          href={link.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground truncate block max-w-[250px]"
                        >
                          {link.original_url}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{link.click_count}</span>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {!link.is_active ? (
                          <Badge variant="secondary">Disabled</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                        {new Date(link.created_at).toLocaleDateString()}
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

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/links/${link.id}`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/links/${link.id}/analytics`}
                                >
                                  <BarChart3 className="w-4 h-4 mr-2" />
                                  Analytics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <span onClick={() => setQrLink(link)}>
                                  <QrCode className="w-4 h-4 mr-2" />
                                  QR Code
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleActive(link)}
                              >
                                {link.is_active ? "Disable" : "Enable"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setLinkToDelete(link);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {links.length} of {totalCount} links
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this link? This action cannot be
              undone. All analytics data for this link will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
