"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  Save,
  ExternalLink,
  Trash2,
} from "lucide-react";
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
import type { Link } from "@/lib/types";
import LinkWrapper from "next/link";

export default function LinkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [link, setLink] = useState<Link | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [originalUrl, setOriginalUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`/api/links/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch link");
          setIsLoading(false);
          return;
        }

        setLink(data.link);
        setOriginalUrl(data.link.original_url);
        setSlug(data.link.slug);
        setHasPassword(!!data.link.password_hash);
        setHasExpiration(!!data.link.expires_at);
        setExpiresAt(
          data.link.expires_at
            ? new Date(data.link.expires_at).toISOString().slice(0, 16)
            : "",
        );
        setIsActive(data.link.is_active);
      } catch {
        setError("Network error");
      }
      setIsLoading(false);
    };

    fetchLink();
  }, [id]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl,
          slug,
          password: hasPassword ? newPassword || undefined : "",
          expiresAt: hasExpiration ? expiresAt : null,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update link");
        setIsSaving(false);
        return;
      }

      setLink(data.link);
      setSuccess("Link updated successfully");
      setNewPassword("");
    } catch {
      setError("Network error");
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/links/${id}`, { method: "DELETE" });
      router.push("/dashboard/links");
    } catch {
      setError("Failed to delete link");
    }
    setDeleteDialogOpen(false);
  };

  const copyToClipboard = async () => {
    if (!link) return;
    const baseUrl = window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/${link.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Link not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <LinkWrapper href={`/dashboard/links/${id}/analytics`}>
              View Analytics
            </LinkWrapper>
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Edit Link</CardTitle>
              <CardDescription>Update your short link settings</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isActive ? (
                <Badge variant="secondary">Disabled</Badge>
              ) : isExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 p-3 rounded-lg mb-4">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Short URL Preview */}
          <div className="p-4 bg-muted rounded-lg mb-6">
            <p className="text-xs text-muted-foreground mb-1">Short URL</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg">
                {baseUrl}/{slug}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={`${baseUrl}/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel>Destination URL</FieldLabel>
              <Input
                type="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel>Custom Slug</FieldLabel>
              <Input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">Enable Link</FieldLabel>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <p className="text-xs text-muted-foreground">
                Disabled links will show a disabled message when accessed
              </p>
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">Password Protection</FieldLabel>
                <Switch
                  checked={hasPassword}
                  onCheckedChange={setHasPassword}
                />
              </div>
              {hasPassword && (
                <Input
                  type="password"
                  placeholder={
                    link.password_hash
                      ? "Leave empty to keep current password"
                      : "Enter password"
                  }
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2"
                />
              )}
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">Expiration Date</FieldLabel>
                <Switch
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                />
              </div>
              {hasExpiration && (
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-2"
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </Field>
          </FieldGroup>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
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
    </div>
  );
}
