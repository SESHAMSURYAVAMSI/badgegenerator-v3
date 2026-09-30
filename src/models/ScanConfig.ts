import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export interface IScanItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
}

export interface IScanDay {
  id: string;
  name: string;
  date?: string;
  enabled: boolean;
  sortOrder: number;
  items: IScanItem[];
}

export interface IScanConfig {
  eventId: mongoose.Types.ObjectId;
  days: IScanDay[];
  createdAt: Date;
  updatedAt: Date;
}

const ScanItemSchema =
  new Schema<IScanItem>(
    {
      id: {
        type: String,
        required: true,
        trim: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      icon: {
        type: String,
        default: "scan",
        trim: true,
      },

      enabled: {
        type: Boolean,
        default: true,
      },

      sortOrder: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    },
  );

const ScanDaySchema =
  new Schema<IScanDay>(
    {
      id: {
        type: String,
        required: true,
        trim: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      date: {
        type: String,
        default: "",
        trim: true,
      },

      enabled: {
        type: Boolean,
        default: true,
      },

      sortOrder: {
        type: Number,
        default: 0,
      },

      items: {
        type: [ScanItemSchema],
        default: [],
      },
    },
    {
      _id: false,
    },
  );

const ScanConfigSchema =
  new Schema<IScanConfig>(
    {
      eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        unique: true,
        index: true,
      },

      days: {
        type: [ScanDaySchema],
        default: [],
      },
    },
    {
      timestamps: true,
    },
  );

const ScanConfig: Model<IScanConfig> =
  mongoose.models.ScanConfig ||
  mongoose.model<IScanConfig>(
    "ScanConfig",
    ScanConfigSchema,
  );

export default ScanConfig;