import { NextRequest } from "next/server";

import { prisma } from "./prisma";

import bcrypt from "bcryptjs";

import jwt, { JwtPayload } from "jsonwebtoken";

type Role = "ADMIN" | "SUPER_ADMIN";

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
}

export interface TokenPayload extends JwtPayload {
  userId: string;
}

export interface AuthResult {
  user?: User;
  message?: string;
  status?: number;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.NEXT_PUBLIC_JWT_SECRET || "lindway", {
    expiresIn: "1d",
  });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET || "lindway") as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid token: ${error.message}`);
    }
    throw error;
  }
};

export const authenticate = async (req: NextRequest): Promise<AuthResult> => {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return { message: "No token provided", status: 401 };
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return { message: "Invalid token", status: 401 };
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return { message: "User not found or inactive", status: 401 };
    }

    return { user };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { message: error.message, status: 500 };
    }

    return { message: "Authentication failed", status: 500 };
  }
};

export const authorize = async (req: NextRequest, requiredRole: Role): Promise<AuthResult> => {
  const authResult = await authenticate(req);

  if ("message" in authResult) {
    return authResult;
  }

  const user = authResult.user;
  const role = authResult.user?.role || "ADMIN";
  const roleHierarchy: Record<Role, number> = {
    SUPER_ADMIN: 2,
    ADMIN: 1,
  };

  const userRoleLevel = roleHierarchy[role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    return {
      message: `Access denied. ${requiredRole} role required`,
      status: 403,
    };
  }

  return { user };
};
