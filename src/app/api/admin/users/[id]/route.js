import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// PUT /api/admin/users/[id]
export async function PUT(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const body = await req.json();
  const { name, email, password, role, clientId } = body;

  const data = {};
  if (name !== undefined) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (clientId !== undefined) data.clientId = clientId || null;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, clientId: true, createdAt: true },
  });
  return NextResponse.json({ user });
}

// DELETE /api/admin/users/[id]
export async function DELETE(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;

  // Prevent deleting your own account
  if (id === session.user.id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
