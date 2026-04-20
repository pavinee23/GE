import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session) {
  return session?.user?.role === "SUPER_ADMIN";
}

// PUT /api/admin/clients/[id]
export async function PUT(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const body = await req.json();
  const { name, description, status, contactEmail, contactPhone, systemUrl } = body;

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
      ...(systemUrl !== undefined && { systemUrl }),
    },
  });
  return NextResponse.json({ client });
}

// DELETE /api/admin/clients/[id]
export async function DELETE(req, { params }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;

  // Unlink users first
  await prisma.user.updateMany({ where: { clientId: id }, data: { clientId: null } });
  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
