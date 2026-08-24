"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  RefreshCw,
  AlertCircle,
  Send,
  Trash2,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description?: string;
  evidence?: string | null;
  asset?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ScanContext {
  domain: string;
  findings: Finding[];
  severityCounts: Record<string, number>;
  lastScanAt: string | null;
}

const SUGGESTED_PROMPTS = [
  "What are my most critical risks right now?",
  "How do I fix the SSL/TLS issues?",
  "Which attack paths are most dangerous?",
  "What should my team remediate first?",
];

const QUICK_ACTIONS: { label: string; type: string }[] = [
  { label: "Full Analysis", type: "full-analysis" },
  { label: "Attack Paths", type: "attack-paths" },
  { label: "Compliance", type: "compliance" },
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "#ff3355", bg: "rgba(255,51,85,0.1)" },
  high: { color: "#ff8800", bg: "rgba(255,136,0,0.1)" },
  medium: { color: "#d29922", bg: "rgba(210,153,34,0.1)" },
  low: { color: "#00ff88", bg: "rgba(0,255,136,0.1)" },
  info: { color: "#666666", bg: "rgba(102,102,102,0.08)" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 180, damping: 22 },
  },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

// ─── Minimal markdown renderer (safe, no HTML injection) ────────────────────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Handles **bold** and `code` spans
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={`${keyPrefix}-c${i}`} className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#00ff88]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-t${i}`}>{part}</span>;
  });
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let orderedList: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={`ul-${key}`} className="space-y-1.5 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-neutral-300 leading-relaxed">
              <span className="text-[#00ff88] mt-0.5 shrink-0">•</span>
              <span>{renderInline(item, `li-${key}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedList.length > 0) {
      blocks.push(
        <ol key={`ol-${key}`} className="space-y-1.5 my-2">
          {orderedList.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-neutral-300 leading-relaxed">
              <span className="font-mono text-[11px] text-[#00ff88] mt-0.5 shrink-0">{i + 1}.</span>
              <span>{renderInline(item, `ol-${key}-${i}`)}</span>
            </li>
          ))}
        </ol>
      );
      orderedList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      flushList(`h${idx}`);
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, "");
      blocks.push(
        <h3
          key={`h-${idx}`}
          className={
            level <= 2
              ? "text-[14px] font-semibold text-white mt-4 mb-1.5 tracking-tight"
              : "text-[13px] font-semibold text-neutral-200 mt-3 mb-1"
          }
        >
          {renderInline(text, `h-${idx}`)}
        </h3>
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (orderedList.length > 0) flushList(`mix-${idx}`);
      listItems.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      if (listItems.length > 0) flushList(`mix-${idx}`);
      orderedList.push(line.replace(/^\s*\d+[.)]\s+/, ""));
    } else if (line.trim() === "") {
      flushList(`br-${idx}`);
    } else {
      flushList(`p-${idx}`);
      blocks.push(
        <p key={`p-${idx}`} className="text-[13px] text-neutral-300 leading-relaxed my-1.5">
          {renderInline(line, `p-${idx}`)}
        </p>
      );
    }
  });
  flushList("end");

  return <div className="space-y-0.5">{blocks}</div>;
}

// ─── Typing Indicator ───────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit" aria-label="Advisor is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#00ff88]"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
      <span className="text-[11px] text-neutral-600 ml-1.5">Analyzing…</span>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdvisorPage() {
  const authHeaders = useAuthHeaders();
  const [context, setContext] = useState<ScanContext | null>(null);
  const [contextError, setContextError] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadContext = useCallback(() => {
    setLoadingContext(true);
    setContextError("");
    fetch("/api/scans", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const scans = data.scans || [];
        if (scans.length === 0) {
          setContext({ domain: "", findings: [], severityCounts: {}, lastScanAt: null });
          return;
        }
        const latest = scans[0];
        const findings: Finding[] = (Array.isArray(latest.findings) ? latest.findings : []).slice(0, 60);
        const severityCounts: Record<string, number> = {};
        findings.forEach((f) => {
          severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
        });
        setContext({
          domain: latest.target?.domain || latest.domain || "",
          findings,
          severityCounts,
          lastScanAt: latest.startedAt || latest.completedAt || null,
        });
      })
      .catch(() => {
        setContextError("Failed to load scan context. The advisor needs scan data to analyze.");
      })
      .finally(() => setLoadingContext(false));
  }, [authHeaders]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (text: string, type?: string) => {
      const trimmed = text.trim();
      if ((!trimmed && !type) || sending) return;
      setChatError("");
      setSending(true);
      setInput("");

      const label =
        type && !trimmed
          ? type === "full-analysis"
            ? "Run a full analysis"
            : type === "attack-paths"
              ? "Show me attack paths"
              : "Assess my compliance"
          : trimmed;
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: label,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const payload: Record<string, unknown> = {
          findings: context?.findings || [],
        };
        if (context?.domain) payload.domain = context.domain;
        if (type) payload.type = type;
        if (trimmed) payload.question = trimmed;

        const res = await fetch("/api/ai-advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.response,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch {
        setChatError("The advisor could not process that request. Please try again.");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [authHeaders, context, sending]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setChatError("");
  };

  const copyMessage = async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const severityRows = useMemo(() => {
    if (!context) return [];
    return ["critical", "high", "medium", "low", "info"]
      .map((sev) => ({ sev, count: context.severityCounts[sev] || 0 }))
      .filter((r) => r.count > 0);
  }, [context]);

  const hasFindings = (context?.findings.length || 0) > 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#00ff88]">
          <Brain />
        </div>
        <div>
          <h1>AI Advisor</h1>
          <p>Security analysis grounded in your live scan evidence — ask anything about your attack surface.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearConversation}
              className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
              aria-label="Clear conversation"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadContext}
            className="border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
            aria-label="Refresh scan context"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingContext ? "animate-spin" : ""}`} />
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
        {/* ─── Chat Panel ─────────────────────────────────────────────── */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="panel flex flex-col h-[calc(100vh-260px)] min-h-[480px]">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4" role="log" aria-label="Advisor conversation">
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.12] flex items-center justify-center mb-5">
                  <Sparkles className="w-6 h-6 text-[#00ff88]" />
                </div>
                <h2 className="text-[15px] font-medium text-white mb-2">Ask your security advisor</h2>
                <p className="text-[13px] text-neutral-600 max-w-md leading-relaxed mb-6">
                  {hasFindings
                    ? `I've analyzed ${context?.findings.length} findings${context?.domain ? ` from ${context.domain}` : ""}. Ask me about risks, remediation, attack paths, or compliance.`
                    : "Run a scan first — once findings exist, I can analyze risks, remediation steps, attack paths, and compliance gaps."}
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      disabled={!hasFindings}
                      className="px-3.5 h-11 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[12px] text-neutral-400 hover:text-white hover:border-white/[0.16] hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%] md:max-w-[75%]">
                    <div
                      className={
                        msg.role === "user"
                          ? "rounded-2xl rounded-tr-md bg-white/[0.07] border border-white/[0.08] px-4 py-3 text-[13px] text-neutral-200 leading-relaxed"
                          : "rounded-2xl rounded-tl-md bg-white/[0.02] border border-white/[0.06] border-l-2 border-l-[#00ff88]/[0.5] px-4 py-3"
                      }
                    >
                      {msg.role === "user" ? msg.content : <MarkdownContent content={msg.content} />}
                    </div>
                    <div className={`flex items-center gap-2 mt-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-neutral-700 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyMessage(idx, msg.content)}
                          className="flex items-center gap-1 text-[10px] text-neutral-700 hover:text-neutral-400 transition-colors px-1.5 h-6 rounded"
                          aria-label="Copy response"
                        >
                          {copiedIdx === idx ? <Check className="w-3 h-3 text-[#00ff88]" /> : <Copy className="w-3 h-3" />}
                          {copiedIdx === idx ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <TypingIndicator />
              </motion.div>
            )}
          </div>

          {/* Error strip */}
          {(chatError || contextError) && (
            <div className="mx-5 mb-3 flex items-center gap-2.5 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-2.5">
              <AlertCircle className="w-4 h-4 text-[#ff3355]/70 shrink-0" />
              <p className="text-[12px] text-[#ff8095] flex-1">{chatError || contextError}</p>
              {contextError && (
                <button onClick={loadContext} className="text-[11px] text-neutral-400 hover:text-white transition-colors" aria-label="Retry loading context">
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-white/[0.05] px-4 py-3.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasFindings ? "Ask about your findings, risks, or remediation…" : "Run a scan to unlock advisor analysis…"}
                rows={1}
                className="flex-1 resize-none bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-neutral-700 outline-none focus:border-white/[0.15] transition-colors max-h-32 min-h-[44px]"
                aria-label="Message the AI advisor"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={sending || !input.trim() || !hasFindings}
                className="h-11 w-11 shrink-0 rounded-xl bg-[#00ff88] text-black flex items-center justify-center transition-all hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-700 mt-2 px-1">Enter to send · Shift+Enter for a new line · Responses are derived from your scan evidence</p>
          </div>
        </motion.div>

        {/* ─── Context Panel ──────────────────────────────────────────── */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
          <motion.div variants={fadeUp} className="panel p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-neutral-500" />
              <h2 className="text-[12px] font-semibold text-neutral-300 tracking-tight">Scan Context</h2>
            </div>

            {loadingContext ? (
              <div className="space-y-3">
                <div className="skeleton-pulse h-4 w-3/4" />
                <div className="skeleton-pulse h-4 w-1/2" />
                <div className="skeleton-pulse h-4 w-2/3" />
              </div>
            ) : contextError && !context ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="w-5 h-5 text-[#ff3355]/60" />
                <p className="text-[11px] text-neutral-600 text-center">Context unavailable</p>
                <Button variant="outline" size="sm" onClick={loadContext} className="border-white/10 text-neutral-400 hover:text-white h-9" aria-label="Retry context load">
                  <RefreshCw className="mr-1.5 h-3 w-3" /> Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {context?.domain ? (
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <span className="text-[12px] font-mono text-neutral-300 truncate">{context.domain}</span>
                  </div>
                ) : null}

                {hasFindings ? (
                  <>
                    <div className="space-y-2">
                      {severityRows.map(({ sev, count }) => {
                        const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
                        return (
                          <div key={sev} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[12px] text-neutral-500">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                              {sev.charAt(0).toUpperCase() + sev.slice(1)}
                            </span>
                            <span className="text-[12px] font-mono font-medium" style={{ color: cfg.color }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <span className="text-[11px] text-neutral-600">Total findings attached</span>
                      <span className="text-[12px] font-mono text-white">{context?.findings.length}</span>
                    </div>
                    {context?.lastScanAt && (
                      <p className="text-[10px] text-neutral-700 font-mono">
                        Last scan:{" "}
                        {new Date(context.lastScanAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-neutral-700" />
                    <p className="text-[11px] text-neutral-600 leading-relaxed">No scan data yet. Run a scan to give the advisor evidence to analyze.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-neutral-500" />
              <h2 className="text-[12px] font-semibold text-neutral-300 tracking-tight">Deep Dives</h2>
            </div>
            <div className="flex flex-col gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.type}
                  onClick={() => sendMessage("", action.type)}
                  disabled={sending || !hasFindings}
                  className="w-full text-left px-3.5 h-11 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[12px] text-neutral-400 hover:text-white hover:border-white/[0.14] hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-700 mt-3 leading-relaxed">
              Deep dives re-analyze your full findings set for structured reports, chained attack paths, and framework gaps.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
