import QRCode from "qrcode";

import type {
  BadgeConfigData,
  BadgeFieldConfig,
  BadgePreviewAttendee,
} from "@/types/badge";

interface RenderBadgeOptions {
  config: BadgeConfigData;
  attendee: BadgePreviewAttendee;
  scale?: number;
}

// Reuse the same loaded background image for every badge.
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(source: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(source);
  if (cached) return cached;

  const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => {
      imageCache.delete(source);
      reject(new Error("Failed to load badge background image."));
    };

    image.src = source;
  });

  imageCache.set(source, imagePromise);
  return imagePromise;
}

function getFieldText(
  field: BadgeFieldConfig,
  attendee: BadgePreviewAttendee,
): string {
  switch (field.id) {
    case "name":
      return attendee.name || "Attendee";
    case "registrationNumber":
      return attendee.registrationNumber || "";
    case "medicalCouncilNumber":
      return attendee.medicalCouncilNumber || "";
    case "category":
      return attendee.category || "";
    default:
      return "";
  }
}

function getFontWeight(fontWeight: number): number {
  if (!Number.isFinite(fontWeight)) return 400;
  return Math.min(Math.max(fontWeight, 100), 900);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [""];

  const lines: string[] = [];

  for (const explicitLine of text.split(/\r?\n/)) {
    const words = explicitLine.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine
        ? `${currentLine} ${word}`
        : word;

      if (
        context.measureText(testLine).width <= maxWidth ||
        !currentLine
      ) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function drawTextField(
  context: CanvasRenderingContext2D,
  field: BadgeFieldConfig,
  attendee: BadgePreviewAttendee,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
): void {
  if (!field.enabled) return;

  const text = getFieldText(field, attendee);
  if (!text) return;

  const designWidth = canvasWidth / scale;
  const designHeight = canvasHeight / scale;

  const x = Math.max(0, Math.min(field.x, designWidth));
  const y = Math.max(0, Math.min(field.y, designHeight));
  const width = Math.max(1, Math.min(field.width, designWidth - x));
  const height = Math.max(1, Math.min(field.height, designHeight - y));

  const fontSize = Math.max(1, field.fontSize);
  const fontWeight = getFontWeight(field.fontWeight);

  context.save();

  context.font = `${fontWeight} ${fontSize * scale}px Arial, sans-serif`;
  context.fillStyle = field.color || "#241000";
  context.textBaseline = "middle";

  if (field.align === "left") {
    context.textAlign = "left";
  } else if (field.align === "right") {
    context.textAlign = "right";
  } else {
    context.textAlign = "center";
  }

  let textX = x * scale;

  if (field.align === "center") {
    textX = (x + width / 2) * scale;
  } else if (field.align === "right") {
    textX = (x + width) * scale;
  }

  const lines = wrapText(
    context,
    text,
    Math.max(1, (width - fontSize * 0.25) * scale),
  );

  const lineHeight = fontSize * 1.15 * scale;
  const maximumLines = Math.max(
    1,
    Math.floor((height * scale) / lineHeight),
  );

  const visibleLines = lines.slice(0, maximumLines);

  let startY =
    (y + height / 2) * scale -
    (visibleLines.length * lineHeight) / 2 +
    lineHeight / 2;

  for (const line of visibleLines) {
    context.fillText(line, textX, startY);
    startY += lineHeight;
  }

  context.restore();
}

async function drawQrField(
  context: CanvasRenderingContext2D,
  field: BadgeFieldConfig,
  attendee: BadgePreviewAttendee,
  qrValue: string,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
): Promise<void> {
  if (!field.enabled) return;

  const designWidth = canvasWidth / scale;
  const designHeight = canvasHeight / scale;

  const x = Math.max(0, Math.min(field.x, designWidth));
  const y = Math.max(0, Math.min(field.y, designHeight));
  const width = Math.max(1, Math.min(field.width, designWidth - x));
  const height = Math.max(1, Math.min(field.height, designHeight - y));

  const size = Math.min(width, height);
  const qrPixelSize = Math.max(1, Math.round(size * scale));

  const qrCanvas = document.createElement("canvas");

  await QRCode.toCanvas(
    qrCanvas,
    qrValue || attendee.registrationNumber || "BADGE",
    {
      width: qrPixelSize,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    },
  );

  const qrX = (x + (width - size) / 2) * scale;
  const qrY = (y + (height - size) / 2) * scale;

  context.save();
  context.imageSmoothingEnabled = false;

  context.drawImage(
    qrCanvas,
    Math.round(qrX),
    Math.round(qrY),
    Math.round(size * scale),
    Math.round(size * scale),
  );

  context.restore();

  // Release the temporary QR canvas backing store.
  qrCanvas.width = 0;
  qrCanvas.height = 0;
}

export async function renderBadgeToCanvas({
  config,
  attendee,
  scale = 3,
}: RenderBadgeOptions): Promise<HTMLCanvasElement> {
  if (typeof window === "undefined") {
    throw new Error("Badge rendering is only available in the browser.");
  }

  const designWidth = Math.max(1, Math.round(config.width));
  const designHeight = Math.max(1, Math.round(config.height));
  const renderScale = Math.max(1, Math.min(Math.round(scale), 4));

  const outputWidth = designWidth * renderScale;
  const outputHeight = designHeight * renderScale;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });

  if (!context) {
    throw new Error("Could not create badge canvas.");
  }

  context.fillStyle = config.backgroundColor || "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);

  if (config.backgroundImage) {
    const backgroundImage = await loadImage(config.backgroundImage);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      backgroundImage,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  }

  for (const field of config.fields) {
    if (!field.enabled || field.id === "qr") continue;

    drawTextField(
      context,
      field,
      attendee,
      outputWidth,
      outputHeight,
      renderScale,
    );
  }

  const qrField = config.fields.find((field) => field.id === "qr");

  if (qrField?.enabled) {
    const qrValue =
      config.qrSource === "qrValue"
        ? attendee.qrValue || attendee.registrationNumber
        : attendee.registrationNumber || attendee.qrValue;

    await drawQrField(
      context,
      qrField,
      attendee,
      qrValue,
      outputWidth,
      outputHeight,
      renderScale,
    );
  }

  return canvas;
}

export async function renderBadgeToPngBlob(
  options: RenderBadgeOptions,
): Promise<Blob> {
  const canvas = await renderBadgeToCanvas(options);

  try {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create high-resolution PNG."));
            return;
          }

          resolve(blob);
        },
        "image/png",
      );
    });
  } finally {
    // Release the canvas backing store after encoding.
    canvas.width = 0;
    canvas.height = 0;
  }
}