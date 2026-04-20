"use client";
import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

const STATUS_OPTS = ["ONLINE", "MAINTENANCE", "COMING_SOON", "OFFLINE"];
const ROLE_OPTS = ["CLIENT", "ADMIN", "SUPER_ADMIN"];

const STATUS_BADGE = {
  ONLINE:       { bg: "#14532d", color: "#4ade80", label: "Online" },
  MAINTENANCE:  { bg: "#422006", color: "#fb923c", label: "Maintenance" },
  COMING_SOON:  { bg: "#1e1b4b", color: "#a78bfa", label: "Coming Soon" },
  OFFLINE:      { bg: "#3b0000", color: "#f87171", label: "Offline" },
};
const ROLE_BADGE = {
  SUPER_ADMIN:  { bg: "#4c0519", color: "#fb7185", label: "Super Admin" },
  ADMIN:        { bg: "#172554", color: "#60a5fa", label: "Admin" },
  CLIENT:       { bg: "#14532d", color: "#4ade80", label: "Client" },
};

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function ClientsUsersClient({ session }) {
  const [tab, setTab] = useState("clients"); // "clients" | "users"
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // client modal
  const [clientModal, setClientModal] = useState(false);
  const [editClientId, setEditClientId] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: "", slug: "", description: "", status: "COMING_SOON",
    contactEmail: "", contactPhone: "", systemUrl: "",
  });
  const [savingClient, setSavingClient] = useState(false);

  // user modal
  const [userModal, setUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "", email: "", password: "", role: "CLIENT", clientId: "",
  });
  const [savingUser, setSavingUser] = useState(false);

  // filters
  const [clientSearch, setClientSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadClients = useCallback(async () => {
    const r = await fetch("/api/admin/clients");
    const d = await r.json();
    setClients(d.clients || []);
  }, []);

  const loadUsers = useCallback(async () => {
    const url = filterClientId ? `/api/admin/users?clientId=${filterClientId}` : "/api/admin/users";
    const r = await fetch(url);
    const d = await r.json();
    setUsers(d.users || []);
  }, [filterClientId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadClients(), loadUsers()]).finally(() => setLoading(false));
  }, [loadClients, loadUsers]);

  // ── Client Modal ──
  const openAddClient = () => {
    setEditClientId(null);
    setClientForm({ name: "", slug: "", description: "", status: "COMING_SOON", contactEmail: "", contactPhone: "", systemUrl: "" });
    setClientModal(true);
  };
  const openEditClient = (c) => {
    setEditClientId(c.id);
    setClientForm({ name: c.name, slug: c.slug, description: c.description || "", status: c.status, contactEmail: c.contactEmail || "", contactPhone: c.contactPhone || "", systemUrl: c.systemUrl || "" });
    setClientModal(true);
  };
  const saveClient = async () => {
    setSavingClient(true);
    try {
      const url = editClientId ? `/api/admin/clients/${editClientId}` : "/api/admin/clients";
      const method = editClientId ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientForm) });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "เกิดข้อผิดพลาด", false); return; }
      showToast(editClientId ? "อัพเดตลูกค้าสำเร็จ" : "เพิ่มลูกค้าสำเร็จ");
      setClientModal(false);
      loadClients();
    } finally { setSavingClient(false); }
  };
  const deleteClient = async (id, name) => {
    if (!confirm(`ลบลูกค้า "${name}" ? ผู้ใช้ที่ผูกไว้จะถูก unlink`)) return;
    const r = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || "ลบไม่สำเร็จ", false); return; }
    showToast("ลบลูกค้าสำเร็จ");
    loadClients(); loadUsers();
  };

  // ── User Modal ──
  const openAddUser = () => {
    setEditUserId(null);
    setUserForm({ name: "", email: "", password: "", role: "CLIENT", clientId: "" });
    setUserModal(true);
  };
  const openEditUser = (u) => {
    setEditUserId(u.id);
    setUserForm({ name: u.name || "", email: u.email, password: "", role: u.role, clientId: u.clientId || "" });
    setUserModal(true);
  };
  const saveUser = async () => {
    setSavingUser(true);
    try {
      const url = editUserId ? `/api/admin/users/${editUserId}` : "/api/admin/users";
      const method = editUserId ? "PUT" : "POST";
      const body = { ...userForm };
      if (!body.password) delete body.password;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { showToast(d.error || "เกิดข้อผิดพลาด", false); return; }
      showToast(editUserId ? "อัพเดต User สำเร็จ" : "เพิ่ม User สำเร็จ");
      setUserModal(false);
      loadUsers();
    } finally { setSavingUser(false); }
  };
  const deleteUser = async (id, email) => {
    if (!confirm(`ลบ User "${email}" ?`)) return;
    const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || "ลบไม่สำเร็จ", false); return; }
    showToast("ลบ User สำเร็จ");
    loadUsers();
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.slug.toLowerCase().includes(clientSearch.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const S = {
    bg: { background: "#0f1117", minHeight: "100vh", color: "#e8eaf0" },
    nav: { background: "#16181f", borderBottom: "1px solid #2a2d3a", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    card: { background: "#16181f", border: "1px solid #2a2d3a", borderRadius: 10, padding: 20 },
    input: { background: "#1e2130", border: "1px solid #2a2d3a", color: "#e8eaf0", borderRadius: 6, padding: "8px 12px", width: "100%", fontSize: 14, outline: "none" },
    label: { fontSize: 12, color: "#8b8fa8", marginBottom: 4, display: "block" },
    btn: (bg, color = "#fff") => ({ background: bg, color, border: "none", borderRadius: 6, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }),
    th: { padding: "10px 14px", fontSize: 12, color: "#8b8fa8", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #2a2d3a", whiteSpace: "nowrap" },
    td: { padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #1e2130", verticalAlign: "middle" },
  };

  return (
    <div style={S.bg}>
      {/* Navbar */}
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#7eb8f7" }}>⚙️ Admin Panel</span>
          <Link href="/admin/products" style={{ color: "#8b8fa8", fontSize: 13, textDecoration: "none" }}>สินค้า</Link>
          <span style={{ color: "#7eb8f7", fontSize: 13, fontWeight: 600 }}>ลูกค้า &amp; Users</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#8b8fa8", fontSize: 13 }}>{session.user.name || session.user.email}</span>
          <Link href="/mct-product" style={{ ...S.btn("#1e2336", "#7eb8f7"), textDecoration: "none", padding: "6px 14px" }}>
            📦 จัดการสินค้า
          </Link>
          <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => signOut({ callbackUrl: "/login" })}>ออกจากระบบ</button>
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#14532d" : "#7f1d1d", color: "#fff", borderRadius: 8, padding: "12px 20px", fontWeight: 600, fontSize: 14 }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 20px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "ลูกค้าทั้งหมด", value: clients.length, color: "#7eb8f7" },
            { label: "ONLINE", value: clients.filter(c => c.status === "ONLINE").length, color: "#4ade80" },
            { label: "Users ทั้งหมด", value: users.length, color: "#a78bfa" },
            { label: "Users (CLIENT)", value: users.filter(u => u.role === "CLIENT").length, color: "#fb923c" },
          ].map(s => (
            <div key={s.label} style={{ ...S.card, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#8b8fa8", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["clients", "🏢 ลูกค้า"], ["users", "👤 Users"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              ...S.btn(tab === key ? "#1e3a5f" : "#1e2130", tab === key ? "#7eb8f7" : "#8b8fa8"),
              border: tab === key ? "1px solid #3b82f6" : "1px solid #2a2d3a",
              padding: "9px 20px", fontSize: 14,
            }}>{label}</button>
          ))}
        </div>

        {/* ── CLIENTS TAB ── */}
        {tab === "clients" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <input
                style={{ ...S.input, maxWidth: 280 }}
                placeholder="🔍 ค้นหาชื่อ / slug..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
              />
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={openAddClient}>+ เพิ่มลูกค้าใหม่</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["ชื่อบริษัท", "Slug", "สถานะ", "อีเมลติดต่อ", "เบอร์โทร", "Users", "สร้างเมื่อ", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : filteredClients.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มีลูกค้า</td></tr>
                  ) : filteredClients.map(c => {
                    const sb = STATUS_BADGE[c.status] || STATUS_BADGE.OFFLINE;
                    return (
                      <tr key={c.id}>
                        <td style={S.td}><span style={{ fontWeight: 600 }}>{c.name}</span></td>
                        <td style={S.td}><code style={{ color: "#8b8fa8", fontSize: 12 }}>{c.slug}</code></td>
                        <td style={S.td}>
                          <span style={{ background: sb.bg, color: sb.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{sb.label}</span>
                        </td>
                        <td style={S.td}>{c.contactEmail || <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={S.td}>{c.contactPhone || <span style={{ color: "#4a5070" }}>—</span>}</td>
                        <td style={S.td}>
                          <span style={{ background: "#1e3a5f", color: "#7eb8f7", borderRadius: 4, padding: "2px 10px", fontWeight: 700 }}>{c._count.users}</span>
                        </td>
                        <td style={{ ...S.td, color: "#8b8fa8", fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString("th-TH")}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEditClient(c)}>✏️</button>
                            <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteClient(c.id, c.name)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  style={{ ...S.input, maxWidth: 240 }}
                  placeholder="🔍 ค้นหาชื่อ / email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <select
                  style={{ ...S.input, maxWidth: 220 }}
                  value={filterClientId}
                  onChange={e => setFilterClientId(e.target.value)}
                >
                  <option value="">ทุกบริษัท</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={openAddUser}>+ เพิ่ม User ใหม่</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["ชื่อ", "Email", "Role", "บริษัท", "สร้างเมื่อ", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>กำลังโหลด...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#8b8fa8", padding: 40 }}>ยังไม่มี User</td></tr>
                  ) : filteredUsers.map(u => {
                    const rb = ROLE_BADGE[u.role] || ROLE_BADGE.CLIENT;
                    return (
                      <tr key={u.id}>
                        <td style={S.td}><span style={{ fontWeight: 600 }}>{u.name || <span style={{ color: "#4a5070" }}>—</span>}</span></td>
                        <td style={S.td}>{u.email}</td>
                        <td style={S.td}>
                          <span style={{ background: rb.bg, color: rb.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{rb.label}</span>
                        </td>
                        <td style={S.td}>{u.client ? <span style={{ color: "#7eb8f7" }}>{u.client.name}</span> : <span style={{ color: "#4a5070" }}>— ยังไม่ผูก —</span>}</td>
                        <td style={{ ...S.td, color: "#8b8fa8", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("th-TH")}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={S.btn("#1e2d3d", "#60a5fa")} onClick={() => openEditUser(u)}>✏️</button>
                            <button style={S.btn("#2a1f1f", "#f87171")} onClick={() => deleteUser(u.id, u.email)}
                              disabled={u.id === session.user.id}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── CLIENT MODAL ── */}
      {clientModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520, border: "1px solid #2a2d3a", maxHeight: "90vh", overflowY: "auto" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>{editClientId ? "✏️ แก้ไขลูกค้า" : "🏢 เพิ่มลูกค้าใหม่"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>ชื่อบริษัท *</label>
                <input style={S.input} value={clientForm.name}
                  onChange={e => setClientForm(p => ({ ...p, name: e.target.value, slug: editClientId ? p.slug : slugify(e.target.value) }))} />
              </div>
              <div>
                <label style={S.label}>Slug (URL) *</label>
                <input style={S.input} value={clientForm.slug}
                  onChange={e => setClientForm(p => ({ ...p, slug: slugify(e.target.value) }))} />
              </div>
              <div>
                <label style={S.label}>คำอธิบาย</label>
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }} value={clientForm.description}
                  onChange={e => setClientForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <select style={S.input} value={clientForm.status} onChange={e => setClientForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>อีเมลติดต่อ</label>
                  <input style={S.input} type="email" value={clientForm.contactEmail}
                    onChange={e => setClientForm(p => ({ ...p, contactEmail: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>เบอร์โทร</label>
                  <input style={S.input} value={clientForm.contactPhone}
                    onChange={e => setClientForm(p => ({ ...p, contactPhone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={S.label}>URL ระบบลูกค้า</label>
                <input style={S.input} placeholder="https://..." value={clientForm.systemUrl}
                  onChange={e => setClientForm(p => ({ ...p, systemUrl: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setClientModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={saveClient} disabled={savingClient}>
                {savingClient ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER MODAL ── */}
      {userModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#16181f", borderRadius: 12, padding: 28, width: "100%", maxWidth: 460, border: "1px solid #2a2d3a" }}>
            <h5 style={{ margin: "0 0 20px", color: "#7eb8f7" }}>{editUserId ? "✏️ แก้ไข User" : "👤 เพิ่ม User ใหม่"}</h5>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={S.label}>ชื่อ</label>
                <input style={S.input} value={userForm.name}
                  onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Email *</label>
                <input style={S.input} type="email" value={userForm.email}
                  onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>{editUserId ? "รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)" : "รหัสผ่าน *"}</label>
                <input style={S.input} type="password" value={userForm.password}
                  onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Role</label>
                <select style={S.input} value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLE_OPTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>ผูกกับบริษัท</label>
                <select style={S.input} value={userForm.clientId} onChange={e => setUserForm(p => ({ ...p, clientId: e.target.value }))}>
                  <option value="">— ไม่ผูกกับบริษัทใด —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button style={S.btn("#1e2130", "#8b8fa8")} onClick={() => setUserModal(false)}>ยกเลิก</button>
              <button style={S.btn("#1e3a5f", "#7eb8f7")} onClick={saveUser} disabled={savingUser}>
                {savingUser ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
