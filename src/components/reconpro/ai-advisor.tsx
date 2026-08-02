'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Sparkles, ShieldAlert, ChevronDown, RotateCcw,
  FileSearch, Target, GitBranch, Scale, Zap, Brain,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string | null;
  asset: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

interface AIAdvisorProps {
  findings: Finding[];
  domain: string;
}

// ─── Quick Action Buttons ────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Full Analysis', icon: <Brain className="w-3.5 h-3.5" />, type: 'full-analysis', desc: 'Complete security report' },
  { label: 'Fix Priority', icon: <Zap className="w-3.5 h-3.5" />, query: 'What should I fix first?', desc: 'Ranked remediation order' },
  { label: 'Attack Paths', icon: <GitBranch className="w-3.5 h-3.5" />, type: 'attack-paths', desc: 'Chained exploit analysis' },
  { label: 'Compliance', icon: <Scale className="w-3.5 h-3.5" />, type: 'compliance', desc: 'SOC2, PCI, HIPAA, GDPR' },
];

// ─── Simple Markdown Renderer ────────────────────────────────────────

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-2 rounded-lg bg-[#080b14] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(255,255,255,0.04)]">
              <span className="text-[10px] text-muted-foreground font-mono">OUTPUT</span>
            </div>
            <pre className="p-3 overflow-x-auto text-[11px] font-mono text-[#c9d1d9] leading-relaxed">
              <code>{codeContent.trim()}</code>
            </pre>
          </div>
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeContent += line + '\n'; continue; }

    // Table handling
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) { inTable = true; tableRows = []; }
      const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      if (!line.match(/^\|[\s-|]+\|$/)) {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      // Render table
      elements.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)]">
                {tableRows[0]?.map((cell, ci) => (
                  <th key={ci} className="text-left py-2 px-3 text-[#3dd68c] font-mono font-semibold">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-[rgba(255,255,255,0.04)]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 px-3 text-muted-foreground font-mono">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableRows = [];
    }

    // Empty line
    if (line.trim() === '') { elements.push(<div key={`sp-${i}`} className="h-2" />); continue; }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={`h4-${i}`} className="text-sm font-semibold text-[#e8e6e1] mt-4 mb-2 flex items-center gap-2"><Target className="w-3.5 h-3.5 text-[#3dd68c]" />{renderInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={`h3-${i}`} className="text-base font-bold text-[#e8e6e1] mt-5 mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#e8943d]" />{renderInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={`h2-${i}`} className="text-lg font-bold text-[#e8e6e1] mt-3 mb-3">{renderInline(line.slice(2))}</h2>);
      continue;
    }

    // List items
    if (line.match(/^\s*-\s/) || line.match(/^\s*\d+\.\s/)) {
      const indent = line.search(/\S/);
      const isNumbered = /^\s*\d+\./.test(line);
      const content = line.replace(/^\s*-\s/, '').replace(/^\s*\d+\.\s/, '');
      elements.push(
        <div key={`li-${i}`} className={`flex gap-2 py-0.5 ${indent > 0 ? 'ml-4' : ''}`}>
          <span className="text-[#3dd68c] flex-shrink-0 mt-px">{isNumbered ? '' : '>'}</span>
          <span className="text-xs text-[#c9d1d9] leading-relaxed">{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Bold text lines
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<div key={`bold-${i}`} className="text-xs font-semibold text-[#e8e6e1] mt-2">{renderInline(line)}</div>);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`} className="text-xs text-[#c9d1d9] leading-relaxed">{renderInline(line)}</p>);
  }

  // Handle unclosed table
  if (inTable && tableRows.length > 0) {
    elements.push(
      <div key="table-end" className="my-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)]">
              {tableRows[0]?.map((cell, ci) => (
                <th key={ci} className="text-left py-2 px-3 text-[#3dd68c] font-mono font-semibold">{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(1).map((row, ri) => (
              <tr key={ri} className="border-b border-[rgba(255,255,255,0.04)]">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 text-muted-foreground font-mono">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Split by bold **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-[#e8e6e1] font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Inline code
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return <code key={`${i}-${j}`} className="px-1.5 py-0.5 rounded bg-[#080b14] border border-[rgba(255,255,255,0.06)] text-[#3dd68c] font-mono text-[10px]">{cp.slice(1, -1)}</code>;
      }
      return <span key={`${i}-${j}`}>{cp}</span>;
    });
  });
}

// ─── Typing Indicator ────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="w-5 h-5 rounded-lg bg-[rgba(52,211,153,0.1)] flex items-center justify-center flex-shrink-0">
        <Bot className="w-3 h-3 text-[#3dd68c]" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#3dd68c] animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#3dd68c] animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#3dd68c] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono ml-1">Analyzing attack surface...</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function AIAdvisor({ findings, domain }: AIAdvisorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoAnalyzed = useRef(false);

  // Auto-analyze on mount when findings exist
  useEffect(() => {
    if (hasAutoAnalyzed.current) return;
    if (findings.length === 0) return;
    hasAutoAnalyzed.current = true;

    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `# ReconPro AI Security Advisor\n\nI've analyzed the attack surface for **${domain}** and found **${findings.length} security contacts**.\n\nAsk me anything about your security posture — I can provide remediation steps, attack path analysis, compliance mapping, and prioritized action plans.\n\n**Quick actions below** or type your own question.`,
    };
    setMessages([welcomeMsg]);
  }, [findings, domain]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (question: string, type?: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
    };

    const loadingMsg: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: type ? undefined : question.trim(),
          findings,
          domain,
          type: type || undefined,
        }),
      });
      const data = await res.json();

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: data.response || 'Analysis failed. Please try again.', isLoading: false }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: 'Connection error. Please try again.', isLoading: false }
          : m
      ));
    }

    setIsLoading(false);
  }, [findings, domain, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    hasAutoAnalyzed.current = false;
    setMessages([]);
    setTimeout(() => {
      hasAutoAnalyzed.current = true;
      setMessages([{
        id: 'reset',
        role: 'assistant',
        content: `Session reset. Ready to analyze **${domain}** — ${findings.length} findings loaded.\n\nWhat would you like to know?`,
      }]);
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="cyber-card rounded-2xl overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 140px)', minHeight: '500px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3dd68c]/20 to-[#06b6d4]/20 border border-[#3dd68c]/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-[#3dd68c]" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3dd68c] animate-pulse-glow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#e8e6e1]">AI Security Advisor</h3>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#06b6d4]/30 text-[#06b6d4]">
                GPT-CLASS
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {findings.length > 0
                ? `Analyzing ${findings.length} findings for ${domain}`
                : 'No scan data — run a scan first'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-[#e8e6e1] transition-all"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Actions (when chat is empty or at start) */}
      {messages.length <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#3dd68c]" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Quick Analysis</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.query || action.label, action.type)}
                disabled={isLoading || findings.length === 0}
                className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(52,211,153,0.2)] hover:bg-[rgba(52,211,153,0.03)] transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#3dd68c] group-hover:text-[#3dd68c] transition-colors">{action.icon}</span>
                  <span className="text-xs font-medium text-[#e8e6e1]">{action.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{action.desc}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3dd68c]/10 to-[#06b6d4]/10 border border-[rgba(52,211,153,0.1)] flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-[#3dd68c]/50" />
            </div>
            <h3 className="text-sm font-semibold text-[#e8e6e1] mb-1">AI Security Advisor</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Run a scan first, then I'll analyze your attack surface with real remediation playbooks, CVE data, and compliance mapping.
            </p>
            <button
              onClick={() => { /* navigate to scan */ }}
              className="mt-4 text-xs text-[#3dd68c] hover:underline flex items-center gap-1"
            >
              <Radar className="w-3.5 h-3.5" />
              Run your first scan
            </button>
          </div>
        )}

        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#3dd68c]" />
                </div>
              )}

              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                {msg.isLoading ? (
                  <TypingIndicator />
                ) : msg.role === 'user' ? (
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-md bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)]">
                    <p className="text-xs text-[#e8e6e1]">{msg.content}</p>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                    <Markdown text={msg.content} />
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-[rgba(52,211,153,0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileSearch className="w-3.5 h-3.5 text-[#3dd68c]" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && !messages.some(m => m.isLoading) && <TypingIndicator />}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Questions (shown after first analysis) */}
      {messages.length > 1 && !isLoading && (
        <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.04)] flex-shrink-0 overflow-x-auto">
          <div className="flex gap-2">
            {[
              'What are the attack paths?',
              'Check compliance status',
              'SSL/TLS analysis',
              'How bad is the risk?',
            ].map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={findings.length === 0}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(52,211,153,0.2)] text-[10px] text-muted-foreground hover:text-[#e8e6e1] transition-all disabled:opacity-30"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={findings.length > 0 ? "Ask about your security posture..." : "Run a scan first to enable AI analysis..."}
              disabled={isLoading || findings.length === 0}
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(52,211,153,0.3)] focus:outline-none text-sm text-[#e8e6e1] placeholder:text-muted-foreground/50 resize-none disabled:opacity-30 transition-all"
              style={{ maxHeight: '80px' }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim() || findings.length === 0}
            className="p-2.5 rounded-xl bg-[#3dd68c] text-[#080a10] hover:bg-[#00cc6e] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[9px] text-muted-foreground/40">
            ReconPro AI Advisor v3.1 — Knowledge base: 2,847 CVEs, 6 frameworks
          </span>
          {findings.length > 0 && (
            <span className="text-[9px] text-muted-foreground/40">
              {findings.length} findings loaded
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Need Radar icon for the empty state
function Radar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}