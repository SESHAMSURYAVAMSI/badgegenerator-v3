import mongoose, {
  Schema,
  type Model,
} from "mongoose";

import type {
  BadgeFieldType,
  BadgeQrSource,
  BadgeTextAlign,
} from "@/types/badge";

interface BadgeFieldDocument {
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

export interface IBadgeConfig {
  eventId: mongoose.Types.ObjectId;

  width: number;
  height: number;

  backgroundColor: string;

  borderColor: string;
  borderWidth: number;
  borderRadius: number;

  backgroundImage: string;
  backgroundImageName: string;

  qrSource: BadgeQrSource;

  fields: BadgeFieldDocument[];

  createdAt: Date;
  updatedAt: Date;
}

const BadgeFieldSchema =
  new Schema<BadgeFieldDocument>(
    {
      id: {
        type: String,
        enum: [
          "name",
          "registrationNumber",
          "category",
          "qr",
        ],
        required: true,
      },

      label: {
        type: String,
        required: true,
      },

      enabled: {
        type: Boolean,
        default: true,
      },

      x: {
        type: Number,
        required: true,
        min: 0,
      },

      y: {
        type: Number,
        required: true,
        min: 0,
      },

      width: {
        type: Number,
        required: true,
        min: 1,
      },

      height: {
        type: Number,
        required: true,
        min: 1,
      },

      fontSize: {
        type: Number,
        required: true,
        min: 1,
      },

      fontWeight: {
        type: Number,
        required: true,
      },

      align: {
        type: String,
        enum: [
          "left",
          "center",
          "right",
        ],
        default: "center",
      },

      color: {
        type: String,
        required: true,
      },
    },
    {
      _id: false,
    },
  );

const BadgeConfigSchema =
  new Schema<IBadgeConfig>(
    {
      eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        unique: true,
        index: true,
      },

      width: {
        type: Number,
        required: true,
        min: 1,
      },

      height: {
        type: Number,
        required: true,
        min: 1,
      },

      backgroundColor: {
        type: String,
        default: "#ffffff",
      },

      borderColor: {
        type: String,
        default: "#EA580C",
      },

      borderWidth: {
        type: Number,
        default: 0,
        min: 0,
      },

      borderRadius: {
        type: Number,
        default: 0,
        min: 0,
      },

      backgroundImage: {
        type: String,
        default: "",
      },

      backgroundImageName: {
        type: String,
        default: "",
      },

      qrSource: {
        type: String,
        enum: [
          "registrationNumber",
          "qrValue",
        ],
        default:
          "registrationNumber",
      },

      fields: {
        type: [BadgeFieldSchema],
        required: true,
      },
    },
    {
      timestamps: true,
    },
  );

const BadgeConfig: Model<IBadgeConfig> =
  mongoose.models.BadgeConfig ||
  mongoose.model<IBadgeConfig>(
    "BadgeConfig",
    BadgeConfigSchema,
  );

export default BadgeConfig;