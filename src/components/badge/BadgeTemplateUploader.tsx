"use client";

import {
  ChangeEvent,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

interface BadgeTemplateUploaderProps {
  image: string;

  imageName: string;

  width: number;

  height: number;

  onUpload: (
    image: string,
    imageName: string,
    width: number,
    height: number,
  ) => void;

  onRemove: () => void;
}

export default function BadgeTemplateUploader({
  image,
  imageName,
  width,
  height,
  onUpload,
  onRemove,
}: BadgeTemplateUploaderProps) {
  const [loading, setLoading] =
    useState(false);

  async function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setLoading(true);

      if (
        !file.type.startsWith(
          "image/",
        )
      ) {
        throw new Error(
          "Please select an image file.",
        );
      }

      if (
        file.size >
        3 * 1024 * 1024
      ) {
        throw new Error(
          "Please use an image smaller than 3 MB.",
        );
      }

      const dataUrl =
        await readFile(file);

      const dimensions =
        await readDimensions(
          dataUrl,
        );

      onUpload(
        dataUrl,
        file.name,
        dimensions.width,
        dimensions.height,
      );
    } catch (error) {
      console.error(
        "Badge template upload error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
            Step 01
          </p>

          <h2 className="mt-1 text-base font-black text-[#241000]">
            Badge Template
          </h2>

          <p className="mt-1 text-xs leading-5 text-stone-500">
            Upload the exact badge artwork.
            It will remain unchanged.
          </p>
        </div>

        <div className="rounded-xl bg-orange-50 p-2.5">
          <ImagePlus className="h-4 w-4 text-[#EA580C]" />
        </div>
      </div>

      {!image ? (
        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 px-4 py-10 text-center transition hover:border-[#EA580C] hover:bg-orange-50">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#EA580C]" />
            ) : (
              <Upload className="h-5 w-5 text-[#EA580C]" />
            )}
          </div>

          <p className="text-sm font-bold text-stone-800">
            Upload badge image
          </p>

          <p className="mt-1 text-[11px] text-stone-500">
            PNG, JPG, JPEG or WEBP
          </p>

          <p className="mt-1 text-[10px] text-stone-400">
            Maximum 3 MB
          </p>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleChange}
            disabled={loading}
          />
        </label>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-stone-50">
          <div className="relative flex max-h-[360px] items-center justify-center bg-stone-100 p-3">
            <img
              src={image}
              alt={
                imageName ||
                "Badge template"
              }
              className="max-h-[330px] max-w-full object-contain shadow-lg"
            />
          </div>

          <div className="border-t border-orange-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-stone-800">
                  {imageName ||
                    "Badge template"}
                </p>

                <p className="mt-1 text-[10px] text-stone-500">
                  {width} × {height}px
                </p>
              </div>

              <button
                type="button"
                onClick={onRemove}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function readFile(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result !==
          "string"
        ) {
          reject(
            new Error(
              "Unable to read image.",
            ),
          );

          return;
        }

        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read image.",
          ),
        );
      };

      reader.readAsDataURL(file);
    },
  );
}

function readDimensions(
  src: string,
): Promise<{
  width: number;
  height: number;
}> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        resolve({
          width:
            image.naturalWidth,
          height:
            image.naturalHeight,
        });
      };

      image.onerror = () => {
        reject(
          new Error(
            "Unable to read image dimensions.",
          ),
        );
      };

      image.src = src;
    },
  );
}