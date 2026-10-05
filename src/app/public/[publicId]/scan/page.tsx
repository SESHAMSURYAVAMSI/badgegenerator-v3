"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import jsQR from "jsqr";

import {
  Award,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Utensils,
  XCircle,
} from "lucide-react";

interface ScanItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  sortOrder: number;
}

interface ScanDay {
  id: string;
  name: string;
  date?: string;
  enabled: boolean;
  sortOrder: number;
  items: ScanItem[];
}

interface EventData {
  _id: string;
  id: string;
  name: string;
  publicId: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

interface ScanConfigResponse {
  success: boolean;
  data?: {
    eventId: string;
    days: ScanDay[];
  };
  message?: string;
}

interface ScanResponse {
  success: boolean;
  duplicate?: boolean;
  code?: string;
  message?: string;
  data?: {
    scanId?: string;

    attendee?: {
      id: string;
      name: string;
      email: string;
      registrationNumber: string;
      category?: string;
    };

    event?: {
      id: string;
      name: string;
    };

    day?: {
      id: string;
      name: string;
    };

    item?: {
      id: string;
      name: string;
    };

    scannedAt?: string;
  };
}

type ScanStep =
  | "event"
  | "day"
  | "item"
  | "scanner";

interface Props {
  params: Promise<{
    publicId: string;
  }>;
}

function getItemIcon(
  item: ScanItem,
) {
  const iconName =
    item.icon?.toLowerCase();

  if (
    iconName?.includes("coffee") ||
    item.id === "breakfast"
  ) {
    return Coffee;
  }

  if (
    iconName?.includes("utensil") ||
    item.id === "lunch" ||
    item.id === "dinner"
  ) {
    return Utensils;
  }

  if (
    iconName?.includes("award") ||
    item.id === "certificate"
  ) {
    return Award;
  }

  return Package;
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatScanTime(
  value?: string,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

export default function PublicScanPage({
  params,
}: Props) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const streamRef =
    useRef<MediaStream | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const scanningRef =
    useRef(false);

  const lastScannedValueRef =
    useRef("");

  const lastScanTimeRef =
    useRef(0);

  const [publicId, setPublicId] =
    useState("");

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [days, setDays] =
    useState<ScanDay[]>([]);

  const [selectedDay, setSelectedDay] =
    useState<ScanDay | null>(null);

  const [selectedItem, setSelectedItem] =
    useState<ScanItem | null>(null);

  const [step, setStep] =
    useState<ScanStep>("event");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [cameraError, setCameraError] =
    useState("");

  const [cameraReady, setCameraReady] =
    useState(false);

  const [processingScan, setProcessingScan] =
    useState(false);

  const processingScanRef =
    useRef(false);

  const [successResult, setSuccessResult] =
    useState<ScanResponse["data"] | null>(
      null,
    );

  const [duplicateResult, setDuplicateResult] =
    useState<ScanResponse["data"] | null>(
      null,
    );

  const [scanMessage, setScanMessage] =
    useState("");

  const [manualValue, setManualValue] =
    useState("");

  const [showManualInput, setShowManualInput] =
    useState(false);

  const stopCamera =
    useCallback(() => {
      scanningRef.current = false;

      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );

        animationFrameRef.current =
          null;
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop(),
          );

        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }

      setCameraReady(false);
    }, []);

  const resetScanFeedback =
    useCallback(() => {
      setSuccessResult(null);
      setDuplicateResult(null);
      setScanMessage("");
      setManualValue("");
    }, []);

  const loadPublicEvent =
    useCallback(
      async (
        currentPublicId: string,
      ) => {
        setLoading(true);
        setError("");

        try {
          /*
           * This endpoint is expected to return
           * the public event.
           *
           * If your existing public event API uses
           * another path, change only this URL.
           */
          const eventResponse =
            await fetch(
              `/api/public/events/${encodeURIComponent(
                currentPublicId,
              )}`,
              {
                cache: "no-store",
              },
            );

          if (!eventResponse.ok) {
            throw new Error(
              "Unable to load event",
            );
          }

          const eventJson =
            (await eventResponse.json()) as {
              success: boolean;
              data?: EventData;
              message?: string;
            };

          if (
            !eventJson.success ||
            !eventJson.data
          ) {
            throw new Error(
              eventJson.message ||
                "Event not found",
            );
          }

          setEvent(eventJson.data);

          /*
           * The public API gives us the event,
           * while scanning configuration is loaded
           * through the authenticated configuration
           * endpoint.
           *
           * Because the public scanner must work
           * without admin authentication, we load
           * the public configuration using the
           * publicId endpoint below.
           */
          const configResponse =
            await fetch(
              `/api/public/events/${encodeURIComponent(
                currentPublicId,
              )}/scanning/config`,
              {
                cache: "no-store",
              },
            );

          if (!configResponse.ok) {
            throw new Error(
              "Unable to load scanning configuration",
            );
          }

          const configJson =
            (await configResponse.json()) as ScanConfigResponse;

          if (
            !configJson.success ||
            !configJson.data
          ) {
            throw new Error(
              configJson.message ||
                "Scanning configuration not found",
            );
          }

          const enabledDays =
            configJson.data.days
              .filter(
                (day) => day.enabled,
              )
              .sort(
                (a, b) =>
                  a.sortOrder -
                  b.sortOrder,
              );

          setDays(enabledDays);
        } catch (loadError) {
          console.error(
            "Public scanning load error:",
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load event",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    let mounted = true;

    params.then(
      ({ publicId: resolvedPublicId }) => {
        if (!mounted) {
          return;
        }

        setPublicId(resolvedPublicId);

        void loadPublicEvent(
          resolvedPublicId,
        );
      },
    );

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [
    params,
    loadPublicEvent,
    stopCamera,
  ]);

  const submitScan =
    useCallback(
      async (qrValue: string) => {
        if (
          !selectedDay ||
          !selectedItem ||
          !publicId
        ) {
          return;
        }

        const cleanValue =
          qrValue.trim();

        if (!cleanValue) {
          return;
        }

        if (processingScanRef.current) {
          return;
        }

        processingScanRef.current = true;
        setProcessingScan(true);
        setScanMessage("");

        try {
          /*
           * Public scan endpoint.
           *
           * This endpoint should resolve the event
           * from publicId and then perform the scan.
           */
          const response =
            await fetch(
              `/api/public/events/${encodeURIComponent(
                publicId,
              )}/scanning/scan`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  qrValue:
                    cleanValue,
                  dayId:
                    selectedDay.id,
                  itemId:
                    selectedItem.id,
                }),
              },
            );

          const result =
            (await response.json()) as ScanResponse;

          if (
            result.success &&
            result.data
          ) {
            stopCamera();

            setSuccessResult(
              result.data,
            );

            setDuplicateResult(
              null,
            );

            setScanMessage(
              result.message ||
                "Scan successful",
            );

            /*
             * Prevent immediately reading
             * the same QR again.
             */
            lastScannedValueRef.current =
              cleanValue;

            lastScanTimeRef.current =
              Date.now();

            return;
          }

          if (
            result.duplicate &&
            result.data
          ) {
            stopCamera();

            setDuplicateResult(
              result.data ?? null,
            );

            setSuccessResult(
              null,
            );

            setScanMessage(
              result.message ||
                "Already scanned",
            );

            lastScannedValueRef.current =
              cleanValue;

            lastScanTimeRef.current =
              Date.now();

            return;
          }

          setSuccessResult(
            null,
          );

          setDuplicateResult(
            null,
          );

          setScanMessage(
            result.message ||
              "Unable to process scan",
          );
        } catch (scanError) {
          console.error(
            "Scan request error:",
            scanError,
          );

          setScanMessage(
            "Unable to connect to the scanning server.",
          );
        } finally {
          processingScanRef.current = false;
          setProcessingScan(false);
        }
      },
      [
        publicId,
        selectedDay,
        selectedItem,
        stopCamera,
      ],
    );

  const startCamera =
    useCallback(async () => {
      resetScanFeedback();

      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access is not supported by this browser. Please use a modern browser with camera access enabled.",
        );

        return;
      }

      try {
        stopCamera();

        let stream: MediaStream;

        try {
          stream =
            await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: {
                  ideal: "environment",
                },
                width: {
                  ideal: 1280,
                },
                height: {
                  ideal: 720,
                },
              },
              audio: false,
            });
        } catch (preferredCameraError) {
          const errorName =
            preferredCameraError instanceof DOMException
              ? preferredCameraError.name
              : "";

          if (
            errorName === "NotAllowedError" ||
            errorName === "SecurityError"
          ) {
            throw preferredCameraError;
          }

          console.warn(
            "Preferred camera constraints failed. Retrying with basic camera access.",
            preferredCameraError,
          );

          stream =
            await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
        }

        streamRef.current =
          stream;

        if (!videoRef.current) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop(),
            );

          streamRef.current =
            null;

          return;
        }

        const video =
          videoRef.current;

        video.setAttribute(
          "playsinline",
          "true",
        );

        video.setAttribute(
          "webkit-playsinline",
          "true",
        );

        video.muted = true;
        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          if (video.readyState >= 1) {
            resolve();
            return;
          }

          const handleLoadedMetadata = () => {
            video.removeEventListener(
              "loadedmetadata",
              handleLoadedMetadata,
            );
            resolve();
          };

          video.addEventListener(
            "loadedmetadata",
            handleLoadedMetadata,
            { once: true },
          );
        });

        await video.play();

        if (
          !video.videoWidth ||
          !video.videoHeight
        ) {
          throw new Error(
            "Camera opened but no video frames are available.",
          );
        }

        setCameraReady(true);

        const canvas =
          canvasRef.current ??
          document.createElement(
            "canvas",
          );

        canvasRef.current = canvas;

        const context =
          canvas.getContext("2d", {
            willReadFrequently: true,
          });

        if (!context) {
          throw new Error(
            "Unable to initialize the QR scanner.",
          );
        }

        scanningRef.current =
          true;

        const scanFrame =
          () => {
            if (
              !scanningRef.current ||
              !videoRef.current
            ) {
              return;
            }

            try {
              const currentVideo =
                videoRef.current;

              const sourceWidth =
                currentVideo.videoWidth;
              const sourceHeight =
                currentVideo.videoHeight;

              if (
                sourceWidth > 0 &&
                sourceHeight > 0
              ) {
                /*
                 * Keep the decode frame reasonably
                 * small so iPhones, iPads and desktop
                 * browsers do not spend excessive CPU
                 * time processing a 1080p/4K stream.
                 */
                const maxWidth = 960;
                const targetWidth =
                  Math.min(
                    sourceWidth,
                    maxWidth,
                  );
                const targetHeight =
                  Math.round(
                    (sourceHeight /
                      sourceWidth) *
                      targetWidth,
                  );

                if (
                  canvas.width !==
                    targetWidth ||
                  canvas.height !==
                    targetHeight
                ) {
                  canvas.width =
                    targetWidth;
                  canvas.height =
                    targetHeight;
                }

                context.drawImage(
                  currentVideo,
                  0,
                  0,
                  targetWidth,
                  targetHeight,
                );

                const imageData =
                  context.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight,
                  );

                const code =
                  jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height,
                    {
                      inversionAttempts:
                        "attemptBoth",
                    },
                  );

                const value =
                  code?.data?.trim();

                if (value) {
                  const now =
                    Date.now();

                  const isSameRecentValue =
                    lastScannedValueRef.current ===
                      value &&
                    now -
                      lastScanTimeRef.current <
                      3000;

                  if (
                    !isSameRecentValue &&
                    !processingScanRef.current
                  ) {
                    void submitScan(
                      value,
                    );
                  }
                }
              }
            } catch (scanError) {
              console.error(
                "QR frame processing error:",
                scanError,
              );
            }

            if (
              scanningRef.current
            ) {
              animationFrameRef.current =
                requestAnimationFrame(
                  scanFrame,
                );
            }
          };

        animationFrameRef.current =
          requestAnimationFrame(
            scanFrame,
          );
      } catch (cameraStartError) {
        console.error(
          "Camera start error:",
          cameraStartError,
        );

        setCameraReady(false);

        const errorName =
          cameraStartError instanceof DOMException
            ? cameraStartError.name
            : "";

        if (
          errorName === "NotAllowedError" ||
          errorName === "SecurityError"
        ) {
          setCameraError(
            "Camera permission was denied. Please allow camera access in your browser settings and try again.",
          );
        } else if (
          errorName === "NotFoundError"
        ) {
          setCameraError(
            "No camera was found on this device.",
          );
        } else if (
          errorName === "NotReadableError" ||
          errorName === "AbortError"
        ) {
          setCameraError(
            "The camera is already being used by another application. Close other camera apps or browser tabs and try again.",
          );
        } else {
          setCameraError(
            "The camera could not be opened. Please check your browser camera permissions and try again.",
          );
        }

        stopCamera();
      }
    }, [
      resetScanFeedback,
      stopCamera,
      submitScan,
    ]);

  useEffect(() => {
    if (
      step !== "scanner"
    ) {
      stopCamera();
      return;
    }

    void startCamera();

    return () => {
      stopCamera();
    };
  }, [
    step,
    startCamera,
    stopCamera,
  ]);

  const goToDaySelection =
    () => {
      resetScanFeedback();
      setSelectedDay(null);
      setSelectedItem(null);
      setStep("day");
    };

  const selectDay =
    (day: ScanDay) => {
      resetScanFeedback();
      setSelectedDay(day);
      setSelectedItem(null);
      setStep("item");
    };

  const selectItem =
    (item: ScanItem) => {
      resetScanFeedback();
      setSelectedItem(item);
      setStep("scanner");
    };

  const goBack =
    () => {
      resetScanFeedback();
      stopCamera();

      if (step === "scanner") {
        setStep("item");
        return;
      }

      if (step === "item") {
        setSelectedItem(null);
        setStep("day");
        return;
      }

      if (step === "day") {
        setSelectedDay(null);
        setStep("event");
      }
    };

  const handleNextScan =
    () => {
      resetScanFeedback();
      setShowManualInput(false);
      void startCamera();
    };

  const handleManualScan =
    async () => {
      if (!manualValue.trim()) {
        return;
      }

      await submitScan(
        manualValue.trim(),
      );

      setManualValue("");
    };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-[#241000]">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EA580C]/10">
              <Loader2 className="h-7 w-7 animate-spin text-[#EA580C]" />
            </div>

            <div>
              <h1 className="text-lg font-bold">
                Loading event
              </h1>

              <p className="mt-1 text-sm text-[#241000]/55">
                Preparing the scanning system...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-[#241000]">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-xl shadow-red-950/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>

            <h1 className="mt-5 text-2xl font-black">
              Unable to load event
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#241000]/60">
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                if (publicId) {
                  void loadPublicEvent(
                    publicId,
                  );
                }
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94b08]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-[#241000]">
      <div className="fixed inset-x-0 top-0 -z-0 h-72 bg-gradient-to-b from-[#EA580C]/10 to-transparent" />

      <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="relative z-10 flex items-center justify-between rounded-2xl border border-[#EA580C]/10 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EA580C] to-[#241000] text-white shadow-lg shadow-[#EA580C]/20">
              <ScanLine className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
                BadgeFlow
              </p>

              <h1 className="truncate text-sm font-black sm:text-base">
                {event?.name ||
                  "Event Scanner"}
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl bg-[#fff7f2] px-3 py-2 text-xs font-bold text-[#241000]/65 sm:flex">
            <ShieldCheck className="h-4 w-4 text-[#EA580C]" />
            Public Scanner
          </div>
        </header>

        <div className="relative z-10 mx-auto mt-5 max-w-4xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            {step !== "event" ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-xl border border-[#241000]/10 bg-white px-3 py-2 text-sm font-bold shadow-sm transition hover:border-[#EA580C]/30 hover:text-[#EA580C]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1.5">
              {[
                "event",
                "day",
                "item",
                "scanner",
              ].map(
                (
                  currentStep,
                  index,
                ) => {
                  const steps = [
                    "event",
                    "day",
                    "item",
                    "scanner",
                  ];

                  const currentIndex =
                    steps.indexOf(
                      step,
                    );

                  const active =
                    index <=
                    currentIndex;

                  return (
                    <div
                      key={
                        currentStep
                      }
                      className={`h-2 rounded-full transition-all ${
                        active
                          ? "w-8 bg-[#EA580C]"
                          : "w-2 bg-[#241000]/10"
                      }`}
                    />
                  );
                },
              )}
            </div>

            <div className="w-[72px]" />
          </div>

          {step === "event" && (
            <section className="overflow-hidden rounded-[2rem] border border-[#EA580C]/10 bg-white shadow-xl shadow-[#241000]/5">
              <div className="bg-gradient-to-br from-[#241000] via-[#4b1800] to-[#EA580C] px-6 py-10 text-white sm:px-10 sm:py-14">
                <div className="max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                    <ShieldCheck className="h-4 w-4" />
                    Event scanning
                  </div>

                  <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                    {event?.name}
                  </h2>

                  {event?.description && (
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                      {event.description}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {event?.location && (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}

                    {event?.startDate && (
                      <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                        {formatDate(
                          event.startDate,
                        )}
                        {event.endDate
                          ? ` – ${formatDate(
                              event.endDate,
                            )}`
                          : ""}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EA580C]">
                  Step 1
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Confirm event
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#241000]/55">
                  Continue to select the
                  event day and scanning
                  module.
                </p>

                <button
                  type="button"
                  onClick={
                    goToDaySelection
                  }
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08] sm:w-auto sm:min-w-64"
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </section>
          )}

          {step === "day" && (
            <section>
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EA580C]">
                  Step 2
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Select event day
                </h2>

                <p className="mt-2 text-sm text-[#241000]/55">
                  Choose the day for which
                  you want to record
                  distribution or attendance.
                </p>
              </div>

              {days.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                  <p className="font-bold text-amber-800">
                    No scanning days are
                    configured for this
                    event.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {days.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() =>
                        selectDay(
                          day,
                        )
                      }
                      className="group rounded-2xl border border-[#241000]/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#EA580C]/40 hover:shadow-xl hover:shadow-[#EA580C]/5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C]">
                          <span className="text-sm font-black">
                            {day.name.replace(
                              "Day ",
                              "D",
                            )}
                          </span>
                        </div>

                        <ChevronRight className="h-5 w-5 text-[#241000]/20 transition group-hover:text-[#EA580C]" />
                      </div>

                      <h3 className="mt-5 text-lg font-black">
                        {day.name}
                      </h3>

                      {day.date && (
                        <p className="mt-1 text-sm text-[#241000]/50">
                          {formatDate(
                            day.date,
                          )}
                        </p>
                      )}

                      <p className="mt-4 text-xs font-bold text-[#EA580C]">
                        {
                          day.items.filter(
                            (item) =>
                              item.enabled,
                          ).length
                        }{" "}
                        scanning modules
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === "item" &&
            selectedDay && (
              <section>
                <div className="mb-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EA580C]">
                    Step 3
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-black tracking-tight">
                      Select scanning module
                    </h2>

                    <span className="rounded-full bg-[#EA580C]/10 px-3 py-1 text-xs font-black text-[#EA580C]">
                      {selectedDay.name}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[#241000]/55">
                    Choose what you are
                    distributing or recording
                    before opening the camera.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedDay.items
                    .filter(
                      (item) =>
                        item.enabled,
                    )
                    .sort(
                      (a, b) =>
                        a.sortOrder -
                        b.sortOrder,
                    )
                    .map((item) => {
                      const Icon =
                        getItemIcon(
                          item,
                        );

                      return (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            selectItem(
                              item,
                            )
                          }
                          className="group rounded-2xl border border-[#241000]/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#EA580C]/40 hover:shadow-xl hover:shadow-[#EA580C]/5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C]">
                              <Icon className="h-6 w-6" />
                            </div>

                            <ChevronRight className="h-5 w-5 text-[#241000]/20 transition group-hover:text-[#EA580C]" />
                          </div>

                          <h3 className="mt-5 text-lg font-black">
                            {item.name}
                          </h3>

                          <p className="mt-1 min-h-10 text-sm leading-5 text-[#241000]/50">
                            {item.description ||
                              `Scan attendees for ${item.name}.`}
                          </p>

                          <div className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[#EA580C]">
                            <Camera className="h-4 w-4" />
                            Open scanner
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>
            )}

          {step === "scanner" &&
            selectedDay &&
            selectedItem && (
              <section>
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EA580C]">
                      Step 4
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                      Scan attendee
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-[#241000]/10">
                        {selectedDay.name}
                      </span>

                      <span className="rounded-full bg-[#EA580C]/10 px-3 py-1.5 text-xs font-black text-[#EA580C]">
                        {selectedItem.name}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetScanFeedback();
                      void startCamera();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#241000]/10 bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition hover:border-[#EA580C]/30 hover:text-[#EA580C]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restart camera
                  </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                  <div className="overflow-hidden rounded-[2rem] border border-[#241000]/10 bg-[#241000] shadow-2xl shadow-[#241000]/10">
                    <div className="relative aspect-[4/3] overflow-hidden sm:aspect-video">
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />

                      <video
                        ref={videoRef}
                        muted
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />

                      {!cameraReady &&
                        !cameraError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#241000] text-white">
                            <Loader2 className="h-9 w-9 animate-spin text-[#EA580C]" />

                            <p className="mt-4 text-sm font-bold text-white/70">
                              Opening camera...
                            </p>
                          </div>
                        )}

                      {cameraReady && (
                        <>
                          <div className="pointer-events-none absolute inset-0">
                            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:h-72 sm:w-72" />

                            <div className="absolute left-1/2 top-1/2 h-0.5 w-52 -translate-x-1/2 animate-pulse bg-[#EA580C] sm:w-64" />
                          </div>

                          <div className="absolute left-4 top-4 rounded-xl bg-black/50 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                            Camera ready
                          </div>
                        </>
                      )}

                      {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#241000] px-6 text-center text-white">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                            <Camera className="h-7 w-7 text-red-300" />
                          </div>

                          <h3 className="mt-4 text-lg font-black">
                            Camera unavailable
                          </h3>

                          <p className="mt-2 max-w-md text-sm leading-6 text-white/60">
                            {cameraError}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void startCamera()
                            }
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-black text-white"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Try camera again
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-white/10 bg-[#241000] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            cameraReady
                              ? "bg-emerald-400"
                              : "bg-white/30"
                          }`}
                        />

                        <p className="text-xs font-bold text-white/65">
                          {cameraReady
                            ? "Ready to scan attendee QR"
                            : "Camera not ready"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowManualInput(
                            (current) =>
                              !current,
                          )
                        }
                        className="text-xs font-bold text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white"
                      >
                        Enter QR manually
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {successResult ? (
                      <div className="rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-950/5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>

                        <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-emerald-600">
                          Scan successful
                        </p>

                        <h3 className="mt-2 text-2xl font-black">
                          {successResult
                            .attendee
                            ?.name}
                        </h3>

                        <div className="mt-4 rounded-xl bg-[#fffaf7] p-4">
                          <p className="text-xs font-bold text-[#241000]/45">
                            Registration
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {
                              successResult
                                .attendee
                                ?.registrationNumber
                            }
                          </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-[#fffaf7] p-4">
                          <p className="text-xs font-bold text-[#241000]/45">
                            Collected
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {
                              successResult
                                .item
                                ?.name
                            }
                          </p>
                        </div>

                        <p className="mt-4 text-xs font-semibold text-[#241000]/45">
                          {formatScanTime(
                            successResult.scannedAt,
                          )}
                        </p>

                        <button
                          type="button"
                          onClick={handleNextScan}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08]"
                        >
                          <ScanLine className="h-4 w-4" />
                          Ready for Next Scan
                        </button>
                      </div>
                    ) : duplicateResult ? (
                      <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-xl shadow-amber-950/5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                          <XCircle className="h-8 w-8 text-amber-600" />
                        </div>

                        <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-amber-600">
                          Already scanned
                        </p>

                        <h3 className="mt-2 text-2xl font-black">
                          {
                            duplicateResult
                              .attendee
                              ?.name
                          }
                        </h3>

                        <p className="mt-3 text-sm leading-6 text-[#241000]/55">
                          This attendee has
                          already been recorded
                          for{" "}
                          <strong>
                            {
                              duplicateResult
                                .item
                                ?.name
                            }
                          </strong>{" "}
                          on{" "}
                          <strong>
                            {
                              duplicateResult
                                .day
                                ?.name
                            }
                          </strong>
                          .
                        </p>

                        <div className="mt-5 rounded-xl bg-amber-50 p-4">
                          <p className="text-xs font-bold text-amber-700">
                            Previous scan
                          </p>

                          <p className="mt-1 text-sm font-black text-amber-900">
                            {formatScanTime(
                              duplicateResult.scannedAt,
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleNextScan}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08]"
                        >
                          <ScanLine className="h-4 w-4" />
                          Scan Next Person
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-[2rem] border border-[#EA580C]/10 bg-white p-6 shadow-xl shadow-[#241000]/5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C]">
                            <ScanLine className="h-6 w-6" />
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#EA580C]">
                              Active module
                            </p>

                            <h3 className="text-lg font-black">
                              {
                                selectedItem.name
                              }
                            </h3>
                          </div>
                        </div>

                        <div className="mt-6 rounded-2xl bg-[#fffaf7] p-5">
                          <p className="text-xs font-bold text-[#241000]/45">
                            Scanning
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {
                              selectedDay.name
                            }{" "}
                            •{" "}
                            {
                              selectedItem.name
                            }
                          </p>
                        </div>

                        <div className="mt-5 flex items-start gap-3">
                          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#EA580C]" />

                          <p className="text-sm leading-6 text-[#241000]/55">
                            Each attendee can be
                            recorded only once for
                            this module on this day.
                          </p>
                        </div>
                      </div>
                    )}

                    {scanMessage &&
                      !successResult &&
                      !duplicateResult && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                          {scanMessage}
                        </div>
                      )}

                    {showManualInput && (
                      <div className="rounded-2xl border border-[#241000]/10 bg-white p-5 shadow-sm">
                        <p className="text-sm font-black">
                          Manual QR value
                        </p>

                        <p className="mt-1 text-xs text-[#241000]/50">
                          Use this only if the camera
                          cannot read the badge.
                        </p>

                        <div className="mt-4 flex gap-2">
                          <input
                            value={
                              manualValue
                            }
                            onChange={(
                              event,
                            ) =>
                              setManualValue(
                                event
                                  .target
                                  .value,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                void handleManualScan();
                              }
                            }}
                            placeholder="Registration number / QR value"
                            className="min-w-0 flex-1 rounded-xl border border-[#241000]/10 bg-[#fffaf7] px-3 py-3 text-sm font-medium outline-none transition placeholder:text-[#241000]/30 focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/10"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              void handleManualScan()
                            }
                            disabled={
                              processingScan ||
                              !manualValue.trim()
                            }
                            className="rounded-xl bg-[#EA580C] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingScan ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Scan"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(successResult || duplicateResult) && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/70 px-4 py-6 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-6 shadow-2xl sm:p-8">
                      {successResult ? (
                        <>
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                          </div>

                          <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                            Scan Successful
                          </p>

                          <h3 className="mt-2 text-center text-3xl font-black text-[#241000]">
                            {successResult.attendee?.name || "Attendee"}
                          </h3>

                          <div className="mt-6 space-y-3">
                            <div className="rounded-xl bg-[#fffaf7] p-4">
                              <p className="text-xs font-bold text-[#241000]/45">Registration</p>
                              <p className="mt-1 text-sm font-black text-[#241000]">
                                {successResult.attendee?.registrationNumber || "—"}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-[#fffaf7] p-4">
                                <p className="text-xs font-bold text-[#241000]/45">Module</p>
                                <p className="mt-1 text-sm font-black text-[#241000]">
                                  {successResult.item?.name || "—"}
                                </p>
                              </div>

                              <div className="rounded-xl bg-[#fffaf7] p-4">
                                <p className="text-xs font-bold text-[#241000]/45">Day</p>
                                <p className="mt-1 text-sm font-black text-[#241000]">
                                  {successResult.day?.name || "—"}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-xl bg-emerald-50 p-4">
                              <p className="text-xs font-bold text-emerald-700">Scanned successfully at</p>
                              <p className="mt-1 text-lg font-black text-emerald-900">
                                {formatScanTime(successResult.scannedAt) || "—"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleNextScan}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08]"
                          >
                            <ScanLine className="h-5 w-5" />
                            Ready for Next Scan
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                            <XCircle className="h-9 w-9 text-amber-600" />
                          </div>

                          <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                            Already Scanned
                          </p>

                          <h3 className="mt-2 text-center text-3xl font-black text-[#241000]">
                            {duplicateResult?.attendee?.name || "Attendee"}
                          </h3>

                          <div className="mt-6 space-y-3">
                            <div className="rounded-xl bg-[#fffaf7] p-4">
                              <p className="text-xs font-bold text-[#241000]/45">Registration</p>
                              <p className="mt-1 text-sm font-black text-[#241000]">
                                {duplicateResult?.attendee?.registrationNumber || "—"}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-[#fffaf7] p-4">
                                <p className="text-xs font-bold text-[#241000]/45">Module</p>
                                <p className="mt-1 text-sm font-black text-[#241000]">
                                  {duplicateResult?.item?.name || "—"}
                                </p>
                              </div>

                              <div className="rounded-xl bg-[#fffaf7] p-4">
                                <p className="text-xs font-bold text-[#241000]/45">Day</p>
                                <p className="mt-1 text-sm font-black text-[#241000]">
                                  {duplicateResult?.day?.name || "—"}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-xl bg-amber-50 p-4">
                              <p className="text-xs font-bold text-amber-700">Already scanned at</p>
                              <p className="mt-1 text-lg font-black text-amber-900">
                                {formatScanTime(duplicateResult?.scannedAt) || "—"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleNextScan}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08]"
                          >
                            <ScanLine className="h-5 w-5" />
                            Scan Next Person
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
        </div>

        <footer className="relative z-10 mx-auto mt-8 max-w-4xl pb-6 text-center">
          <p className="text-[11px] font-semibold text-[#241000]/35">
            Powered by BadgeFlow • Secure
            event scanning
          </p>
        </footer>
      </div>
    </main>
  );
}