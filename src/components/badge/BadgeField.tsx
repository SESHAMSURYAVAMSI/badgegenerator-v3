"use client";

import {
  PointerEvent,
} from "react";

import type {
  BadgeFieldConfig,
  BadgePreviewAttendee,
} from "@/types/badge";

interface BadgeFieldProps {
  field: BadgeFieldConfig;

  scale: number;

  selected: boolean;

  attendee: BadgePreviewAttendee;

  qrImage: string | null;

  onSelect: (
    field: BadgeFieldConfig,
  ) => void;

  onStartDrag: (
    event: PointerEvent<HTMLDivElement>,
    field: BadgeFieldConfig,
  ) => void;

  onStartResize: (
    event: PointerEvent<HTMLDivElement>,
    field: BadgeFieldConfig,
  ) => void;
}

function getText(
  field: BadgeFieldConfig,
  attendee: BadgePreviewAttendee,
): string {
  if (field.id === "name") {
    return (
      attendee.name ||
      "Attendee Name"
    );
  }

  if (
    field.id ===
    "registrationNumber"
  ) {
    return (
      attendee.registrationNumber ||
      "REG-2026-001"
    );
  }

  if (field.id === "category") {
    return (
      attendee.category ||
      "Delegate"
    );
  }

  return "";
}

export default function BadgeField({
  field,
  scale,
  selected,
  attendee,
  qrImage,
  onSelect,
  onStartDrag,
  onStartResize,
}: BadgeFieldProps) {
  if (!field.enabled) {
    return null;
  }

  const left =
    field.x * scale;

  const top =
    field.y * scale;

  const width =
    field.width * scale;

  const height =
    field.height * scale;

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    event.stopPropagation();

    onSelect(field);

    onStartDrag(
      event,
      field,
    );
  }

  if (field.id === "qr") {
    return (
      <div
        className="absolute touch-none"
        style={{
          left,
          top,
          width,
          height,

          cursor: "grab",
          zIndex: selected
            ? 30
            : 20,
        }}
        onPointerDown={
          handlePointerDown
        }
      >
        <div
          className={`relative h-full w-full ${
            selected
              ? "ring-2 ring-[#EA580C] ring-offset-1"
              : ""
          }`}
        >
          {qrImage ? (
            <div className="h-full w-full bg-white p-[2%]">
              <img
                src={qrImage}
                alt="Badge QR"
                className="block h-full w-full select-none"
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white text-xs font-bold text-stone-400">
              QR
            </div>
          )}

          {selected && (
            <>
              <FieldLabel
                text="QR Code"
              />

              <ResizeHandle
                onPointerDown={(
                  event,
                ) =>
                  onStartResize(
                    event,
                    field,
                  )
                }
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute touch-none"
      style={{
        left,
        top,
        width,
        height,

        cursor: "grab",
        zIndex: selected
          ? 30
          : 20,
      }}
      onPointerDown={
        handlePointerDown
      }
    >
      <div
        className={`relative flex h-full w-full items-center overflow-visible ${
          selected
            ? "ring-2 ring-[#EA580C] ring-offset-1"
            : ""
        }`}
        style={{
          color: field.color,

          fontSize:
            field.fontSize *
            scale,

          fontWeight:
            field.fontWeight,

          textAlign:
            field.align,

          justifyContent:
            field.align ===
            "left"
              ? "flex-start"
              : field.align ===
                  "right"
                ? "flex-end"
                : "center",

          lineHeight: 1.1,

          wordBreak:
            "break-word",
        }}
      >
        <span className="block w-full">
          {getText(
            field,
            attendee,
          )}
        </span>

        {selected && (
          <>
            <FieldLabel
              text={field.label}
            />

            <ResizeHandle
              onPointerDown={(
                event,
              ) =>
                onStartResize(
                  event,
                  field,
                )
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function FieldLabel({
  text,
}: {
  text: string;
}) {
  return (
    <div className="pointer-events-none absolute -top-7 left-0 rounded-md bg-[#EA580C] px-2 py-1 text-[9px] font-black text-white shadow-md">
      {text}
    </div>
  );
}

function ResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (
    event: PointerEvent<HTMLDivElement>,
  ) => void;
}) {
  return (
    <div
      className="absolute -bottom-1.5 -right-1.5 z-50 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-[#EA580C] shadow-md"
      onPointerDown={
        onPointerDown
      }
    />
  );
}