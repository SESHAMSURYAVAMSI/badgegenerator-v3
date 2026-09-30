import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export type ScanAttemptStatus =
  | "success"
  | "duplicate"
  | "invalid_qr"
  | "invalid_day"
  | "invalid_item"
  | "event_not_found";

export interface IScanAttempt {
  eventId?: mongoose.Types.ObjectId;

  attendeeId?: mongoose.Types.ObjectId;

  dayId?: string;
  dayName?: string;

  itemId?: string;
  itemName?: string;

  registrationNumber?: string;
  attendeeName?: string;

  qrValue?: string;

  status: ScanAttemptStatus;

  source: "public" | "admin";

  scannedAt: Date;
}

const ScanAttemptSchema =
  new Schema<IScanAttempt>(
    {
      eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        index: true,
      },

      attendeeId: {
        type: Schema.Types.ObjectId,
        ref: "Attendee",
        index: true,
      },

      dayId: {
        type: String,
        trim: true,
      },

      dayName: {
        type: String,
        trim: true,
      },

      itemId: {
        type: String,
        trim: true,
      },

      itemName: {
        type: String,
        trim: true,
      },

      registrationNumber: {
        type: String,
        trim: true,
        uppercase: true,
      },

      attendeeName: {
        type: String,
        trim: true,
      },

      qrValue: {
        type: String,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "success",
          "duplicate",
          "invalid_qr",
          "invalid_day",
          "invalid_item",
          "event_not_found",
        ],
        required: true,
        index: true,
      },

      source: {
        type: String,
        enum: ["public", "admin"],
        required: true,
        default: "public",
        index: true,
      },

      scannedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

ScanAttemptSchema.index({
  eventId: 1,
  scannedAt: -1,
});

ScanAttemptSchema.index({
  eventId: 1,
  status: 1,
  scannedAt: -1,
});

const ScanAttempt: Model<IScanAttempt> =
  mongoose.models.ScanAttempt ||
  mongoose.model<IScanAttempt>(
    "ScanAttempt",
    ScanAttemptSchema,
  );

export default ScanAttempt;