import Link from "next/link";

export const metadata = { title: "เข้าสู่ระบบ — เลือกประเภทผู้ใช้" };

export default function LoginSelectPage() {
  const S = {
    page: {
      minHeight: "100vh",
      background: "#0a0c12",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 32,
    },
    logo: { fontSize: 14, fontWeight: 700, color: "#8b8fa8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
    title: { color: "#e8eaf0", fontWeight: 800, fontSize: 26, margin: "0 0 8px", textAlign: "center" },
    sub: { color: "#8b8fa8", fontSize: 14, margin: 0, textAlign: "center" },
    cards: { display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 640 },
    card: (borderColor) => ({
      flex: "1 1 260px",
      background: "#16181f",
      border: `1.5px solid ${borderColor}`,
      borderRadius: 16,
      padding: "36px 28px",
      textDecoration: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      transition: "transform .15s, box-shadow .15s",
      boxShadow: "0 4px 24px rgba(0,0,0,.3)",
      cursor: "pointer",
    }),
    icon: { fontSize: 44, lineHeight: 1 },
    cardTitle: (color) => ({ color, fontWeight: 800, fontSize: 18, margin: 0 }),
    cardDesc: { color: "#8b8fa8", fontSize: 13, textAlign: "center", margin: 0, lineHeight: 1.6 },
    badge: (bg, color) => ({
      background: bg, color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700,
    }),
  };

  return (
    <div style={S.page}>
      <div style={{ textAlign: "center" }}>
        <p style={S.logo}>⚡ GOEUN SERVER HUB</p>
        <h1 style={S.title}>เข้าสู่ระบบ</h1>
        <p style={S.sub}>กรุณาเลือกประเภทผู้ใช้งาน</p>
      </div>

      <div style={S.cards}>
        {/* Customer login */}
        <Link href="/login" style={S.card("#2a4a7f")}>
          <span style={S.icon}>🛒</span>
          <p style={S.cardTitle("#7eb8f7")}>พอร์ทัลลูกค้า</p>
          <span style={S.badge("#1e3a5f", "#7eb8f7")}>CLIENT</span>
          <p style={S.cardDesc}>สำหรับลูกค้าที่ใช้บริการ อัพโหลดและจัดการข้อมูลสินค้า</p>
        </Link>

        {/* Admin login */}
        <Link href="/admin/login" style={S.card("#4a2a7f")}>
          <span style={S.icon}>⚙️</span>
          <p style={S.cardTitle("#a78bfa")}>ระบบผู้ดูแล</p>
          <span style={S.badge("#2d1b69", "#a78bfa")}>ADMIN / SUPER ADMIN</span>
          <p style={S.cardDesc}>สำหรับผู้ดูแลระบบ จัดการลูกค้า, Users และการตั้งค่าระบบ</p>
        </Link>
      </div>

      <Link href="/" style={{ color: "#4a5070", fontSize: 13, textDecoration: "none" }}>
        ← กลับหน้าหลัก
      </Link>
    </div>
  );
}
