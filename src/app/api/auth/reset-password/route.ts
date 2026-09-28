import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");
    const resetKey = String(body.resetKey || "");

    console.log("🔐 Password reset request");
    console.log("📧 Email:", email);
    console.log(
      "🔑 Recovery key received:",
      Boolean(resetKey),
    );

    if (!email || !password || !resetKey) {
      return NextResponse.json(
        {
          message:
            "Email, recovery key and new password are required.",
        },
        { status: 400 },
      );
    }

    const configuredResetKey =
      process.env.ADMIN_RESET_KEY;

    if (!configuredResetKey) {
      console.error(
        "❌ ADMIN_RESET_KEY is missing from environment variables.",
      );

      return NextResponse.json(
        {
          message:
            "Server recovery configuration is missing.",
        },
        { status: 500 },
      );
    }

    if (resetKey !== configuredResetKey) {
      console.error(
        "❌ Invalid administrator recovery key.",
      );

      return NextResponse.json(
        {
          message:
            "Invalid administrator recovery key.",
        },
        { status: 403 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters long.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const admin = await Admin.findOne({
      email,
      isActive: true,
    }).select("+password");

    if (!admin) {
      console.error(
        "❌ No active admin found for email:",
        email,
      );

      return NextResponse.json(
        {
          message:
            "No active administrator account was found with this email address.",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12,
    );

    admin.password = hashedPassword;

    await admin.save();

    console.log(
      "✅ Administrator password updated successfully.",
    );

    return NextResponse.json(
      {
        message:
          "Administrator password reset successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "❌ Password reset error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Something went wrong while resetting the password.",
      },
      { status: 500 },
    );
  }
}