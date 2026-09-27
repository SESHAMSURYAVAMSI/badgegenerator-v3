export type BadgeFieldType =
  | "name"
  | "registrationNumber"
  | "category"
  | "qr";

export type BadgeTextAlign =
  | "left"
  | "center"
  | "right";

export type BadgeQrSource =
  | "registrationNumber"
  | "qrValue";

export interface BadgeFieldConfig {
  id: BadgeFieldType;

  label: string;

  enabled: boolean;

  x: number;
  y: number;

  width: number;
  height: number;

  fontSize: number;
  fontWeight: number;

  align: BadgeTextAlign;

  color: string;
}

export interface BadgeConfigData {
  width: number;
  height: number;

  backgroundColor: string;

  borderColor: string;
  borderWidth: number;
  borderRadius: number;

  backgroundImage: string;
  backgroundImageName: string;

  qrSource: BadgeQrSource;

  fields: BadgeFieldConfig[];
}

export interface BadgePreviewAttendee {
  name: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
}

export const DEFAULT_BADGE_CONFIG: BadgeConfigData = {
  width: 900,
  height: 1200,

  backgroundColor: "#ffffff",

  borderColor: "#EA580C",
  borderWidth: 0,
  borderRadius: 0,

  backgroundImage: "",
  backgroundImageName: "",

  qrSource: "registrationNumber",

  fields: [
    {
      id: "name",
      label: "Attendee Name",
      enabled: true,

      x: 90,
      y: 820,

      width: 720,
      height: 90,

      fontSize: 46,
      fontWeight: 700,

      align: "center",

      color: "#241000",
    },

    {
      id: "registrationNumber",
      label: "Registration Number",
      enabled: true,

      x: 120,
      y: 925,

      width: 660,
      height: 55,

      fontSize: 26,
      fontWeight: 600,

      align: "center",

      color: "#241000",
    },

    {
      id: "category",
      label: "Category",
      enabled: true,

      x: 150,
      y: 995,

      width: 600,
      height: 50,

      fontSize: 24,
      fontWeight: 600,

      align: "center",

      color: "#241000",
    },

    {
      id: "qr",
      label: "QR Code",
      enabled: true,

      x: 250,
      y: 350,

      width: 400,
      height: 400,

      fontSize: 20,
      fontWeight: 500,

      align: "center",

      color: "#241000",
    },
  ],
};