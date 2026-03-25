import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ─── Utility: animated counter ───────────────────────────────────────────────
function useCounter(target, duration = 1500, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return val;
}

// ─── Scanline overlay ─────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,200,0.5) 2px, rgba(0,255,200,0.5) 4px)",
      }}
    />
  );
}

// ─── Corner bracket decoration ───────────────────────────────────────────────
function CornerBrackets({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ffc8]" />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00ffc8]" />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00ffc8]" />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ffc8]" />
      {children}
    </div>
  );
}

// ─── Glitch text ─────────────────────────────────────────────────────────────
function GlitchText({ text, className = "" }) {
  return (
    <span
      className={`relative inline-block ${className}`}
      style={{ "--glitch-text": `"${text}"` }}
    >
      {text}
      <style>{`
        @keyframes glitch1 {
          0%,100% { clip-path: inset(0 0 95% 0); transform: translate(-2px,0) }
          20% { clip-path: inset(30% 0 50% 0); transform: translate(2px,0) }
          40% { clip-path: inset(70% 0 10% 0); transform: translate(-1px,0) }
          60% { clip-path: inset(10% 0 80% 0); transform: translate(1px,0) }
          80% { clip-path: inset(50% 0 30% 0); transform: translate(-2px,0) }
        }
        @keyframes glitch2 {
          0%,100% { clip-path: inset(60% 0 20% 0); transform: translate(2px,0) skewX(1deg) }
          25% { clip-path: inset(20% 0 60% 0); transform: translate(-2px,0) }
          50% { clip-path: inset(80% 0 5% 0); transform: translate(1px,0) skewX(-1deg) }
          75% { clip-path: inset(5% 0 85% 0); transform: translate(-1px,0) }
        }
        @keyframes pulse-border {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,255,200,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(0,255,200,0); }
        }
        @keyframes float-up {
          0% { opacity:0; transform: translateY(30px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes scan-down {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-reverse { to { transform: rotate(-360deg); } }
        @keyframes data-stream {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, suffix = "", active }) {
  const counted = useCounter(value, 1800, active);
  return (
    <CornerBrackets className="p-6 bg-[#050d0a] text-center min-w-[140px]">
      <div className="text-4xl font-bold text-[#00ffc8] font-mono tracking-tight">
        {counted}{suffix}
      </div>
      <div className="text-xs text-[#4a7a6a] mt-1 uppercase tracking-widest font-mono">
        {label}
      </div>
    </CornerBrackets>
  );
}

// ─── Probability bar chart ────────────────────────────────────────────────────
const CLASS_COLORS = {
  Combat: "#ff3b3b",
  DestroyedBuildings: "#ff8c00",
  Fire: "#ffcc00",
  Humanitarian_Aid_and_rehabilitation: "#00ffc8",
  Military_vehicles_and_weapons: "#00aaff",
};

function ProbabilityChart({ data }) {
  const chartData = Object.entries(data).map(([name, prob]) => ({
    name: name.replace(/_/g, " "),
    rawName: name,
    value: Math.round(prob * 100),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#050d0a] border border-[#00ffc8]/30 px-3 py-2 font-mono text-xs text-[#00ffc8]">
          <p>{payload[0].payload.name}</p>
          <p className="text-white font-bold">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,200,0.08)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#4a7a6a", fontSize: 9, fontFamily: "monospace" }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: "#4a7a6a", fontSize: 10, fontFamily: "monospace" }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.rawName} fill={CLASS_COLORS[entry.rawName] || "#00ffc8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Quantum ring animation ───────────────────────────────────────────────────
function QuantumRing({ size = 120, active = false }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full border-2 border-[#00ffc8]/30"
        style={{ animation: active ? "spin-slow 3s linear infinite" : "none" }}
      />
      <div
        className="absolute rounded-full border border-[#00aaff]/40"
        style={{
          inset: "10px",
          animation: active ? "spin-reverse 2s linear infinite" : "none",
          borderStyle: "dashed",
        }}
      />
      <div
        className="absolute rounded-full border border-[#00ffc8]/20"
        style={{ inset: "20px", animation: active ? "spin-slow 5s linear infinite" : "none" }}
      />
      <div className="w-2 h-2 rounded-full bg-[#00ffc8]" style={{
        boxShadow: active ? "0 0 12px #00ffc8, 0 0 24px #00ffc8" : "0 0 6px #00ffc8"
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home"); // "home" | "analyze"
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [statsActive, setStatsActive] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setStatsActive(true), 600);
    return () => clearTimeout(timer);
  }, [page]);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    setImageFile(file);
    setResults(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Process ─────────────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!imageFile) return;
    setProcessing(true);
    setError(null);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
        console.log("error:",err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ══════════════════════════════════════════════════════════════════════════════
  if (page === "home") {
    return (
      <div className="min-h-screen bg-[#020a07] text-white overflow-x-hidden">
        <Scanlines />

        {/* grid background */}
        <div
          className="fixed inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,200,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-[#00ffc8]/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00ffc8] animate-pulse" />
            <span className="font-mono text-xs text-[#00ffc8] tracking-[0.3em] uppercase">
              Q-Shield Intel v2.4
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#2a5a4a]">
            <span>CLEARANCE:</span>
            <span className="text-[#ff3b3b]">TOP SECRET // QUANTUM</span>
          </div>
        </div>

        {/* hero */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-8 text-center">
          {/* quantum ring hero */}
          <div className="mb-8">
            <QuantumRing size={160} active />
          </div>

          {/* classification badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="h-px w-12 bg-[#00ffc8]/40" />
            <span className="font-mono text-xs text-[#00ffc8] tracking-[0.4em] uppercase">
              Quantum Defense Intelligence
            </span>
            <span className="h-px w-12 bg-[#00ffc8]/40" />
          </div>

          {/* headline */}
          <h1
            className="text-5xl md:text-7xl font-black uppercase leading-none mb-6"
            style={{ fontFamily: "'Courier New', monospace", letterSpacing: "-0.02em" }}
          >
            <span className="block text-white">
              <GlitchText text="Quantum-" />
            </span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #00ffc8 0%, #00aaff 60%, #7b2fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Enhanced
            </span>
            <span className="block text-white text-4xl md:text-5xl">
              Battlefield Vision
            </span>
          </h1>

          {/* subheadline */}
          <p className="max-w-2xl text-[#4a7a6a] font-mono text-sm md:text-base leading-relaxed mb-4">
            Hybrid Quantum-Classical CNN deployed on military drone feeds —
            <span className="text-[#00ffc8]"> detecting threats</span>, classifying assets,
            and segmenting battlespace objects in real time.
          </p>
          <p className="max-w-xl text-[#2a5a4a] font-mono text-xs leading-relaxed mb-10">
            Powered by PennyLane quantum circuits fused with MobileNetV2 backbone + YOLO11 segmentation.
            Quantum parallelism delivers <span className="text-[#00aaff]">exponential state-space coverage</span> impossible with classical models alone.
          </p>

          {/* CTA */}
          <button
            onClick={() => { setPage("analyze"); setStatsActive(false); }}
            className="relative group px-10 py-4 font-mono text-sm tracking-[0.3em] uppercase font-bold text-[#020a07] bg-[#00ffc8] overflow-hidden transition-all duration-300 hover:scale-105"
            style={{ animation: "pulse-border 2s ease-in-out infinite" }}
          >
            <span className="relative z-10">⬡ Initialize Analysis</span>
            <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
        </section>

        {/* stats row */}
        <section className="relative z-10 px-8 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6 mb-16">
              <StatCard value={5} label="Threat Classes" active={statsActive} />
              <StatCard value={4} label="Qubits Active" active={statsActive} />
              <StatCard value={2} label="Quantum Layers" active={statsActive} />
              <StatCard value={99} label="Entangled States" suffix="%" active={statsActive} />
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="relative z-10 px-8 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="font-mono text-xs text-[#00ffc8] tracking-[0.4em] uppercase">
                System Architecture
              </span>
              <h2 className="text-3xl font-black font-mono uppercase text-white mt-2">
                Quantum Advantage Explained
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "◈",
                  title: "Quantum Encoding",
                  color: "#00ffc8",
                  desc: "AngleEmbedding maps MobileNetV2 features into qubit rotations — encoding exponentially more information per parameter than classical neurons.",
                },
                {
                  icon: "⊗",
                  title: "Quantum Convolution",
                  color: "#00aaff",
                  desc: "U3 gates + CNOT entanglement layers perform quantum convolution across qubit pairs, capturing non-local correlations classical CNNs miss.",
                },
                {
                  icon: "⟨ψ|",
                  title: "Pooling & Readout",
                  color: "#7b2fff",
                  desc: "CRZ/CRX quantum pooling hierarchically collapses qubit states. Pauli-Z measurements extract quantum expectation values for final classification.",
                },
              ].map((item) => (
                <CornerBrackets key={item.title} className="p-6 bg-[#050d0a]">
                  <div
                    className="text-3xl mb-3 font-mono font-bold"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <h3
                    className="font-mono text-sm font-bold uppercase tracking-widest mb-2"
                    style={{ color: item.color }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[#4a7a6a] text-xs leading-relaxed font-mono">
                    {item.desc}
                  </p>
                </CornerBrackets>
              ))}
            </div>
          </div>
        </section>

        {/* classes */}
        <section className="relative z-10 px-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <span className="font-mono text-xs text-[#00ffc8] tracking-[0.4em] uppercase">
                Detection Categories
              </span>
              <h2 className="text-2xl font-black font-mono uppercase text-white mt-2">
                Threat Classification Matrix
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { name: "Combat", color: "#ff3b3b", icon: "⚔" },
                { name: "Destroyed Buildings", color: "#ff8c00", icon: "🏚" },
                { name: "Fire", color: "#ffcc00", icon: "🔥" },
                { name: "Humanitarian Aid", color: "#00ffc8", icon: "⛑" },
                { name: "Military Vehicles & Weapons", color: "#00aaff", icon: "🚁" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="flex flex-col items-center gap-2 p-4 bg-[#050d0a] border border-[#0a1f17] hover:border-opacity-60 transition-all"
                  style={{ borderColor: `${c.color}20` }}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider text-center leading-tight"
                    style={{ color: c.color }}
                  >
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* bottom CTA */}
        <section className="relative z-10 px-8 pb-20 text-center">
          <div className="border-t border-[#00ffc8]/10 pt-16">
            <p className="font-mono text-xs text-[#2a5a4a] tracking-widest uppercase mb-6">
              Ready to run analysis?
            </p>
            <button
              onClick={() => { setPage("analyze"); setStatsActive(false); }}
              className="px-12 py-5 font-mono text-sm tracking-[0.3em] uppercase font-bold text-[#00ffc8] border border-[#00ffc8]/40 bg-transparent hover:bg-[#00ffc8]/5 transition-all duration-300 hover:border-[#00ffc8]"
            >
              ⬡ Launch Intel Analyzer →
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ANALYZE PAGE
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#020a07] text-white">
      <Scanlines />
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,200,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* nav */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-[#00ffc8]/10">
        <button
          onClick={() => setPage("home")}
          className="font-mono text-xs text-[#00ffc8] tracking-[0.3em] uppercase hover:text-white transition-colors flex items-center gap-2"
        >
          ← Q-Shield Intel
        </button>
        <div className="flex items-center gap-2">
          <QuantumRing size={28} active={processing} />
          <span className="font-mono text-xs text-[#4a7a6a] tracking-widest uppercase">
            {processing ? "Quantum Processing..." : "Standby"}
          </span>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {/* page title */}
        <div className="mb-10">
          <span className="font-mono text-xs text-[#00ffc8] tracking-[0.4em] uppercase">
            Module: Image Intelligence
          </span>
          <h1 className="text-4xl font-black font-mono uppercase text-white mt-1">
            Quantum Threat Analyzer
          </h1>
          <p className="text-[#4a7a6a] font-mono text-xs mt-2 max-w-xl leading-relaxed">
            Upload a drone capture or battlefield image. The Hybrid Q-CNN classifies the scene
            across 5 threat categories while YOLO11 segments and counts all detected objects.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT: upload + controls */}
          <div className="space-y-6">
            {/* how it works mini-guide */}
            <CornerBrackets className="p-5 bg-[#050d0a]">
              <h3 className="font-mono text-xs text-[#00ffc8] uppercase tracking-widest mb-3">
                ⟨ψ| Pipeline Overview
              </h3>
              <ol className="space-y-2">
                {[
                  ["01", "Image → MobileNetV2", "Classical feature extraction (1280-dim)"],
                  ["02", "Feature → Qubit Space", "Linear reducer maps to 4 qubits via Tanh"],
                  ["03", "QCNN Circuit", "Quantum conv + pool layers (2×) with U3 + CNOT"],
                  ["04", "Measurement", "Pauli-Z expectation values read out quantum state"],
                  ["05", "Hybrid Classifier", "Q-output fused with bypass path → 5-class logits"],
                  ["06", "YOLO11 Segmentation", "Parallel object detection & pixel segmentation"],
                ].map(([num, title, desc]) => (
                  <li key={num} className="flex gap-3 items-start">
                    <span className="font-mono text-xs text-[#00ffc8] shrink-0 mt-0.5">{num}</span>
                    <div>
                      <span className="font-mono text-xs text-white">{title}</span>
                      <span className="font-mono text-[10px] text-[#3a6a5a] ml-2">{desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </CornerBrackets>

            {/* drop zone */}
            <div
              className={`relative border-2 border-dashed transition-all duration-300 cursor-pointer group ${
                image
                  ? "border-[#00ffc8]/60 bg-[#050d0a]"
                  : "border-[#00ffc8]/20 bg-[#050d0a] hover:border-[#00ffc8]/50"
              }`}
              style={{ minHeight: "220px" }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {image ? (
                <div className="relative">
                  <img
                    src={image}
                    alt="upload preview"
                    className="w-full object-cover max-h-64"
                  />
                  {/* scan line animation on image */}
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-[#00ffc8]/40 pointer-events-none"
                    style={{ animation: "scan-down 2s linear infinite", top: 0 }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#020a07] to-transparent h-8" />
                  <div className="absolute top-2 right-2 font-mono text-xs text-[#00ffc8] bg-[#020a07]/80 px-2 py-1">
                    LOADED ✓
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                  <div className="text-4xl text-[#1a4a3a]">⬡</div>
                  <p className="font-mono text-sm text-[#2a5a4a]">
                    DROP IMAGE / CLICK TO UPLOAD
                  </p>
                  <p className="font-mono text-xs text-[#1a3a2a]">
                    PNG · JPG · WEBP
                  </p>
                </div>
              )}
            </div>

            {/* process button */}
            <button
              onClick={handleProcess}
              disabled={!image || processing}
              className={`w-full py-4 font-mono text-sm tracking-[0.3em] uppercase font-bold transition-all duration-300 relative overflow-hidden ${
                !image || processing
                  ? "bg-[#0a1f17] text-[#2a5a4a] cursor-not-allowed"
                  : "bg-[#00ffc8] text-[#020a07] hover:scale-[1.02]"
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="inline-block w-3 h-3 border-2 border-[#020a07] border-t-transparent rounded-full" style={{ animation: "spin-slow 0.8s linear infinite" }} />
                  Quantum Circuit Running...
                </span>
              ) : (
                "⬡ Run Quantum Analysis"
              )}
            </button>

            {error && (
              <div className="border border-[#ff3b3b]/40 bg-[#1a0505] p-4 font-mono text-xs text-[#ff3b3b]">
                ✖ ERROR: {error}
              </div>
            )}
          </div>

          {/* RIGHT: results */}
          <div className="space-y-6">
            {!results && !processing && (
              <CornerBrackets className="p-8 bg-[#050d0a] flex flex-col items-center justify-center min-h-[400px]">
                <QuantumRing size={80} active={false} />
                <p className="font-mono text-xs text-[#2a5a4a] mt-4 text-center uppercase tracking-widest">
                  Awaiting Image Input
                </p>
                <p className="font-mono text-[10px] text-[#1a3a2a] mt-2 text-center">
                  Upload an image and press Analyze
                </p>
              </CornerBrackets>
            )}

            {processing && (
              <CornerBrackets className="p-8 bg-[#050d0a] flex flex-col items-center justify-center min-h-[400px]">
                <QuantumRing size={100} active />
                <div className="mt-6 space-y-2 w-full max-w-xs">
                  {["Encoding features to qubits...", "Executing QCNN circuit...", "Collapsing quantum state...", "Running YOLO segmentation..."].map((msg, i) => (
                    <div key={i} className="flex items-center gap-2" style={{ animationDelay: `${i * 0.4}s` }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00ffc8]" style={{ animation: "blink 1s infinite", animationDelay: `${i * 0.3}s` }} />
                      <span className="font-mono text-xs text-[#4a7a6a]">{msg}</span>
                    </div>
                  ))}
                </div>
              </CornerBrackets>
            )}

            {results && (
              <div className="space-y-4" style={{ animation: "float-up 0.5s ease forwards" }}>
                {/* primary result */}
                <CornerBrackets className="p-6 bg-[#050d0a]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="font-mono text-xs text-[#4a7a6a] uppercase tracking-widest">
                        Primary Classification
                      </span>
                      <h2
                        className="text-2xl font-black font-mono uppercase mt-1"
                        style={{
                          color: CLASS_COLORS[results.predicted_class] || "#00ffc8",
                        }}
                      >
                        {results.predicted_class.replace(/_/g, " ")}
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs text-[#4a7a6a] uppercase">Confidence</span>
                      <div
                        className="text-3xl font-black font-mono"
                        style={{ color: CLASS_COLORS[results.predicted_class] || "#00ffc8" }}
                      >
                        {(results.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* confidence bar */}
                  <div className="h-1.5 bg-[#0a1f17] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${results.confidence * 100}%`,
                        background: `linear-gradient(90deg, ${CLASS_COLORS[results.predicted_class] || "#00ffc8"}, #00ffc8)`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex gap-6">
                    <div>
                      <span className="font-mono text-[10px] text-[#2a5a4a] uppercase tracking-wider">Objects Detected</span>
                      <div className="text-xl font-black font-mono text-[#00aaff] mt-0.5">
                        {results.detected_objects}
                      </div>
                    </div>
                  </div>
                </CornerBrackets>

                {/* segmented image */}
                {results.segmented_image && (
                  <CornerBrackets className="p-4 bg-[#050d0a]">
                    <span className="font-mono text-xs text-[#4a7a6a] uppercase tracking-widest block mb-3">
                      YOLO11 Segmentation Output
                    </span>
                    <img
                      src={`data:image/jpeg;base64,${results.segmented_image}`}
                      alt="segmentation"
                      className="w-full rounded"
                    />
                  </CornerBrackets>
                )}

                {/* probability chart */}
                <CornerBrackets className="p-6 bg-[#050d0a]">
                  <span className="font-mono text-xs text-[#4a7a6a] uppercase tracking-widest block mb-4">
                    Class Probability Distribution
                  </span>
                  <ProbabilityChart data={results.all_probabilities} />
                  <div className="flex flex-wrap gap-3 mt-4">
                    {Object.entries(CLASS_COLORS).map(([name, color]) => (
                      <div key={name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                        <span className="font-mono text-[9px] text-[#4a7a6a]">
                          {name.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CornerBrackets>

                {/* all class probabilities table */}
                <CornerBrackets className="p-6 bg-[#050d0a]">
                  <span className="font-mono text-xs text-[#4a7a6a] uppercase tracking-widest block mb-4">
                    Full Probability Matrix
                  </span>
                  <div className="space-y-3">
                    {Object.entries(results.all_probabilities)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, prob]) => (
                        <div key={name}>
                          <div className="flex justify-between mb-1">
                            <span className="font-mono text-xs text-[#4a7a6a]">
                              {name.replace(/_/g, " ")}
                            </span>
                            <span
                              className="font-mono text-xs font-bold"
                              style={{ color: CLASS_COLORS[name] || "#00ffc8" }}
                            >
                              {(prob * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="h-1 bg-[#0a1f17] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${prob * 100}%`,
                                background: CLASS_COLORS[name] || "#00ffc8",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CornerBrackets>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}