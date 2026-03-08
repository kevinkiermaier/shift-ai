import { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";

// ── 인라인 편집 + 폰트 크기 조절 컴포넌트 ──
const Ed = ({ val, onCh, style, block = false }) => {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [fs, setFs] = useState(null);

  useEffect(() => {
    if (!active && ref.current) {
      const v = (val || "").replace(/\\n/g, "\n");
      if (ref.current.innerText !== v) ref.current.innerText = v;
    }
  }, [val, active]);

  const onFocus = () => {
    setActive(true);
    if (ref.current) {
      const computed = parseInt(window.getComputedStyle(ref.current).fontSize);
      if (!isNaN(computed)) setFs(computed);
    }
  };

  const adjFs = (delta) => {
    setFs(prev => {
      const base = prev || 16;
      return Math.max(8, Math.min(base + delta, 160));
    });
  };

  const Wrap = block ? "div" : "span";

  return (
    <Wrap style={{ position: "relative", display: block ? "block" : "inline" }}>
      {active && (
        <div style={{
          position: "absolute", top: -38, left: 0, zIndex: 1000,
          background: "#1e1b4b", borderRadius: 20, padding: "4px 10px",
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,.35)", userSelect: "none",
        }}>
          <button
            onMouseDown={e => { e.preventDefault(); adjFs(-2); }}
            style={{ background: "none", border: "none", color: "#a5b4fc", fontSize: 13, cursor: "pointer", padding: "2px 8px", borderRadius: 10, fontWeight: 900, lineHeight: 1 }}>A-</button>
          <span style={{ color: "#e2e8f0", fontSize: 11, minWidth: 34, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{fs || "—"}px</span>
          <button
            onMouseDown={e => { e.preventDefault(); adjFs(2); }}
            style={{ background: "none", border: "none", color: "#a5b4fc", fontSize: 13, cursor: "pointer", padding: "2px 8px", borderRadius: 10, fontWeight: 900, lineHeight: 1 }}>A+</button>
        </div>
      )}
      <span
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={onFocus}
        onBlur={e => { setActive(false); onCh(e.currentTarget.innerText.replace(/\n/g, "\\n")); }}
        style={{
          ...style,
          ...(fs ? { fontSize: fs } : {}),
          display: block ? "block" : "inline",
          outline: "none",
          cursor: "text",
          borderBottom: active ? "2px solid #6366f1" : "1px dashed rgba(99,102,241,0.25)",
          minWidth: 10,
          transition: "border-color .15s",
        }}
        title="클릭하여 수정 · 폰트 A-/A+"
      />
    </Wrap>
  );
};

// ── 클릭하여 이미지 교체 컴포넌트 ──
const ClickImg = ({ src, onReplace, width = 860, height = 860, placeholder = "클릭하여 이미지 추가" }) => {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ position: "relative", width, height, cursor: "pointer", flexShrink: 0 }}
      onClick={() => ref.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {src
        ? <img src={src} style={{ width, height, objectFit: "cover", display: "block" }} alt="" />
        : <div style={{ width, height, background: "#f0f0f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#aaa" }}>
            <span style={{ fontSize: 48 }}>📷</span>
            <span style={{ fontSize: 14 }}>{placeholder}</span>
          </div>
      }
      <div style={{
        position: "absolute", inset: 0, background: hover ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0)",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s",
      }}>
        {hover && <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, background: "rgba(0,0,0,0.5)", padding: "10px 24px", borderRadius: 30 }}>🖼️ 클릭하여 교체</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
        const file = e.target.files[0]; if (!file) return;
        const r = new FileReader(); r.onload = ev => onReplace(ev.target.result); r.readAsDataURL(file);
        e.target.value = "";
      }} />
    </div>
  );
};

// ── 고정 하단 주문 유의사항 ──
const NoticeSection = () => (
  <div style={{ background: "#fff", fontFamily: "inherit" }}>
    <div style={{ textAlign: "center", padding: "48px 60px 36px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, border: "2.5px solid #222", borderRadius: 40, padding: "14px 40px" }}>
        <span style={{ color: "#222", fontSize: 12 }}>◆</span>
        <span style={{ fontSize: 27, fontWeight: 900, color: "#111", letterSpacing: 1 }}>주문시 유의사항</span>
        <span style={{ color: "#222", fontSize: 12 }}>◆</span>
      </div>
    </div>
    {[
      { icon: "📦", title: "배송안내", body: <>배송은 영업일 기준(주말, 공휴일 제외) 평균 2-4일 소요됩니다.<br/>주문시 부피/무게에 따라 추가 배송비가 발생할 수 있습니다.<br/>(ex) 2박스로 배송될 시 교환/반품 택배비 2회 부과, 3박스 3회 부과<br/>주문확인 후 취소를 원하시면, 물건 수령후 반품을 진행해주셔야 합니다.<br/>상품의 배송상태가 배송준비중으로 확인되더라도 이미 발송되었다면 취소가 거부될 수 있습니다.</> },
      { icon: "📭", title: "상품 교환 및 반품시", body: <>상품별 교환/반품지 주소가 달라 <strong>상품 자동수거는 불가</strong>합니다.<br/><strong style={{ color: "#e63946" }}>교환 및 반품시 고객센터, 1:1 문의를 통해 접수 부탁드립니다.</strong><br/><br/>구매 전 <strong>표기된 상품 옵션과 구성, 사이즈</strong>를 꼭 확인 바랍니다.<br/><strong style={{ color: "#e63946" }}>제품 파손/오배송/상품 누락의 경우 송장과 받으신 상품 사진이 꼭 필요합니다.<br/>받으신 상품은 촬영하신 후 사진발송과 함께 7일 이내에 연락바랍니다.</strong></> },
      { icon: "⚠️", title: "개인정보 제공 동의", body: <>상품 구매시 제공받은 개인정보(성함, 주소, 전화번호)는 협력사 또는 배송업체에 배송을 목적으로 제공될 수 있으며, 배송 후 자동 폐기됩니다.</> },
    ].map((s, i, arr) => (
      <div key={i}>
        <div style={{ padding: "0 60px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ fontSize: 40, flexShrink: 0, paddingTop: 4 }}>{s.icon}</div>
          <div>
            <div style={{ fontSize: 23, fontWeight: 900, color: "#111", marginBottom: 12 }}>{s.title}</div>
            <div style={{ fontSize: 18, color: "#555", lineHeight: 1.95 }}>{s.body}</div>
          </div>
        </div>
        {i < arr.length - 1 && <div style={{ borderBottom: "1.5px dashed #ccc", margin: "0 60px 32px" }} />}
      </div>
    ))}
    <div style={{ height: 24 }} />
  </div>
);


// ── 상세페이지 인라인 에디터 뷰 ──
const PageView = ({ d, heroImg, pointImgs, onUpd, onHero, onPointImg }) => {
  const up = (key, val) => onUpd({ ...d, [key]: val });
  const upPt = (i, k, v) => {
    const base = Array.from({ length: 3 }, (_, j) => (d.points || [])[j] || { title: "", sub: "", body: "" });
    const pts = base.map((p, j) => j === i ? { ...p, [k]: v } : p);
    onUpd({ ...d, points: pts });
  };
  const upSpec = (i, k, v) => { const sp = d.specs.map((s, j) => j === i ? { ...s, [k]: v } : s); onUpd({ ...d, specs: sp }); };

  return (
    <div style={{ width: 860, background: "#fff", margin: "0 auto", fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif", color: "#111" }}>

      {/* ① 헤드라인 텍스트 - 최상단 */}
      <div style={{ padding: "56px 80px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.25, whiteSpace: "pre-line" }}>
          <Ed val={d.headline || ""} onCh={v => up("headline", v)} block style={{ fontSize: "inherit", fontWeight: "inherit", color: "#111" }} />
        </div>
        <div style={{ fontSize: 17, color: "#888", marginTop: 16, lineHeight: 1.7 }}>
          <Ed val={d.subCopy || ""} onCh={v => up("subCopy", v)} style={{ fontSize: "inherit", color: "inherit" }} />
        </div>
      </div>

      {/* ② 대표 썸네일 이미지 */}
      <ClickImg src={heroImg} onReplace={onHero} placeholder="대표 썸네일 이미지를 클릭하여 추가" />

      {/* ③ POINT 섹션들: 이미지 → 텍스트 (항상 3개) */}
      {Array.from({ length: 3 }, (_, i) => {
        const p = (d.points || [])[i] || { title: "", sub: "", body: "" };
        return (
        <div key={i}>
          <div style={{ padding: "60px 80px 52px", textAlign: "center", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
            <div style={{ fontSize: 20, color: "#e63946", marginBottom: 12, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>
              POINT {i + 1}
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#111", marginBottom: 10, lineHeight: 1.2 }}>
              <Ed val={p.title || ""} onCh={v => upPt(i, "title", v)} style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }} />
            </div>
            <div style={{ fontSize: 20, color: "#555", marginBottom: 16 }}>
              <Ed val={p.sub || ""} onCh={v => upPt(i, "sub", v)} style={{ fontSize: "inherit", color: "inherit" }} />
            </div>
            <div style={{ width: 40, height: 3, background: "#222", margin: "0 auto 20px", borderRadius: 2 }} />
            <div style={{ fontSize: 15, color: "#777", lineHeight: 1.9, maxWidth: 580, margin: "0 auto" }}>
              <Ed val={p.body || ""} onCh={v => upPt(i, "body", v)} block style={{ fontSize: "inherit", color: "inherit" }} />
            </div>
          </div>
          <ClickImg src={pointImgs[i]} onReplace={img => onPointImg(i, img)} placeholder={`POINT ${i + 1} 이미지 클릭하여 추가`} />
        </div>
        );
      })}



      {/* ⑦ 상품정보고시 */}
      <div style={{ padding: "44px 60px", background: "#fff", borderTop: "6px solid #f0f0f0" }}>
        <div style={{ fontSize: 23, fontWeight: 900, color: "#111", marginBottom: 20, paddingBottom: 12, borderBottom: "2px solid #ddd" }}>상품정보고시</div>
        {(d.specs || []).map((s, i) => (
          <div key={i} style={{ display: "flex", padding: "13px 0", borderBottom: "1px solid #f0f0f0", fontSize: 19 }}>
            <span style={{ color: "#999", minWidth: 130, fontWeight: 600 }}>
              <Ed val={s.label || ""} onCh={v => upSpec(i, "label", v)} style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }} />
            </span>
            <span style={{ color: "#333", fontWeight: 500, flex: 1 }}>
              <Ed val={s.value || ""} onCh={v => upSpec(i, "value", v)} style={{ fontSize: "inherit", color: "inherit" }} />
            </span>
          </div>
        ))}
      </div>

      {/* ⑧ 고정 하단 */}
      <NoticeSection />
    </div>
  );
};

// ── Claude API 호출 ──
const DP_SYSTEM = `당신은 한국 이커머스(쿠팡/스마트스토어) 상세페이지 전문 카피라이터입니다.
상품 이미지를 분석하여 실제 판매에 바로 쓸 수 있는 데이터를 생성하세요.
JSON만 반환하세요.

{
  "badge": "상단 배지 문구 (예: 유통마진 NO!\\n중간마진 NO!) \\n으로 줄바꿈",
  "headline": "메인 헤드라인 2줄 \\n으로 줄바꿈, 각줄 15자이내",
  "subCopy": "서브 카피 30자이내",
  "urgency": "긴급 구매 유도 문구 \\n으로 줄바꿈 40자이내",
  "points": [
    {"num":"첫 번째","title":"포인트 제목 10자이내","sub":"부제목 20자이내","body":"설명 60자이내"},
    {"num":"두 번째","title":"포인트 제목 10자이내","sub":"부제목 20자이내","body":"설명 60자이내"},
    {"num":"세 번째","title":"포인트 제목 10자이내","sub":"부제목 20자이내","body":"설명 60자이내"}
  ],
  "reviews": [
    {"user":"최*정님","stars":5,"text":"리뷰 내용 40자이내"},
    {"user":"박*수님","stars":5,"text":"리뷰 내용 40자이내"},
    {"user":"김*영님","stars":4,"text":"리뷰 내용 40자이내"}
  ],
  "qna": [
    {"q":"자주 묻는 질문 1","a":"답변 30자이내"},
    {"q":"자주 묻는 질문 2","a":"답변 30자이내"}
  ],
  "specs": [
    {"label":"상품명","value":""},{"label":"중량/용량","value":""},
    {"label":"원산지","value":""},{"label":"제조사/유통사","value":""},
    {"label":"유통기한","value":""},{"label":"보관방법","value":""}
  ],
  "pointContexts": [
    "POINT1 이미지용 Imagen 프롬프트 — 반드시 영문으로 작성. 상품 이미지를 보고 실제 제품의 색상·형태·브랜드 디자인·재질을 극도로 구체적으로 묘사. 예: 'Coca-Cola classic red aluminum can 355ml, iconic white ribbon logo, glossy metallic surface, studio white background, commercial product photography'",
    "POINT2 이미지용 Imagen 프롬프트 — 동일하게 실제 제품 시각 특징을 영문으로 구체 묘사. 다른 각도나 사용 장면 연출 가능",
    "POINT3 이미지용 Imagen 프롬프트 — 동일하게 실제 제품 시각 특징을 영문으로 구체 묘사. 제품 활용/라이프스타일 장면 가능"
  ]
}`;

const parseDataUrl = d => { const m = d.match(/^data:([^;]+);base64,(.+)$/); return m ? { mime: m[1], data: m[2] } : null; };
const parseJSON = t => { const m = t.match(/\{[\s\S]*\}/); if (!m) throw new Error("no json"); return JSON.parse(m[0]); };

const callClaude = async (msg, imgDataUrl = null) => {
  let content = imgDataUrl
    ? (() => { const p = parseDataUrl(imgDataUrl); return p ? [{ type: "image", source: { type: "base64", media_type: p.mime, data: p.data } }, { type: "text", text: msg }] : msg; })()
    : msg;
  const res = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, system: DP_SYSTEM, messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
};

// ── 로그인 화면 ──
const LoginScreen = ({ onLogin }) => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (pw === "0911") { onLogin(); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 2000); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(0,0,0,.12)", width: 340, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 20px" }}>⚡</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1e1b4b", marginBottom: 6 }}>Shift AI</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 32 }}>비밀번호를 입력하세요</div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="비밀번호"
          style={{ width: "100%", padding: "13px 18px", borderRadius: 50, border: `1.5px solid ${err ? "#ef4444" : "#e2e8f0"}`, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12, textAlign: "center", letterSpacing: 4 }}
          autoFocus
        />
        {err && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>비밀번호가 틀렸습니다</div>}
        <button onClick={submit} style={{ width: "100%", padding: "13px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>
          입장
        </button>
      </div>
    </div>
  );
};

// ── 메인 앱 ──
export default function App() {
  const [auth, setAuth] = useState(false);
  const [pname, setPN]   = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError]   = useState("");
  const [result, setResult] = useState(null);
  const [heroImg, setHeroImg]   = useState("");
  const [heroName, setHeroName] = useState("");
  const [pointImgs, setPointImgs] = useState(["", "", ""]);
  const [downloading, setDownloading] = useState(false);
  const pageRef = useRef(null);

const handleHeroUpload = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setHeroImg(ev.target.result); setHeroName(file.name); if (!pname) setPN(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")); };
    r.readAsDataURL(file);
  };

  const generate = async () => {
    if (!pname.trim()) return;
    setLoading(true); setError(""); setResult(null);
    const msgs = ["🔍 이미지 분석 중...", "✏️ 카피 작성 중...", "🖼️ 포인트 이미지 생성 중...", "🎨 마무리 중..."];
    let si = 0; setLoadMsg(msgs[0]);
    const t = setInterval(() => { si = (si + 1) % msgs.length; setLoadMsg(msgs[si]); }, 2500);

    try {
      const msg = heroImg
        ? `이 상품 이미지를 분석하여 상품명 "${pname}"의 상세페이지 JSON을 생성하세요. pointContexts는 이 특정 상품의 실제 특징을 영문으로 구체적으로 설명해 AI 이미지 생성에 활용합니다.`
        : `상품명 "${pname}"의 상세페이지 JSON을 생성하세요.`;
      const text = await callClaude(msg, heroImg || null);
      const parsed = parseJSON(text);

      setLoadMsg("🖼️ POINT 이미지 생성 중...");
      const fetchImg = async ctx => {
        try {
          const r = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_name: pname, context: ctx }) });
          const d = await r.json();
          return d.image ? `data:${d.mime};base64,${d.image}` : "";
        } catch { return ""; }
      };

      const rawCtxs = parsed.pointContexts || (parsed.points || []).map(p => p.title || pname);
      const ctxs = [...rawCtxs, pname, pname, pname].slice(0, 3);
      const pimgs = await Promise.all(
        ctxs.map((ctx, i) => pointImgs[i] ? Promise.resolve(pointImgs[i]) : fetchImg(ctx))
      );
      const pimgs3 = [pimgs[0] || "", pimgs[1] || "", pimgs[2] || ""];
      setResult(parsed);
      setPointImgs(pimgs3);
    } catch (e) {
      console.error(e); setError("생성 오류. 다시 시도해주세요.");
    } finally {
      clearInterval(t); setLoading(false); setLoadMsg("");
    }
  };

  const onUpd = useCallback(newD => setResult(newD), []);
  const onHero = useCallback(img => setHeroImg(img), []);
  const onPointImg = useCallback((i, img) => setPointImgs(prev => { const n = [...prev]; n[i] = img; return n; }), []);


  const downloadJpg = async () => {
    if (!pageRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(pageRef.current, { useCORS: true, allowTaint: true, scale: 1, width: 860, windowWidth: 860 });
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = pname + "_상세페이지.jpg"; a.click(); URL.revokeObjectURL(a.href);
      }, "image/jpeg", 0.95);
    } catch { alert("JPG 변환 오류. HTML 다운로드를 이용하세요."); }
    finally { setDownloading(false); }
  };

  if (!auth) return <LoginScreen onLogin={() => setAuth(true)} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} [contenteditable]:hover{border-bottom-color:rgba(99,102,241,0.6)!important;}`}</style>

      {/* 네비 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8eeff", padding: "10px 28px", display: "flex", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b" }}>Shift AI</span>
        </div>
        <span style={{ marginLeft: 16, padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>상세페이지 생성기</span>
        {result && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={downloadJpg} disabled={downloading}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {downloading ? <><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />변환중...</> : "🖼️ JPG 다운"}
            </button>
            <button onClick={() => { setResult(null); setHeroImg(""); setHeroName(""); setPointImgs(["", "", ""]); }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, cursor: "pointer" }}>🔄 새로 만들기</button>
          </div>
        )}
      </div>

      {!result ? (
        /* ── 입력 화면 ── */
        <div style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px", animation: "fadeUp .4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#1e1b4b", marginBottom: 8, lineHeight: 1.4 }}>상품 이미지 1장 올리면<br/>AI가 상세페이지를 완성해드립니다</div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>POINT 이미지는 AI가 자동 생성 · 텍스트·이미지 클릭하여 직접 수정 가능</div>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
            {/* 이미지 업로드 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", marginBottom: 14 }}>📷 대표 상품 이미지 (썸네일)</div>
              <label style={{ display: "flex", gap: 20, cursor: "pointer", background: "#f8fafc", border: `2px dashed ${heroImg ? "#6366f1" : "#e2e8f0"}`, borderRadius: 16, padding: "20px 24px", transition: "border-color .2s" }}>
                <div style={{ width: 140, height: 140, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {heroImg
                    ? <img src={heroImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <div style={{ textAlign: "center", color: "#ccc" }}><div style={{ fontSize: 40 }}>📦</div><div style={{ fontSize: 11, marginTop: 6 }}>이미지 업로드</div></div>
                  }
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                  {heroImg
                    ? <><div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>✓ {heroName}</div><div style={{ fontSize: 13, color: "#94a3b8" }}>이 이미지가 상세페이지 최상단에 표시됩니다</div></>
                    : <><div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>클릭하여 상품 이미지 선택</div><div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>이미지 없이도 생성 가능하지만,<br/>업로드 시 더 정확한 내용이 만들어집니다</div></>
                  }
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", background: "#eff6ff", padding: "6px 16px", borderRadius: 20 }}>{heroImg ? "이미지 변경" : "파일 선택"}</span>
                    {heroImg && <span onClick={e => { e.preventDefault(); setHeroImg(""); setHeroName(""); }} style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", background: "#fff5f5", padding: "6px 16px", borderRadius: 20 }}>삭제</span>}
                  </div>
                </div>
                <input type="file" accept="image/*" onChange={handleHeroUpload} style={{ display: "none" }} />
              </label>
            </div>

            <div style={{ height: 1, background: "#f1f5f9", marginBottom: 24 }} />

            {/* 상품명 + 생성 */}
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", marginBottom: 12 }}>📝 상품명 <span style={{ color: "#ef4444" }}>*</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={pname}
                onChange={e => setPN(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generate()}
                placeholder="예: 6년근 홍삼 진액 스틱 30포"
                style={{ flex: 1, padding: "14px 20px", borderRadius: 50, border: "1.5px solid #e2e8f0", fontSize: 15, color: "#1e1b4b", fontFamily: "inherit", outline: "none" }}
              />
              <button onClick={generate} disabled={loading || !pname.trim()}
                style={{
                  padding: "14px 28px", borderRadius: 50, border: "none", whiteSpace: "nowrap",
                  background: !pname.trim() ? "#e2e8f0" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: !pname.trim() ? "#aaa" : "#fff", fontSize: 15, fontWeight: 900,
                  cursor: (!pname.trim() || loading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                {loading
                  ? <><span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />{loadMsg}</>
                  : <>{heroImg ? "🔍 분석 후 생성" : "📄 AI 생성"}</>}
              </button>
            </div>
            {error && <div style={{ marginTop: 12, color: "#ef4444", fontSize: 13 }}>⚠️ {error}</div>}

            <div style={{ marginTop: 20, padding: "14px 18px", background: "#f8fafc", borderRadius: 12, fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
              💡 생성 후 <strong style={{ color: "#6366f1" }}>텍스트 클릭 → 수정 + A-/A+ 폰트 조절</strong> · <strong style={{ color: "#555" }}>이미지 클릭 → 교체</strong>
            </div>
          </div>
        </div>
      ) : (
        /* ── 결과 화면 ── */
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={{ background: "#e8eeff", padding: "8px 20px", textAlign: "center", fontSize: 12, color: "#6366f1", fontWeight: 700 }}>
            ✏️ 텍스트 클릭 → 수정 · A-/A+ 폰트 크기 조절 &nbsp;·&nbsp; 🖼️ 이미지 클릭 → 교체
          </div>

<div style={{ background: "#fff", margin: "0 auto", width: 860, boxShadow: "0 0 40px rgba(0,0,0,.12)" }}>
            <div ref={pageRef}>
              <PageView d={result} heroImg={heroImg} pointImgs={pointImgs} onUpd={onUpd} onHero={onHero} onPointImg={onPointImg} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
