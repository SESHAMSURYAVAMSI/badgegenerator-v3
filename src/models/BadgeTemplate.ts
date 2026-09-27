import mongoose, {
  Schema,
  type Model,
} from "mongoose";

import type {
  BadgeConfigData,
  BadgeFieldConfig,
  BadgeQrSource,
} from "@/types/badge";

export interface IBadgeTemplate {
  eventId: mongoose.Types.ObjectId;

  name: string;

  description: string;

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

  isActive: boolean;

  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

const BadgeFieldSchema =
  new Schema<BadgeFieldConfig>(
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
        trim: true,
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
        min: 100,
        max: 900,
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
        trim: true,
      },
    },
    {
      _id: false,
    },
  );

const BadgeTemplateSchema =
  new Schema<IBadgeTemplate>(
    {
      eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      description: {
        type: String,
        trim: true,
        default: "",
        maxlength: 500,
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
        trim: true,
      },

      borderColor: {
        type: String,
        default: "#EA580C",
        trim: true,
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
        required: true,
        default: "",
      },

      backgroundImageName: {
        type: String,
        default: "",
        trim: true,
      },

      qrSource: {
        type: String,
        enum: [
          "registrationNumber",
          "qrValue",
        ],
        default: "registrationNumber",
      },

      fields: {
        type: [BadgeFieldSchema],
        required: true,
        default: [],
      },

      isActive: {
        type: Boolean,
        default: false,
        index: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

BadgeTemplateSchema.index({
  eventId: 1,
  createdAt: -1,
});

BadgeTemplateSchema.index({
  eventId: 1,
  isActive: 1,
});

BadgeTemplateSchema.methods.toBadgeConfig =
  function (): BadgeConfigData {
    return {
      width: this.width,

      height: this.height,

      backgroundColor:
        this.backgroundColor,

      borderColor:
        this.borderColor,

      borderWidth:
        this.borderWidth,

      borderRadius:
        this.borderRadius,

      backgroundImage:
        this.backgroundImage,

      backgroundImageName:
        this.backgroundImageName,

      qrSource:
        this.qrSource,

      fields:
        this.fields.map(
          (field: BadgeFieldConfig) => ({
            id: field.id,
            label: field.label,
            enabled: field.enabled,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            fontSize: field.fontSize,
            fontWeight: field.fontWeight,
            align: field.align,
            color: field.color,
          }),
        ),
    };
  };

const BadgeTemplate: Model<IBadgeTemplate> =
  mongoose.models.BadgeTemplate ||
  mongoose.model<IBadgeTemplate>(
    "BadgeTemplate",
    BadgeTemplateSchema,
  );

export default BadgeTemplate;