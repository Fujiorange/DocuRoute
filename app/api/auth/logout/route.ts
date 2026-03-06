import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    // Get current user for audit logging
    const user = await getCurrentUser();

    // Get IP address for audit log
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Create audit log entry if user is authenticated
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          action: "LOGOUT",
          entity: "User",
          entityId: user.id,
          details: JSON.stringify({
            email: user.email,
            timestamp: new Date().toISOString(),
          }),
          ipAddress,
        },
      }).catch((error) => {
        // Don't fail logout if audit log creation fails
        console.error("Failed to create logout audit log:", error);
      });
    }

    // Clear the auth cookie
    const response = successResponse({ success: true, message: "Logged out successfully" });
    response.cookies.set({
      name: "auth_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // Even if there's an error, clear the cookie
    const response = errorResponse(
      "An error occurred during logout",
      500
    );
    response.cookies.set({
      name: "auth_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}
