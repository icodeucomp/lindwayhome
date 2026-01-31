import { NextRequest, NextResponse } from "next/server";

import { generateToken, hashPassword, logger, prisma } from "@/lib";

import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

// POST - Register user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /register", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const { email, username, password, role = "ADMIN" } = RegisterSchema.parse(body);

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });

    if (existingUser) {
      logger.error("API /register error", { error: "User with this email or username already exists" });
      return NextResponse.json({ success: false, message: "User with this email or username already exists" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role,
      },
    });

    const token = generateToken(user.id);

    logger.info("API Response /register", {
      message: "User registered successfully",
      durationMs: Date.now() - start,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /register error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /register error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
