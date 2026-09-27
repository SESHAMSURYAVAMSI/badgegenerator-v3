import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export type AttendeeStatus =
  | "registered"
  | "checked-in"
  | "cancelled";

export interface IAttendee {
  eventId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  registrationNumber: string;
  category?: string;
  qrValue: string;
  status: AttendeeStatus;
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
      maxlength: 150,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 200,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },

    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    category: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    qrValue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: [
        "registered",
        "checked-in",
        "cancelled",
      ],
      default: "registered",
    },
  },
  {
    timestamps: true,
  },
);

AttendeeSchema.index({
  eventId: 1,
  createdAt: -1,
});

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
  qrValue: 1,
});

const Attendee: Model<IAttendee> =
  mongoose.models.Attendee ||
  mongoose.model<IAttendee>(
    "Attendee",
    AttendeeSchema,
  );

export default Attendee;