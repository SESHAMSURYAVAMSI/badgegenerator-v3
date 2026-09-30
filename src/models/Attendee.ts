import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export interface IAttendee {
  eventId: mongoose.Types.ObjectId;

  name: string;
  email: string;
  phone?: string;

  /*
   * Registration number is ALWAYS stored.
   *
   * The user does not have to provide it.
   * The API generates one automatically when
   * the input is empty.
   */
  registrationNumber: string;

  category: string;

  qrValue: string;

  badgeGenerated: boolean;
  badgeUrl: string;

  badgeGeneratedAt?: Date;
  badgeGenerationCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<IAttendee>(
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
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    qrValue: {
      type: String,
      default: "",
      trim: true,
    },

    badgeGenerated: {
      type: Boolean,
      default: false,
    },

    badgeUrl: {
      type: String,
      default: "",
      trim: true,
    },

    badgeGeneratedAt: {
      type: Date,
      default: undefined,
    },

    badgeGenerationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Registration number is unique ONLY
 * inside an individual event.
 *
 * Example:
 *
 * Event A + ACVS26-001 -> allowed
 * Event A + ACVS26-001 -> duplicate
 *
 * Event B + ACVS26-001 -> allowed
 * Event C + ACVS26-001 -> allowed
 */
AttendeeSchema.index(
  {
    eventId: 1,
    registrationNumber: 1,
  },
  {
    unique: true,
  },
);

AttendeeSchema.index({
  eventId: 1,
  createdAt: -1,
});

const Attendee: Model<IAttendee> =
  mongoose.models.Attendee ||
  mongoose.model<IAttendee>(
    "Attendee",
    AttendeeSchema,
  );

export default Attendee;