import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientsUsersClient from "./ClientsUsersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการลูกค้า & Users — Admin" };

export default async function ClientsUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/login");
  return <ClientsUsersClient session={session} />;
}
