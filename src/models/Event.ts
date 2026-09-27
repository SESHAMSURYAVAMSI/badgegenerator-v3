import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export type EventStatus =
  | "draft"
  | "active"
  | "completed";

export interface IEvent {
  name: string;
  slug: string;
  code: string;

  publicId?: string;

  description?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;

  status: EventStatus;

  attendeeCount: number;
  badgeCount: number;

  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    publicId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "draft",
        "active",
        "completed",
      ],
      default: "draft",
    },

    attendeeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    badgeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

EventSchema.index({
  createdBy: 1,
  createdAt: -1,
});

EventSchema.index({
  publicId: 1,
});

const Event: Model<IEvent> =
  mongoose.models.Event ||
  mongoose.model<IEvent>(
    "Event",
    EventSchema,
  );

export default Event;