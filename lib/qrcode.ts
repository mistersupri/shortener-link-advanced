import QRCode from "qrcode";

export async function generateQRCodeWithLogo(
  url: string,
  logoUrl?: string,
): Promise<string> {
  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H", // High error correction to allow logo overlay
  });

  // If no logo, return plain QR code
  if (!logoUrl) {
    return qrDataUrl;
  }

  // For server-side, we'll return the QR code without logo overlay
  // The logo overlay will be done client-side using canvas
  return qrDataUrl;
}

export async function generateQRCodeSVG(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}
