"use client";

import {
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import QRCode from "qrcode";

import BadgeField from "@/components/badge/BadgeField";

import type {
  BadgeConfigData,
  BadgeFieldConfig,
  BadgePreviewAttendee,
  BadgeFieldType,
} from "@/types/badge";

interface BadgePreviewProps {
  config: BadgeConfigData;

  attendee?: BadgePreviewAttendee;

  selectedField: BadgeFieldType | null;

  onSelectField: (
    fieldId: BadgeFieldType,
  ) => void;

  onUpdateField: (
    fieldId: BadgeFieldType,
    updates: Partial<BadgeFieldConfig>,
  ) => void;
}

interface Interaction {
  fieldId: BadgeFieldType;

  mode: "drag" | "resize";

  startPointerX: number;
  startPointerY: number;

  startX: number;
  startY: number;

  startWidth: number;
  startHeight: number;
}

const DEFAULT_ATTENDEE: BadgePreviewAttendee =
  {
    name: "Surya Vamsi",
    registrationNumber:
      "REG-2026-001",
    category: "Delegate",
    qrValue: "REG-2026-001",
  };

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

export default function BadgePreview({
  config,
  attendee,
  selectedField,
  onSelectField,
  onUpdateField,
}: BadgePreviewProps) {
  const [qrImage, setQrImage] =
    useState<string | null>(null);

  const interactionRef =
    useRef<Interaction | null>(
      null,
    );

  const previewAttendee =
    attendee ??
    DEFAULT_ATTENDEE;

  const previewWidth =
    Math.min(
      Math.max(config.width, 1),
      560,
    );

  const scale =
    config.width > 0
      ? previewWidth /
        config.width
      : 1;

  const previewHeight =
    Math.max(
      config.height,
      1,
    ) * scale;

  const qrValue =
    config.qrSource ===
    "qrValue"
      ? previewAttendee.qrValue ||
        previewAttendee.registrationNumber
      : previewAttendee.registrationNumber ||
        previewAttendee.qrValue;

  useEffect(() => {
    let cancelled = false;

    async function createQR() {
      try {
        const dataUrl =
          await QRCode.toDataURL(
            qrValue ||
              "PREVIEW-QR-001",
            {
              width: 800,
              margin: 1,
              errorCorrectionLevel:
                "H",
            },
          );

        if (!cancelled) {
          setQrImage(dataUrl);
        }
      } catch (error) {
        console.error(
          "QR generation failed:",
          error,
        );

        if (!cancelled) {
          setQrImage(null);
        }
      }
    }

    void createQR();

    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  useEffect(() => {
    function handleMove(
      event: globalThis.PointerEvent,
    ) {
      const current =
        interactionRef.current;

      if (!current) {
        return;
      }

      const deltaX =
        (event.clientX -
          current.startPointerX) /
        scale;

      const deltaY =
        (event.clientY -
          current.startPointerY) /
        scale;

      if (
        current.mode ===
        "drag"
      ) {
        const x = clamp(
          current.startX +
            deltaX,
          0,
          Math.max(
            0,
            config.width -
              current.startWidth,
          ),
        );

        const y = clamp(
          current.startY +
            deltaY,
          0,
          Math.max(
            0,
            config.height -
              current.startHeight,
          ),
        );

        onUpdateField(
          current.fieldId,
          {
            x,
            y,
          },
        );

        return;
      }

      if (
        current.fieldId ===
        "qr"
      ) {
        const delta =
          Math.max(
            deltaX,
            deltaY,
          );

        const maximum =
          Math.min(
            config.width -
              current.startX,
            config.height -
              current.startY,
          );

        const size = clamp(
          current.startWidth +
            delta,
          40,
          Math.max(
            40,
            maximum,
          ),
        );

        onUpdateField(
          current.fieldId,
          {
            width: size,
            height: size,
          },
        );

        return;
      }

      const width = clamp(
        current.startWidth +
          deltaX,
        20,
        Math.max(
          20,
          config.width -
            current.startX,
        ),
      );

      const height = clamp(
        current.startHeight +
          deltaY,
        20,
        Math.max(
          20,
          config.height -
            current.startY,
        ),
      );

      onUpdateField(
        current.fieldId,
        {
          width,
          height,
        },
      );
    }

    function handleUp() {
      interactionRef.current =
        null;
    }

    window.addEventListener(
      "pointermove",
      handleMove,
    );

    window.addEventListener(
      "pointerup",
      handleUp,
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handleMove,
      );

      window.removeEventListener(
        "pointerup",
        handleUp,
      );
    };
  }, [
    config,
    onUpdateField,
    scale,
  ]);

  function startDrag(
    event: PointerEvent<HTMLDivElement>,
    field: BadgeFieldConfig,
  ) {
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = {
      fieldId: field.id,
      mode: "drag",

      startPointerX:
        event.clientX,

      startPointerY:
        event.clientY,

      startX: field.x,
      startY: field.y,

      startWidth:
        field.width,

      startHeight:
        field.height,
    };
  }

  function startResize(
    event: PointerEvent<HTMLDivElement>,
    field: BadgeFieldConfig,
  ) {
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = {
      fieldId: field.id,
      mode: "resize",

      startPointerX:
        event.clientX,

      startPointerY:
        event.clientY,

      startX: field.x,
      startY: field.y,

      startWidth:
        field.width,

      startHeight:
        field.height,
    };
  }

  return (
    <div className="flex min-h-[620px] items-start justify-center overflow-auto rounded-3xl border border-stone-200 bg-stone-100 p-5 shadow-inner">
      <div
        className="relative shrink-0 overflow-hidden bg-white shadow-2xl"
        style={{
          width: previewWidth,
          height: previewHeight,

          borderRadius:
            config.borderRadius *
            scale,

          border:
            config.borderWidth >
            0
              ? `${Math.max(
                  1,
                  config.borderWidth *
                    scale,
                )}px solid ${
                  config.borderColor
                }`
              : "none",
        }}
        onPointerDown={() => {
          interactionRef.current =
            null;
        }}
      >
        {config.backgroundImage ? (
          <img
            src={
              config.backgroundImage
            }
            alt={
              config.backgroundImageName ||
              "Badge template"
            }
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor:
                config.backgroundColor,
            }}
          />
        )}

        {config.fields.map(
          (field) => (
            <BadgeField
              key={field.id}
              field={field}
              scale={scale}
              selected={
                selectedField ===
                field.id
              }
              attendee={
                previewAttendee
              }
              qrImage={qrImage}
              onSelect={() =>
                onSelectField(
                  field.id,
                )
              }
              onStartDrag={
                startDrag
              }
              onStartResize={
                startResize
              }
            />
          ),
        )}

        {config.backgroundImage && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2">
            <div className="rounded-full border border-white/60 bg-[#241000]/85 px-3 py-1.5 text-[9px] font-bold text-white shadow-lg backdrop-blur">
              Drag fields • Drag corner to resize
            </div>
          </div>
        )}
      </div>
    </div>
  );
}