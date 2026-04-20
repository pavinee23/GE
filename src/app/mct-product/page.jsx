import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import MctProductClient from "./MctProductClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการสินค้า — MCT Product" };

export default async function MctProductPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userWithClient = await prisma.user.findUnique({
    where: session.user.id
      ? { id: session.user.id }
      : { email: session.user.email },
    select: { role: true, client: { select: { name: true } } },
  });

  const role = userWithClient?.role ?? session.user.role;
  // SUPER_ADMIN คือเจ้าของระบบ ไม่ใช่ลูกค้า → แสดง "ผู้ดูแลระบบ"
  const companyName = role === "SUPER_ADMIN"
    ? "ผู้ดูแลระบบ"
    : userWithClient?.client?.name ?? "— ยังไม่มีชื่อบริษัท —";

  return <MctProductClient session={session} companyName={companyName} />;
}
