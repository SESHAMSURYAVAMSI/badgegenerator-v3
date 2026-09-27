"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Move,
  QrCode,
  Ruler,
  Type,
} from "lucide-react";

import type {
  BadgeFieldConfig,
  BadgeFieldType,
  BadgeQrSource,
} from "@/types/badge";

interface BadgeFieldSettingsProps {
  field: BadgeFieldConfig | null;
  qrSource: BadgeQrSource;
  onQrSourceChange: (
    qrSource: BadgeQrSource,
  ) => void;
  onUpdateField: (
    fieldId: BadgeFieldType,
    updates: Partial<BadgeFieldConfig>,
  ) => void;
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-stone-500">
        {label}
      </span>

      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => {
          const nextValue =
            Number(event.target.value);

          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-[#241000] outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
      />
    </label>
  );
}

export default function BadgeFieldSettings({
  field,
  qrSource,
  onQrSourceChange,
  onUpdateField,
}: BadgeFieldSettingsProps) {
  if (!field) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Move className="mb-3 h-8 w-8 text-orange-300" />

          <h3 className="text-sm font-black text-[#241000]">
            Select a field
          </h3>

          <p className="mt-1 max-w-[220px] text-xs leading-5 text-stone-500">
            Click a field on the badge preview
            to edit its position, size and
            appearance.
          </p>
        </div>
      </div>
    );
  }

  const update = (
    updates: Partial<BadgeFieldConfig>,
  ) => {
    onUpdateField(
      field.id,
      updates,
    );
  };

  const isQr = field.id === "qr";

  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
            {isQr ? (
              <QrCode className="h-5 w-5" />
            ) : (
              <Type className="h-5 w-5" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-black text-[#241000]">
              {field.label}
            </h3>

            <p className="text-[11px] text-stone-500">
              Field settings
            </p>
          </div>
        </div>
      </div>

      {isQr && (
        <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#EA580C]" />

            <span className="text-xs font-black text-[#241000]">
              QR value
            </span>
          </div>

          <select
            value={qrSource}
            onChange={(event) =>
              onQrSourceChange(
                event.target
                  .value as BadgeQrSource,
              )
            }
            className="w-full appearance-none rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-xs font-bold text-[#241000] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="registrationNumber">
              Registration Number
            </option>

            <option value="qrValue">
              QR Value
            </option>
          </select>
        </div>
      )}

      <div className="mb-5">
        <div className="mb-3 flex items-center gap-2">
          <Move className="h-4 w-4 text-[#EA580C]" />

          <h4 className="text-xs font-black text-[#241000]">
            Position
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="X"
            value={field.x}
            onChange={(value) =>
              update({ x: value })
            }
          />

          <NumberInput
            label="Y"
            value={field.y}
            onChange={(value) =>
              update({ y: value })
            }
          />
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-[#EA580C]" />

          <h4 className="text-xs font-black text-[#241000]">
            Size
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Width"
            min={1}
            value={field.width}
            onChange={(value) =>
              update({
                width: Math.max(
                  1,
                  value,
                ),
              })
            }
          />

          <NumberInput
            label="Height"
            min={1}
            value={field.height}
            onChange={(value) =>
              update({
                height: Math.max(
                  1,
                  value,
                ),
              })
            }
          />
        </div>
      </div>

      {!isQr && (
        <>
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <Type className="h-4 w-4 text-[#EA580C]" />

              <h4 className="text-xs font-black text-[#241000]">
                Typography
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Font Size"
                min={1}
                value={field.fontSize}
                onChange={(value) =>
                  update({
                    fontSize:
                      Math.max(
                        1,
                        value,
                      ),
                  })
                }
              />

              <NumberInput
                label="Weight"
                min={100}
                step={100}
                value={
                  field.fontWeight
                }
                onChange={(value) =>
                  update({
                    fontWeight:
                      Math.max(
                        100,
                        value,
                      ),
                  })
                }
              />
            </div>
          </div>

          <div className="mb-5">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-stone-500">
              Alignment
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  update({
                    align: "left",
                  })
                }
                className={`flex items-center justify-center rounded-xl border py-2.5 transition ${
                  field.align ===
                  "left"
                    ? "border-orange-300 bg-orange-50 text-[#EA580C]"
                    : "border-stone-200 text-stone-500 hover:border-orange-200"
                }`}
              >
                <AlignLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  update({
                    align: "center",
                  })
                }
                className={`flex items-center justify-center rounded-xl border py-2.5 transition ${
                  field.align ===
                  "center"
                    ? "border-orange-300 bg-orange-50 text-[#EA580C]"
                    : "border-stone-200 text-stone-500 hover:border-orange-200"
                }`}
              >
                <AlignCenter className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  update({
                    align: "right",
                  })
                }
                className={`flex items-center justify-center rounded-xl border py-2.5 transition ${
                  field.align ===
                  "right"
                    ? "border-orange-300 bg-orange-50 text-[#EA580C]"
                    : "border-stone-200 text-stone-500 hover:border-orange-200"
                }`}
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-stone-500">
              Text color
            </span>

            <div className="flex gap-2">
              <input
                type="color"
                value={
                  field.color
                }
                onChange={(event) =>
                  update({
                    color:
                      event.target
                        .value,
                  })
                }
                className="h-11 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
              />

              <input
                type="text"
                value={
                  field.color
                }
                onChange={(event) =>
                  update({
                    color:
                      event.target
                        .value,
                  })
                }
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-semibold uppercase text-[#241000] outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </label>
        </>
      )}
    </div>
  );
}