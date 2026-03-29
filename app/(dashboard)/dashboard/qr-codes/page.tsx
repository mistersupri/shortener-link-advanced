"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Link2 } from "lucide-react";
import type { Link } from "@/lib/types";

function QRCodesContent() {
  const searchParams = useSearchParams();
  const preselectedLinkId = searchParams.get("link");
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Fetch all links
    fetch("/api/links?limit=100")
      .then((res) => res.json())
      .then((data) => {
        setLinks(data.links || []);
        if (preselectedLinkId) {
          setSelectedLinkId(preselectedLinkId);
        }
      });
  }, [preselectedLinkId]);

  useEffect(() => {
    if (selectedLinkId) {
      generateQRCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLinkId]);

  const generateQRCode = async () => {
    if (!selectedLinkId) return;

    setIsLoading(true);
    try {
      const baseUrl = window.location.origin;
      const res = await fetch(
        `/api/links/${selectedLinkId}/qrcode?baseUrl=${encodeURIComponent(baseUrl)}`,
      );
      const data = await res.json();

      if (res.ok) {
        setShortUrl(data.shortUrl);
        // Add logo to QR code using canvas
        await addLogoToQRCode(data.qrCode);
      }
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
    setIsLoading(false);
  };

  const addLogoToQRCode = async (qrDataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load QR code
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";

    qrImage.onload = async () => {
      canvas.width = qrImage.width;
      canvas.height = qrImage.height;

      // Draw QR code
      ctx.drawImage(qrImage, 0, 0);

      // Load and draw logo
      const logoImage = new Image();
      logoImage.crossOrigin = "anonymous";

      logoImage.onload = () => {
        const logoSize = qrImage.width * 0.22;
        const logoX = (qrImage.width - logoSize) / 2;
        const logoY = (qrImage.height - logoSize) / 2;

        // Draw white background for logo
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          qrImage.width / 2,
          qrImage.height / 2,
          logoSize / 2 + 6,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Draw logo (clipped to circle)
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          qrImage.width / 2,
          qrImage.height / 2,
          logoSize / 2,
          0,
          Math.PI * 2,
        );
        ctx.clip();
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        ctx.restore();

        // Get final image
        setQrCode(canvas.toDataURL("image/png"));
      };

      logoImage.onerror = () => {
        // Fallback: draw text if logo fails
        const logoSize = qrImage.width * 0.25;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          qrImage.width / 2,
          qrImage.height / 2,
          logoSize / 2 + 6,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.fillStyle = "#3b82f6";
        ctx.font = `bold ${logoSize * 0.5}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("L", qrImage.width / 2, qrImage.height / 2);

        setQrCode(canvas.toDataURL("image/png"));
      };

      logoImage.src = "/logo.png";
    };

    qrImage.src = qrDataUrl;
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement("a");
    link.download = `qrcode-${selectedLinkId}.png`;
    link.href = qrCode;
    link.click();
  };

  const selectedLink = links.find((l) => l.id === selectedLinkId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QR Codes</h1>
        <p className="text-muted-foreground">
          Generate QR codes for your short links
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Link</CardTitle>
            <CardDescription>Choose a link to generate QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a link" />
              </SelectTrigger>
              <SelectContent>
                {links.map((link) => (
                  <SelectItem key={link.id} value={link.id}>
                    /{link.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLink && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Destination URL
                </p>
                <p className="text-sm truncate">{selectedLink.original_url}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              {shortUrl ? shortUrl : "Select a link to generate QR code"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">
                  Generating...
                </div>
              </div>
            ) : qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-[280px] h-[280px]"
                  />
                </div>
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Link2 className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a link to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for QR code processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default function QRCodesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <QRCodesContent />
    </Suspense>
  );
}
