import { NextRequest, NextResponse } from "next/server";

import { generateToken, getClientIp, hashPassword, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

// POST - Register user
export async function POST(request: NextRequest) {
  const pathAPI = "POST /register";
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const { email, username, password, role = "ADMIN" } = RegisterSchema.parse(body);

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });

    if (existingUser) {
      logger.error(`${pathAPI} error`, { error: "User with this email or username already exists" });
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

    logResponse(pathAPI, Date.now() - startTime, {
      message: "User registered successfully",
      data: { token, user: { id: user.id, email: user.email, username: user.username, role: user.role } },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
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
