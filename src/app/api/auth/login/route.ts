import { NextRequest, NextResponse } from "next/server";

import { generateToken, logger, prisma, verifyPassword } from "@/lib";

import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST - Login user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /login", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const { username, password } = LoginSchema.parse(body);

    const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });

    if (!user) {
      logger.error("API /login error", { error: "Invalid credentials" });
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      logger.error("API /login error", { error: "Account is deactivated" });
      return NextResponse.json({ success: false, message: "Account is deactivated" }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      logger.error("API /login error", { error: "Invalid credentials" });
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    logger.info("API Response /login", {
      message: "Login successfully",
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
        message: "Login successfully",
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
      logger.error("API /login error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /login error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
