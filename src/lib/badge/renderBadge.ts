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

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            "Failed to load badge background image.",
          ),
        );
      };

      image.src = source;
    },
  );
}

function getFieldText(
  field: BadgeFieldConfig,
  attendee: BadgePreviewAttendee,
): string {
  switch (field.id) {
    case "name":
      return attendee.name || "Attendee";

    case "registrationNumber":
      return (
        attendee.registrationNumber ||
        ""
      );

    case "category":
      return attendee.category || "";

    default:
      return "";
  }
}

function getFontWeight(
  fontWeight: number,
): number {
  if (!Number.isFinite(fontWeight)) {
    return 400;
  }

  return Math.min(
    Math.max(fontWeight, 100),
    900,
  );
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) {
    return [""];
  }

  const explicitLines =
    text.split(/\r?\n/);

  const lines: string[] = [];

  for (const explicitLine of explicitLines) {
    const words =
      explicitLine.split(/\s+/);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of words) {
      const testLine =
        currentLine.length > 0
          ? `${currentLine} ${word}`
          : word;

      const measuredWidth =
        context.measureText(
          testLine,
        ).width;

      if (
        measuredWidth <= maxWidth ||
        currentLine.length === 0
      ) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0
    ? lines
    : [""];
}

function drawTextField(
  context: CanvasRenderingContext2D,
  field: BadgeFieldConfig,
  attendee: BadgePreviewAttendee,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
) {
  if (!field.enabled) {
    return;
  }

  const text = getFieldText(
    field,
    attendee,
  );

  if (!text) {
    return;
  }

  const x = Math.max(
    0,
    Math.min(
      field.x,
      canvasWidth / scale,
    ),
  );

  const y = Math.max(
    0,
    Math.min(
      field.y,
      canvasHeight / scale,
    ),
  );

  const width = Math.max(
    1,
    Math.min(
      field.width,
      canvasWidth / scale - x,
    ),
  );

  const height = Math.max(
    1,
    Math.min(
      field.height,
      canvasHeight / scale - y,
    ),
  );

  const fontSize = Math.max(
    1,
    field.fontSize,
  );

  const fontWeight =
    getFontWeight(
      field.fontWeight,
    );

  context.save();

  context.font = `${fontWeight} ${fontSize * scale}px Arial, sans-serif`;

  context.fillStyle =
    field.color || "#241000";

  context.textBaseline =
    "middle";

  if (field.align === "left") {
    context.textAlign = "left";
  } else if (
    field.align === "right"
  ) {
    context.textAlign = "right";
  } else {
    context.textAlign = "center";
  }

  let textX = x * scale;

  if (field.align === "center") {
    textX =
      (x + width / 2) * scale;
  } else if (
    field.align === "right"
  ) {
    textX =
      (x + width) * scale;
  }

  const lines = wrapText(
    context,
    text,
    Math.max(
      1,
      (width - fontSize * 0.25) *
        scale,
    ),
  );

  const lineHeight =
    fontSize * 1.15 * scale;

  const totalHeight =
    lines.length * lineHeight;

  let startY =
    (y + height / 2) * scale -
    totalHeight / 2 +
    lineHeight / 2;

  const maximumLines =
    Math.max(
      1,
      Math.floor(
        (height * scale) /
          lineHeight,
      ),
    );

  const visibleLines =
    lines.slice(
      0,
      maximumLines,
    );

  for (const line of visibleLines) {
    context.fillText(
      line,
      textX,
      startY,
    );

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
) {
  if (!field.enabled) {
    return;
  }

  const x = Math.max(
    0,
    Math.min(
      field.x,
      canvasWidth / scale,
    ),
  );

  const y = Math.max(
    0,
    Math.min(
      field.y,
      canvasHeight / scale,
    ),
  );

  const width = Math.max(
    1,
    Math.min(
      field.width,
      canvasWidth / scale - x,
    ),
  );

  const height = Math.max(
    1,
    Math.min(
      field.height,
      canvasHeight / scale - y,
    ),
  );

  const size = Math.min(
    width,
    height,
  );

  /*
   * Generate the QR directly at the
   * final high-resolution size.
   *
   * This prevents the QR from becoming
   * blurry when the final badge is zoomed.
   */
  const qrPixelSize = Math.max(
    512,
    Math.round(
      size * scale,
    ),
  );

  const qrDataUrl =
    await QRCode.toDataURL(
      qrValue ||
        attendee.registrationNumber ||
        "BADGE",
      {
        width: qrPixelSize,
        margin: 1,
        errorCorrectionLevel:
          "H",
      },
    );

  const qrImage =
    await loadImage(
      qrDataUrl,
    );

  const qrX =
    (x + (width - size) / 2) *
    scale;

  const qrY =
    (y + (height - size) / 2) *
    scale;

  const qrSize =
    size * scale;

  context.imageSmoothingEnabled =
    false;

  context.drawImage(
    qrImage,
    Math.round(qrX),
    Math.round(qrY),
    Math.round(qrSize),
    Math.round(qrSize),
  );

  context.imageSmoothingEnabled =
    true;
}

export async function renderBadgeToCanvas({
  config,
  attendee,
  scale = 3,
}: RenderBadgeOptions): Promise<HTMLCanvasElement> {
  if (
    typeof window ===
    "undefined"
  ) {
    throw new Error(
      "Badge rendering is only available in the browser.",
    );
  }

  /*
   * The design dimensions remain unchanged.
   *
   * The canvas itself is rendered at a higher
   * pixel density.
   *
   * Example:
   *
   * 900 × 1200 design
   *        ↓ 3×
   * 2700 × 3600 output
   */
  const designWidth =
    Math.max(
      1,
      Math.round(config.width),
    );

  const designHeight =
    Math.max(
      1,
      Math.round(config.height),
    );

  const renderScale = Math.max(
    1,
    Math.min(
      Math.round(scale),
      4,
    ),
  );

  const outputWidth =
    designWidth * renderScale;

  const outputHeight =
    designHeight * renderScale;

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width =
    outputWidth;

  canvas.height =
    outputHeight;

  const context =
    canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

  if (!context) {
    throw new Error(
      "Could not create badge canvas.",
    );
  }

  /*
   * Start with a clean background.
   */
  context.fillStyle =
    config.backgroundColor ||
    "#ffffff";

  context.fillRect(
    0,
    0,
    outputWidth,
    outputHeight,
  );

  /*
   * Draw the uploaded badge artwork.
   *
   * The artwork is stretched only to the
   * configured badge dimensions. It is never
   * replaced or recreated.
   */
  if (config.backgroundImage) {
    const backgroundImage =
      await loadImage(
        config.backgroundImage,
      );

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      backgroundImage,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  }

  /*
   * Render all text fields.
   */
  for (const field of config.fields) {
    if (!field.enabled) {
      continue;
    }

    if (field.id === "qr") {
      continue;
    }

    drawTextField(
      context,
      field,
      attendee,
      outputWidth,
      outputHeight,
      renderScale,
    );
  }

  /*
   * Render QR separately so it can be
   * generated at high resolution.
   */
  const qrField =
    config.fields.find(
      (field) =>
        field.id === "qr",
    );

  if (qrField) {
    const qrValue =
      config.qrSource ===
      "qrValue"
        ? attendee.qrValue ||
          attendee.registrationNumber
        : attendee.registrationNumber ||
          attendee.qrValue;

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
  const canvas =
    await renderBadgeToCanvas(
      options,
    );

  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Failed to create high-resolution PNG.",
              ),
            );
            return;
          }

          resolve(blob);
        },
        "image/png",
        1,
      );
    },
  );
}