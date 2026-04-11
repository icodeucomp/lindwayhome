import { NextRequest, NextResponse } from "next/server";

import { generateToken, getClientIp, logError, logger, logRequest, logResponse, prisma, verifyPassword } from "@/lib";

import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST - Login user
export async function POST(request: NextRequest) {
  const pathAPI = "POST /login";

  const startTime = Date.now();
  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const { username, password } = LoginSchema.parse(body);

    const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });

    if (!user) {
      logger.error(`${pathAPI} error`, { error: "Invalid credentials" });
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      logger.error(`${pathAPI} error`, { error: "Account is deactivated" });
      return NextResponse.json({ success: false, message: "Account is deactivated" }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      logger.error(`${pathAPI} error`, { error: "Invalid credentials" });
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });

    logResponse(pathAPI, Date.now() - startTime, {
      message: "Login successfully",
      data: { token, user: { id: user.id, email: user.email, username: user.username, role: user.role } },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Login successfully",
        data: { token, user: { id: user.id, email: user.email, username: user.username, role: user.role } },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
