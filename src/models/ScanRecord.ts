import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export interface IScanRecord {
  eventId: mongoose.Types.ObjectId;
  attendeeId: mongoose.Types.ObjectId;

  dayId: string;
  dayName: string;

  itemId: string;
  itemName: string;

  registrationNumber: string;
  attendeeName: string;

  scannedAt: Date;

  scannedBy?: mongoose.Types.ObjectId;
}

const ScanRecordSchema =
  new Schema<IScanRecord>(
    {
      eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true,
      },

      attendeeId: {
        type: Schema.Types.ObjectId,
        ref: "Attendee",
        required: true,
        index: true,
      },

      dayId: {
        type: String,
        required: true,
        trim: true,
      },

      dayName: {
        type: String,
        required: true,
        trim: true,
      },

      itemId: {
        type: String,
        required: true,
        trim: true,
      },

      itemName: {
        type: String,
        required: true,
        trim: true,
      },

      registrationNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      attendeeName: {
        type: String,
        required: true,
        trim: true,
      },

      scannedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },

      scannedBy: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
      },
    },
    {
      timestamps: true,
    },
  );

/*
 * IMPORTANT
 *
 * One attendee can only be scanned once
 * for a particular event + day + item.
 *
 * Example:
 *
 * Event A
 *   Day 1
 *     Lunch
 *       Attendee 001  ← allowed once
 *
 * A second scan of the same attendee
 * for Day 1 + Lunch will be rejected.
 */
ScanRecordSchema.index(
  {
    eventId: 1,
    attendeeId: 1,
    dayId: 1,
    itemId: 1,
  },
  {
    unique: true,
  },
);

ScanRecordSchema.index({
  eventId: 1,
  dayId: 1,
  itemId: 1,
  scannedAt: -1,
});

const ScanRecord: Model<IScanRecord> =
  mongoose.models.ScanRecord ||
  mongoose.model<IScanRecord>(
    "ScanRecord",
    ScanRecordSchema,
  );

export default ScanRecord;