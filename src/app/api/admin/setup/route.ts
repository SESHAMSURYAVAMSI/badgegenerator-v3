import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !name || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email and password are required.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must contain at least 8 characters.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const existingAdmin = await Admin.findOne({
      email,
    });

    if (existingAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "An administrator with this email already exists.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      email,
      name,
      password: passwordHash,
      role: "admin",
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Administrator created successfully.",
        admin: {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin setup failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create administrator.",
      },
      { status: 500 },
    );
  }
}