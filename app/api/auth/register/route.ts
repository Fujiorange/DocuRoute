import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(255),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { companyName, email, password, name } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const subdomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const company = await prisma.company.create({
      data: {
        name: companyName,
        subdomain: `${subdomain}-${Date.now()}`,
        users: {
          create: {
            email,
            passwordHash,
            name,
            role: "it_admin",
          },
        },
      },
      include: { users: true },
    });

    const user = company.users[0];

    const token = signToken({
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role,
    });

    console.log(`[DocuRoute] New company registered: ${companyName} (${email})`);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: company.id,
        companyName: company.name,
      },
    });

    response.cookies.set(setAuthCookie(token));
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
