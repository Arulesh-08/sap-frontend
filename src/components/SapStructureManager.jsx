import { useState, useCallback, useEffect } from "react";
import {
  extractSapFile, publishSapStructure,
  getCurrentSapStructure, publishKecDefault,
} from "../api/sapStructure.js";

const S = (x = {}) => ({
  border:"none", borderRadius:8, fontWeight:700,
  cursor:"pointer", fontSize:"0.85rem", padding:"9px 20px", ...x,
});

// ── Step progress bar ──────────────────────────────────────────────────────────
function StepBar({ current }) {
  const STEPS = ["Upload", "Review & Publish"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%", display:"flex",
                alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.82rem",
                background: done?"#22c55e":active?"#6366f1":"rgba(255,255,255,0.08)",
                color: done||active?"#fff":"#94a3b8", transition:"all 0.3s",
              }}>{done ? "✓" : i+1}</div>
              <span style={{ fontSize:"0.68rem", marginTop:4,
                color: active?"#a5b4fc":done?"#86efac":"#64748b" }}>{label}</span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ height:2, flex:1, marginBottom:18,
                background: done?"#22c55e":"rgba(255,255,255,0.1)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Upload step ────────────────────────────────────────────────────────────────
function UploadStep({ onResult }) {
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","docx","doc"].includes(ext)) {
      setError("Only .xlsx, .xls, .docx files are supported.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const result = await extractSapFile(file);
      onResult(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div>
      <h3 style={{ color:"#e2e8f0", marginBottom:6 }}>Upload KEC SAP Document</h3>
      <p style={{ color:"#94a3b8", fontSize:"0.85rem", marginBottom:16 }}>
        Upload your <strong style={{ color:"#a5b4fc" }}>.docx SAP format file</strong> — the system will
        automatically scan and extract all categories, types, tiers and point values.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"40px 24px", borderRadius:14, cursor:"pointer",
          border:`2px dashed ${dragging?"#6366f1":"rgba(255,255,255,0.15)"}`,
          background: dragging?"rgba(99,102,241,0.08)":"rgba(255,255,255,0.03)",
          transition:"all 0.2s",
        }}
      >
        <div style={{ fontSize:"2.5rem", marginBottom:10 }}>📄</div>
        <p style={{ color:"#cbd5e1", fontWeight:600, marginBottom:6 }}>
          {loading ? "🔍 Scanning document…" : "Drag & drop SAP docx here"}
        </p>
        <p style={{ color:"#64748b", fontSize:"0.76rem", marginBottom:14 }}>
          or click to browse (.xlsx, .xls, .docx)
        </p>
        <input
          type="file" accept=".xlsx,.xls,.docx,.doc"
          style={{ display:"none" }}
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={loading}
        />
        {loading
          ? <span style={{ color:"#a5b4fc" }}>⏳ Extracting structure…</span>
          : <span style={{
              padding:"7px 16px", borderRadius:7,
              background:"rgba(99,102,241,0.2)",
              color:"#a5b4fc", fontSize:"0.8rem",
              border:"1px solid rgba(99,102,241,0.3)",
            }}>Browse File</span>
        }
      </label>

      {error && (
        <div style={{
          marginTop:12, padding:"10px 14px", borderRadius:8,
          background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
          color:"#fca5a5", fontSize:"0.82rem",
        }}>⚠️ {error}</div>
      )}
    </div>
  );
}

// ── Structure preview & publish ────────────────────────────────────────────────
function PreviewStep({ structure, onPublish, publishing, result, isDocScanned, extractMeta, sendNotifications, setSendNotifications }) {
  const cats = Object.keys(structure || {});
  const total = cats.reduce((a, c) =>
    a + Object.values(structure[c].types || {})
      .reduce((b, t) => b + Object.keys(t).length, 0), 0);

  if (result) return (
    <div style={{ textAlign:"center", padding:"40px 0" }}>
      <div style={{ fontSize:"3rem", marginBottom:12 }}>🎉</div>
      <h3 style={{ color:"#22c55e", marginBottom:8 }}>Published Successfully!</h3>
      {result.notificationsSkipped ? (
        <p style={{ color:"#86efac" }}>
          ✅ Structure published successfully. Email notifications were skipped as per preference.
        </p>
      ) : result.notifiedCount > 0 ? (
        <p style={{ color:"#86efac" }}>
          ✅ {result.notifiedCount} user{result.notifiedCount !== 1 ? "s" : ""} notified by email.
        </p>
      ) : (
        <p style={{ color:"#94a3b8", fontSize:"0.85rem" }}>
          Structure published successfully.
        </p>
      )}
    </div>
  );

  return (
    <div>
      <div style={{
        marginBottom:16, padding:"12px 16px", borderRadius:10,
        background: isDocScanned
          ? (extractMeta?.method === "table_extraction"
              ? "rgba(34,197,94,0.1)"
              : "rgba(234,179,8,0.08)")
          : "rgba(34,197,94,0.08)",
        border:`1px solid ${
          isDocScanned
            ? (extractMeta?.method === "table_extraction"
                ? "rgba(34,197,94,0.3)"
                : "rgba(234,179,8,0.3)")
            : "rgba(34,197,94,0.25)"
        }`,
      }}>
        <p style={{
          color: isDocScanned
            ? (extractMeta?.method === "table_extraction" ? "#86efac" : "#fde68a")
            : "#86efac",
          fontWeight:700, marginBottom:4,
        }}>
          {isDocScanned
            ? (extractMeta?.method === "table_extraction"
                ? "📄 Extracted from Document Tables ✔️"
                : "⚠️ Extracted via Pattern Matching (Fallback)")
            : "📋 KEC Default Structure"}
        </p>
        <p style={{ color:"#64748b", fontSize:"0.8rem", margin:0 }}>
          {cats.length} categories · {total} tier combinations.
          {extractMeta?.method === "table_extraction" && " Tables were parsed directly from your document."}
          {extractMeta?.method === "pattern_extraction" && " Tables could not be read cleanly — used pattern matching on text. Verify point values before publishing."}
          {!isDocScanned && " Review below and publish when ready."}
        </p>
      </div>

      {!cats.length && (
        <div style={{
          color:"#ef4444", padding:16, borderRadius:10, marginBottom:16,
          background:"rgba(239,68,68,0.08)",
        }}>
          ⚠️ No categories were extracted. The document format may not be parseable.
          Use "Publish KEC Default" instead.
        </div>
      )}

      <div style={{ maxHeight:440, overflowY:"auto", marginBottom:20 }}>
        {cats.map((cat) => (
          <div key={cat} style={{
            marginBottom:12, borderRadius:10, overflow:"hidden",
            background:"rgba(255,255,255,0.04)",
          }}>
            <div style={{
              padding:"8px 16px",
              background:"rgba(99,102,241,0.15)",
              color:"#a5b4fc", fontWeight:700, fontSize:"0.86rem",
              display:"flex", justifyContent:"space-between",
            }}>
              <span>{cat}</span>
              <span style={{ color:"#64748b", fontWeight:400, fontSize:"0.73rem" }}>
                max {structure[cat].max} pts
              </span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
              <thead>
                <tr>
                  {["Type","Tier","Points"].map((h) => (
                    <th key={h} style={{
                      padding:"6px 14px", color:"#64748b",
                      textAlign: h==="Points"?"right":"left",
                      borderBottom:"1px solid rgba(255,255,255,0.06)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(structure[cat].types || {}).flatMap(([type, tiers]) =>
                  Object.entries(tiers).map(([tier, pts], ti) => (
                    <tr key={`${type}-${tier}`}>
                      <td style={{ padding:"5px 14px", color:"#cbd5e1", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        {ti === 0 ? type : ""}
                      </td>
                      <td style={{ padding:"5px 14px", color:"#94a3b8", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        {tier}
                      </td>
                      <td style={{
                        padding:"5px 14px", color:"#4ade80", textAlign:"right",
                        fontWeight:600, borderBottom:"1px solid rgba(255,255,255,0.04)",
                      }}>{pts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {cats.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:14 }}>
          <label style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
            <input
              type="checkbox"
              checked={sendNotifications}
              onChange={(e) => setSendNotifications(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#6366f1" }}
            />
            <span style={{ color:"#cbd5e1", fontSize:"0.85rem", fontWeight:500 }}>
              Send email notifications to users
            </span>
          </label>

          <button
            onClick={onPublish}
            disabled={publishing}
            style={{
              ...S({ padding:"12px 28px" }),
              background: publishing
                ? "rgba(34,197,94,0.3)"
                : "linear-gradient(135deg,#16a34a,#22c55e)",
              color:"#fff",
              cursor: publishing ? "not-allowed" : "pointer",
            }}
          >
            {publishing ? "⏳ Publishing…" : sendNotifications ? "🚀 Publish & Notify All Users" : "🚀 Publish Structure"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Current structure viewer ───────────────────────────────────────────────────
function CurrentStructureView() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getCurrentSapStructure()
      .then(setData).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color:"#94a3b8" }}>Loading…</p>;
  if (error)   return <div style={{ color:"#fca5a5" }}>⚠️ {error}</div>;

  if (!data?.structure) return (
    <div style={{
      padding:16, borderRadius:10,
      background:"rgba(255,255,255,0.04)", color:"#94a3b8",
    }}>
      No custom structure published yet. Using built-in KEC default.
    </div>
  );

  const { structure, publishedAt, publishedBy } = data;
  return (
    <div>
      <div style={{
        marginBottom:14, padding:"10px 14px", borderRadius:10,
        background:"rgba(34,197,94,0.08)",
        border:"1px solid rgba(34,197,94,0.2)",
        fontSize:"0.82rem", color:"#86efac",
      }}>
        ✅ Active — published {new Date(publishedAt).toLocaleString()}
        {publishedBy?.name ? ` by ${publishedBy.name}` : ""}
      </div>
      <div style={{ maxHeight:480, overflowY:"auto" }}>
        {Object.entries(structure).map(([cat, catData]) => (
          <div key={cat} style={{ marginBottom:12, borderRadius:10, overflow:"hidden", background:"rgba(255,255,255,0.04)" }}>
            <div style={{
              padding:"8px 16px",
              background:"rgba(99,102,241,0.15)",
              color:"#a5b4fc", fontWeight:700, fontSize:"0.86rem",
              display:"flex", justifyContent:"space-between",
            }}>
              <span>{cat}</span>
              <span style={{ color:"#64748b", fontWeight:400, fontSize:"0.73rem" }}>max {catData.max} pts</span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
              <thead>
                <tr>
                  {["Type","Tier","Points"].map((h) => (
                    <th key={h} style={{
                      padding:"6px 14px", color:"#64748b",
                      textAlign:h==="Points"?"right":"left",
                      borderBottom:"1px solid rgba(255,255,255,0.06)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(catData.types||{}).flatMap(([type, tiers]) =>
                  Object.entries(tiers).map(([tier, pts], ti) => (
                    <tr key={`${type}-${tier}`}>
                      <td style={{ padding:"5px 14px", color:"#cbd5e1", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        {ti===0?type:""}
                      </td>
                      <td style={{ padding:"5px 14px", color:"#94a3b8", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        {tier}
                      </td>
                      <td style={{ padding:"5px 14px", color:"#4ade80", textAlign:"right", fontWeight:600, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        {pts}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SapStructureManager() {
  const [mode,        setMode]        = useState("upload");
  const [step,        setStep]        = useState(0);
  const [structure,   setStructure]   = useState(null);
  const [isDocScanned,setIsDocScanned]= useState(false);
  const [extractMeta, setExtractMeta] = useState(null); // { method, message, isKec }
  const [sendNotifications, setSendNotifications] = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [result,      setResult]      = useState(null);
  const [kecLoading,  setKecLoading]  = useState(false);
  const [kecResult,   setKecResult]   = useState("");

  function reset() {
    setStep(0); setStructure(null);
    setIsDocScanned(false); setPublishing(false); setResult(null); setExtractMeta(null);
  }

  // Called when extract API returns
  function handleExtractResult(data) {
    const meta = { method: data.method, message: data.message, isKec: data.isKec };
    setExtractMeta(meta);

    if (data.kecFormatDetected && data.structure && Object.keys(data.structure).length > 0) {
      // Successfully extracted structure — go to preview
      setStructure(data.structure);
      setIsDocScanned(true);
      setStep(1);
    } else if (data.sheets?.length) {
      // Could not extract structure — show a warning and stay on upload step
      alert(
        `⚠️ Could not auto-extract SAP structure from this document.\n\n` +
        `Reason: ${data.message || "No matching SAP categories found."}\n\n` +
        `Please use the "Publish KEC Default" button to activate the built-in KEC structure, ` +
        `or upload the official KEC SAP .docx file.`
      );
    } else {
      // Unknown state
      alert("Could not process this file. Please try the official KEC SAP .docx document.");
    }
  }

  async function handlePublish() {
    if (!structure) return;
    setPublishing(true);
    try {
      const r = await publishSapStructure(structure, sendNotifications);
      setResult(r);
    } catch (e) {
      alert("Publish failed: " + e.message);
    } finally {
      setPublishing(false);
    }
  }

  async function handlePublishKecDefault() {
    const confirmMsg = sendNotifications
      ? "Publish the official KEC SAP point structure and send email notifications to all users?"
      : "Publish the official KEC SAP point structure?";
    if (!window.confirm(confirmMsg)) return;
    setKecLoading(true); setKecResult("");
    try {
      const r = await publishKecDefault(sendNotifications);
      const emailMsg = r.notificationsSkipped
        ? `✅ ${r.message} (Email notifications skipped)`
        : r.notifiedCount > 0
          ? `✅ ${r.message} — ${r.notifiedCount} users notified.`
          : `✅ ${r.message}`;
      setKecResult(emailMsg);
    } catch (e) {
      setKecResult(`⚠️ ${e.message}`);
    } finally {
      setKecLoading(false);
    }
  }

  const tab = (active) => ({
    ...S({ padding:"7px 18px", borderRadius:7, fontSize:"0.83rem", marginRight:8 }),
    background: active ? "#6366f1" : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "#94a3b8",
  });

  return (
    <div style={{ padding:"18px 0" }}>
      {/* Mode switcher */}
      <div style={{ marginBottom:22 }}>
        <button style={tab(mode==="upload")} onClick={() => { setMode("upload"); reset(); }}>
          📤 Upload / Update Structure
        </button>
        <button style={tab(mode==="current")} onClick={() => setMode("current")}>
          📋 View Active Structure
        </button>
      </div>

      {mode === "current" && <CurrentStructureView />}

      {mode === "upload" && (
        <>
          {/* One-click KEC default */}
          <div style={{
            marginBottom:24, padding:"16px 20px", borderRadius:12,
            background:"rgba(34,197,94,0.07)",
            border:"1px solid rgba(34,197,94,0.25)",
          }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <p style={{ color:"#86efac", fontWeight:700, fontSize:"0.95rem", marginBottom:4 }}>
                  🏫 Publish Official KEC Default (No Upload Needed)
                </p>
                <p style={{ color:"#64748b", fontSize:"0.8rem", marginBottom:8 }}>
                  Instantly activates the built-in KEC SAP structure (W.E.F 10.10.2025).
                </p>
                <label style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
                  <input
                    type="checkbox"
                    checked={sendNotifications}
                    onChange={(e) => setSendNotifications(e.target.checked)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#22c55e" }}
                  />
                  <span style={{ color:"#a5b4fc", fontSize:"0.82rem", fontWeight:500 }}>
                    Send email notifications to users
                  </span>
                </label>
              </div>
              <button
                onClick={handlePublishKecDefault}
                disabled={kecLoading}
                style={{
                  ...S({ padding:"10px 22px" }),
                  background: kecLoading
                    ? "rgba(34,197,94,0.3)"
                    : "linear-gradient(135deg,#16a34a,#22c55e)",
                  color:"#fff",
                  cursor: kecLoading ? "not-allowed" : "pointer",
                  whiteSpace:"nowrap",
                }}
              >
                {kecLoading ? "⏳ Publishing…" : "✅ Publish KEC Default"}
              </button>
            </div>
            {kecResult && (
              <p style={{
                marginTop:10, fontSize:"0.82rem",
                color: kecResult.startsWith("✅") ? "#86efac" : "#fca5a5",
              }}>{kecResult}</p>
            )}
          </div>

          <div style={{ textAlign:"center", color:"#475569", fontSize:"0.8rem", marginBottom:20 }}>
            ── or scan & upload your SAP document below ──
          </div>

          <StepBar current={step} />

          {step === 0 && <UploadStep onResult={handleExtractResult} />}

          {step === 1 && structure && (
            <PreviewStep
              structure={structure}
              onPublish={handlePublish}
              publishing={publishing}
              result={result}
              isDocScanned={isDocScanned}
              extractMeta={extractMeta}
              sendNotifications={sendNotifications}
              setSendNotifications={setSendNotifications}
            />
          )}

          {step > 0 && !result && (
            <button
              onClick={() => setStep(step - 1)}
              style={{ marginTop:12, background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"0.82rem", padding:0 }}
            >
              ← Back
            </button>
          )}
          {result && (
            <button
              onClick={reset}
              style={{ marginTop:12, background:"none", border:"none", color:"#6366f1", cursor:"pointer", fontSize:"0.82rem", padding:0 }}
            >
              ↺ Upload another
            </button>
          )}
        </>
      )}
    </div>
  );
}
