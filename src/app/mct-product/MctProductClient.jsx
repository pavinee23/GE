"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

const CATEGORIES = [
  { id: "all",          icon: "🛒", label: "ทั้งหมด" },
  { id: "agri",         icon: "🌾", label: "อุปกรณ์การเกษตร" },
  { id: "rubber",       icon: "🌿", label: "อุปกรณ์สวนยาง" },
  { id: "fishing",      icon: "🎣", label: "เชือก & ประมง" },
  { id: "construction", icon: "🔧", label: "ก่อสร้าง & ฮาร์ดแวร์" },
  { id: "safety",       icon: "⛑️", label: "อุปกรณ์ Safety" },
  { id: "misc",         icon: "📦", label: "สินค้าเบ็ดเตล็ด" },
];

const EMPTY_FORM = {
  sku: "", category: "agri", name: "", nameEn: "", nameZh: "",
  price: "", priceWholesale: "", unit: "ชิ้น", minOrder: "1",
  minWholesale: "10", desc: "", img: "", stock: "0",
  active: true, promotion: "", promotionPrice: "",
};

const CSV_TEMPLATE = [
  ["sku", "category", "name", "nameEn", "nameZh", "price", "priceWholesale", "unit", "minOrder", "minWholesale", "stock", "desc"],
  ["AG-001", "agri", "ตัวอย่างสินค้า", "Sample Product", "样品", "199", "150", "ชิ้น", "1", "10", "100", "รายละเอียดสินค้า"],
].map((r) => r.join(",")).join("\n");

export default function MctProductClient({ session, companyName }) {
  const [tab, setTab] = useState("all");
  const [view, setView] = useState("list"); // list | import
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const imgRef = useRef();
  const importRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      all: "1", limit: "200",
      ...(tab !== "all" ? { category: tab } : {}),
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/products?${qs}`);
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, category: tab === "all" ? "agri" : tab });
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({
      sku: p.sku, category: p.category, name: p.name, nameEn: p.nameEn || "",
      nameZh: p.nameZh || "", price: String(p.price), priceWholesale: String(p.priceWholesale || ""),
      unit: p.unit || "ชิ้น", minOrder: String(p.minOrder || 1), minWholesale: String(p.minWholesale || 10),
      desc: p.desc || "", img: p.img || "", stock: String(p.stock || 0),
      active: p.active, promotion: p.promotion || "", promotionPrice: p.promotionPrice ? String(p.promotionPrice) : "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.sku || !form.name || !form.price) {
      showToast("กรุณากรอก SKU, ชื่อสินค้า และราคา", "danger");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      price: parseFloat(form.price),
      priceWholesale: parseFloat(form.priceWholesale || form.price),
      minOrder: parseInt(form.minOrder),
      minWholesale: parseInt(form.minWholesale),
      stock: parseInt(form.stock),
      promotionPrice: form.promotionPrice ? parseFloat(form.promotionPrice) : null,
    };
    const res = editId
      ? await fetch(`/api/products/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      showToast(editId ? "แก้ไขสินค้าสำเร็จ" : "เพิ่มสินค้าสำเร็จ");
      fetchProducts();
    } else {
      const d = await res.json();
      showToast(d.error || "เกิดข้อผิดพลาด", "danger");
    }
  }

  async function handleDelete(id) {
    if (!confirm("ยืนยันลบสินค้านี้?")) return;
    setDeleting(id);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    showToast("ลบสินค้าแล้ว", "warning");
    fetchProducts();
  }

  async function handleToggleActive(p) {
    await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    fetchProducts();
  }

  async function handleImgUpload(file) {
    if (!file) return;
    setImgUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setImgUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      setForm((f) => ({ ...f, img: url }));
      showToast("อัพโหลดรูปสำเร็จ");
    } else {
      const d = await res.json();
      showToast(d.error || "อัพโหลดรูปไม่สำเร็จ", "danger");
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await fetch("/api/products/import", { method: "POST", body: fd });
    const data = await res.json();
    setImporting(false);
    setImportResult(data);
    if (res.ok) {
      showToast(`นำเข้าสำเร็จ: เพิ่ม ${data.created} | อัพเดต ${data.updated} | ข้าม ${data.skipped}`);
      fetchProducts();
    } else {
      showToast(data.error || "นำเข้าไม่สำเร็จ", "danger");
    }
  }

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "product-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

  return (
    <div className="min-vh-100" style={{ background: "#0f1117", color: "#e8eaf0" }}>
      {/* Navbar */}
      <nav className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom" style={{ background: "#16181f", borderColor: "#2a2d3a !important" }}>
        <Link href="/" className="fw-bold fs-5 text-decoration-none" style={{ color: "#7eb8f7" }}>
          {companyName}
        </Link>
        <div className="d-flex align-items-center gap-3">
          <span className="small" style={{ color: "#8b8fa8" }}>{session?.user?.name || session?.user?.email}</span>
          {session?.user?.role === "SUPER_ADMIN" && (
            <Link href="/admin/clients" className="btn btn-sm" style={{ background: "#1e2336", color: "#a78bfa", border: "1px solid #3b2d5a" }}>
              👥 จัดการลูกค้า
            </Link>
          )}
          <Link href="/m-group" target="_blank" className="btn btn-sm" style={{ background: "#1e2336", color: "#7eb8f7", border: "1px solid #2e3450" }}>
            🛒 ดูหน้าสินค้า
          </Link>
          <button className="btn btn-sm" style={{ background: "#2a1f1f", color: "#f87171", border: "1px solid #4a2222" }}
            onClick={() => signOut({ callbackUrl: "/login" })}>
            ออกจากระบบ
          </button>
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div className={`position-fixed top-0 end-0 m-3 alert alert-${toast.type} py-2 px-3 shadow`} style={{ zIndex: 9999, minWidth: 260 }}>
          {toast.msg}
        </div>
      )}

      <div className="container-fluid px-4 py-4">
        {/* Header + view switcher */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="fw-bold mb-0">จัดการสินค้า</h4>
            <p className="small mb-0" style={{ color: "#6b7280" }}>อัพโหลด / แก้ไข ข้อมูลสินค้าที่แสดงบนหน้า M-Group</p>
          </div>
          <div className="btn-group">
            <button className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setView("list")}>📋 รายการสินค้า</button>
            <button className={`btn btn-sm ${view === "import" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setView("import")}>📥 นำเข้าจากไฟล์</button>
          </div>
        </div>

        {/* ─── LIST VIEW ─── */}
        {view === "list" && (
          <>
            {/* Stats */}
            <div className="row g-3 mb-4">
              {[
                { label: "สินค้าทั้งหมด", value: total, icon: "📦", color: "#7eb8f7" },
                { label: "กำลังแสดง", value: products.filter((p) => p.active).length, icon: "✅", color: "#6ee7b7" },
                { label: "ซ่อนอยู่", value: products.filter((p) => !p.active).length, icon: "🚫", color: "#f87171" },
                { label: "มีโปรโมชั่น", value: products.filter((p) => p.promotion).length, icon: "🏷️", color: "#fbbf24" },
              ].map((s) => (
                <div key={s.label} className="col-6 col-md-3">
                  <div className="rounded-3 p-3 d-flex align-items-center gap-3" style={{ background: "#16181f", border: "1px solid #2a2d3a" }}>
                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                    <div>
                      <div className="fw-bold fs-5" style={{ color: s.color }}>{s.value}</div>
                      <div className="small" style={{ color: "#6b7280" }}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <input
                className="form-control form-control-sm"
                style={{ maxWidth: 260, background: "#16181f", color: "#e8eaf0", border: "1px solid #2a2d3a" }}
                placeholder="🔍 ค้นหาชื่อ / SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="form-select form-select-sm"
                style={{ maxWidth: 180, background: "#16181f", color: "#e8eaf0", border: "1px solid #2a2d3a" }}
                value={tab}
                onChange={(e) => setTab(e.target.value)}
              >
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <button className="btn btn-sm ms-auto" style={{ background: "#1a3a5c", color: "#7eb8f7", border: "1px solid #2e4a7a" }} onClick={openAdd}>
                ＋ เพิ่มสินค้า
              </button>
            </div>

            {/* Table */}
            <div className="rounded-3 overflow-hidden" style={{ border: "1px solid #2a2d3a" }}>
              <div className="table-responsive">
                <table className="table table-sm mb-0" style={{ "--bs-table-bg": "#16181f", "--bs-table-color": "#e8eaf0", "--bs-table-border-color": "#2a2d3a" }}>
                  <thead style={{ background: "#1e2130" }}>
                    <tr>
                      <th style={{ width: 60 }}>รูป</th>
                      <th>SKU / ชื่อสินค้า</th>
                      <th>หมวด</th>
                      <th>ราคา</th>
                      <th>ราคาส่ง</th>
                      <th>โปรโมชั่น</th>
                      <th>สต็อก</th>
                      <th>สถานะ</th>
                      <th style={{ width: 120 }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} className="text-center py-5" style={{ color: "#6b7280" }}>กำลังโหลด...</td></tr>
                    ) : products.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-5" style={{ color: "#6b7280" }}>ไม่พบสินค้า</td></tr>
                    ) : products.map((p) => (
                      <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                        <td>
                          {p.img
                            ? <img src={p.img} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} />
                            : <div style={{ width: 44, height: 44, background: "#1e2130", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📷</div>
                          }
                        </td>
                        <td>
                          <div className="fw-semibold small">{p.name}</div>
                          <div style={{ color: "#6b7280", fontSize: 11 }}>{p.sku}</div>
                        </td>
                        <td><span className="small" style={{ color: "#a0aec0" }}>{catLabel(p.category)}</span></td>
                        <td><span style={{ color: "#6ee7b7" }}>฿{Number(p.price).toLocaleString()}</span></td>
                        <td><span style={{ color: "#93c5fd" }}>฿{Number(p.priceWholesale).toLocaleString()}</span></td>
                        <td>
                          {p.promotion
                            ? <span className="badge" style={{ background: "#78350f", color: "#fbbf24", fontSize: 11 }}>🏷️ {p.promotion}</span>
                            : <span style={{ color: "#374151" }}>—</span>
                          }
                        </td>
                        <td><span style={{ color: p.stock > 0 ? "#6ee7b7" : "#f87171" }}>{p.stock}</span></td>
                        <td>
                          <button
                            className="btn btn-sm py-0 px-2"
                            style={{ fontSize: 11, background: p.active ? "#14532d" : "#3b1515", color: p.active ? "#6ee7b7" : "#f87171", border: "none" }}
                            onClick={() => handleToggleActive(p)}
                          >
                            {p.active ? "แสดง" : "ซ่อน"}
                          </button>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm py-0 px-2" style={{ background: "#1e3a5c", color: "#7eb8f7", border: "none", fontSize: 12 }} onClick={() => openEdit(p)}>แก้ไข</button>
                            <button className="btn btn-sm py-0 px-2" style={{ background: "#3b1515", color: "#f87171", border: "none", fontSize: 12 }} disabled={deleting === p.id} onClick={() => handleDelete(p.id)}>ลบ</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ─── IMPORT VIEW ─── */}
        {view === "import" && (
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              {/* Instructions */}
              <div className="rounded-3 p-4 mb-4" style={{ background: "#16181f", border: "1px solid #2a2d3a" }}>
                <h6 className="fw-bold mb-3">📋 รูปแบบไฟล์ที่รองรับ</h6>
                <div className="row g-2 mb-3">
                  {[
                    { ext: "CSV", icon: "📄", desc: "UTF-8 หรือ UTF-8 BOM" },
                    { ext: "XLSX", icon: "📊", desc: "Excel 2007 ขึ้นไป" },
                    { ext: "XLS", icon: "📊", desc: "Excel เวอร์ชันเก่า" },
                  ].map((f) => (
                    <div key={f.ext} className="col-4">
                      <div className="text-center p-2 rounded-2" style={{ background: "#1e2130" }}>
                        <div style={{ fontSize: 24 }}>{f.icon}</div>
                        <div className="fw-bold small">.{f.ext}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <h6 className="fw-semibold mb-2">คอลัมน์ที่ต้องมี *</h6>
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {["sku *", "name / ชื่อสินค้า *", "price / ราคา *", "category / หมวด", "nameEn", "nameZh", "priceWholesale / ราคาส่ง", "unit / หน่วย", "stock / สต็อก", "desc / รายละเอียด"].map((c) => (
                    <span key={c} className="badge" style={{ background: c.includes("*") ? "#1a3a5c" : "#1e2130", color: c.includes("*") ? "#7eb8f7" : "#a0aec0", fontWeight: "normal" }}>{c}</span>
                  ))}
                </div>
                <p className="small mb-2" style={{ color: "#6b7280" }}>
                  • หาก SKU ซ้ำ → จะ <strong style={{ color: "#fbbf24" }}>อัพเดตข้อมูล</strong> อัตโนมัติ<br />
                  • หาก SKU ใหม่ → จะ <strong style={{ color: "#6ee7b7" }}>เพิ่มสินค้าใหม่</strong><br />
                  • สินค้าที่นำเข้าจะแสดงที่หน้า /m-group ทันที
                </p>
                <button className="btn btn-sm" style={{ background: "#1e2130", color: "#a0aec0", border: "1px solid #2a2d3a" }} onClick={downloadTemplate}>
                  ⬇️ ดาวน์โหลด Template CSV
                </button>
              </div>

              {/* Upload zone */}
              <div className="rounded-3 p-4 mb-4" style={{ background: "#16181f", border: "2px dashed #2a2d3a" }}>
                <div
                  className="text-center py-3"
                  style={{ cursor: "pointer" }}
                  onClick={() => importRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImportFile(f); }}
                >
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
                  <p className="mb-1 fw-semibold">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
                  <p className="small mb-0" style={{ color: "#6b7280" }}>รองรับ .csv, .xlsx, .xls</p>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="d-none"
                    onChange={(e) => setImportFile(e.target.files[0])}
                  />
                </div>
                {importFile && (
                  <div className="mt-3 d-flex align-items-center justify-content-between rounded-2 px-3 py-2" style={{ background: "#1e2130" }}>
                    <div>
                      <span className="fw-semibold small">{importFile.name}</span>
                      <span className="ms-2 small" style={{ color: "#6b7280" }}>({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button className="btn btn-sm" style={{ background: "#3b1515", color: "#f87171", border: "none" }} onClick={() => { setImportFile(null); setImportResult(null); }}>✕</button>
                  </div>
                )}
              </div>

              <button
                className="btn w-100 fw-bold mb-4"
                style={{ background: importFile && !importing ? "#1a3a5c" : "#1e2130", color: importFile && !importing ? "#7eb8f7" : "#4b5563", border: "none" }}
                disabled={!importFile || importing}
                onClick={handleImport}
              >
                {importing ? "⏳ กำลังนำเข้า..." : "📥 นำเข้าสินค้า"}
              </button>

              {/* Result */}
              {importResult && (
                <div className="rounded-3 p-4" style={{ background: "#16181f", border: `1px solid ${importResult.ok ? "#14532d" : "#7f1d1d"}` }}>
                  {importResult.ok ? (
                    <>
                      <h6 className="fw-bold mb-3" style={{ color: "#6ee7b7" }}>✅ นำเข้าสำเร็จ</h6>
                      <div className="row g-2 mb-3">
                        {[
                          { label: "เพิ่มใหม่", value: importResult.created, color: "#6ee7b7" },
                          { label: "อัพเดต", value: importResult.updated, color: "#fbbf24" },
                          { label: "ข้ามแถว", value: importResult.skipped, color: "#9ca3af" },
                        ].map((s) => (
                          <div key={s.label} className="col-4 text-center">
                            <div className="fw-bold fs-4" style={{ color: s.color }}>{s.value}</div>
                            <div className="small" style={{ color: "#6b7280" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {importResult.errors?.length > 0 && (
                        <div>
                          <p className="small fw-semibold mb-1" style={{ color: "#f87171" }}>แถวที่มีข้อผิดพลาด:</p>
                          {importResult.errors.map((e, i) => (
                            <div key={i} className="small" style={{ color: "#f87171" }}>แถว {e.row} (SKU: {e.sku}): {e.error}</div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "#f87171" }}>❌ {importResult.error}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL Add/Edit ─── */}
      {modalOpen && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.75)", zIndex: 1050 }} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ marginTop: "5vh" }}>
            <div className="modal-content" style={{ background: "#16181f", color: "#e8eaf0", border: "1px solid #2a2d3a" }}>
              <div className="modal-header" style={{ borderColor: "#2a2d3a" }}>
                <h5 className="modal-title fw-bold">{editId ? "✏️ แก้ไขสินค้า" : "➕ เพิ่มสินค้าใหม่"}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalOpen(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Image Upload */}
                  <div className="col-12">
                    <label className="form-label small fw-semibold">รูปสินค้า</label>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        onClick={() => imgRef.current?.click()}
                        style={{ width: 90, height: 90, background: "#1e2130", border: "2px dashed #2a2d3a", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
                      >
                        {form.img
                          ? <img src={form.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 28 }}>📷</span>
                        }
                      </div>
                      <div>
                        <button className="btn btn-sm d-block mb-1" style={{ background: "#1e2130", color: "#a0aec0", border: "1px solid #2a2d3a" }} onClick={() => imgRef.current?.click()} disabled={imgUploading}>
                          {imgUploading ? "⏳ กำลังอัพโหลด..." : "⬆️ อัพโหลดรูป"}
                        </button>
                        <input type="text" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#a0aec0", border: "1px solid #2a2d3a" }} placeholder="หรือวาง URL รูปภาพ" value={form.img} onChange={(e) => setForm((f) => ({ ...f, img: e.target.value }))} />
                        <input ref={imgRef} type="file" accept="image/*" className="d-none" onChange={(e) => handleImgUpload(e.target.files[0])} />
                      </div>
                    </div>
                  </div>

                  {/* SKU + Category */}
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">SKU *</label>
                    <input className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="AG-001" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">หมวดหมู่ *</label>
                    <select className="form-select form-select-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">หน่วย</label>
                    <input className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="ชิ้น" />
                  </div>

                  {/* Names */}
                  <div className="col-12">
                    <label className="form-label small fw-semibold">ชื่อสินค้า (ไทย) *</label>
                    <input className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">ชื่อภาษาอังกฤษ</label>
                    <input className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">ชื่อภาษาจีน</label>
                    <input className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.nameZh} onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))} />
                  </div>

                  {/* Price */}
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">ราคาปลีก (บาท) *</label>
                    <input type="number" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">ราคาส่ง (บาท)</label>
                    <input type="number" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.priceWholesale} onChange={(e) => setForm((f) => ({ ...f, priceWholesale: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">ขั้นต่ำปลีก</label>
                    <input type="number" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">ขั้นต่ำส่ง</label>
                    <input type="number" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.minWholesale} onChange={(e) => setForm((f) => ({ ...f, minWholesale: e.target.value }))} />
                  </div>

                  {/* Stock */}
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">สต็อก</label>
                    <input type="number" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                  </div>

                  {/* Promotion */}
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">🏷️ ป้ายโปรโมชั่น</label>
                    <input className="form-control form-control-sm" style={{ background: "#1e2130", color: "#fbbf24", border: "1px solid #2a2d3a" }} value={form.promotion} onChange={(e) => setForm((f) => ({ ...f, promotion: e.target.value }))} placeholder="เช่น ลด 20%, ซื้อ 2 แถม 1" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">ราคาโปรโมชั่น (บาท)</label>
                    <input type="number" className="form-control form-control-sm" style={{ background: "#1e2130", color: "#fbbf24", border: "1px solid #2a2d3a" }} value={form.promotionPrice} onChange={(e) => setForm((f) => ({ ...f, promotionPrice: e.target.value }))} placeholder="ราคาหลังลด" />
                  </div>

                  {/* Active */}
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="activeSwitch" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                      <label className="form-check-label small" htmlFor="activeSwitch">แสดงสินค้านี้บนหน้า M-Group</label>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <label className="form-label small fw-semibold">รายละเอียดสินค้า</label>
                    <textarea className="form-control form-control-sm" rows={3} style={{ background: "#1e2130", color: "#e8eaf0", border: "1px solid #2a2d3a" }} value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderColor: "#2a2d3a" }}>
                <button className="btn btn-sm" style={{ background: "#1e2130", color: "#a0aec0", border: "1px solid #2a2d3a" }} onClick={() => setModalOpen(false)}>ยกเลิก</button>
                <button className="btn btn-sm fw-bold" style={{ background: "#1a3a5c", color: "#7eb8f7", border: "none" }} disabled={saving} onClick={handleSave}>
                  {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
