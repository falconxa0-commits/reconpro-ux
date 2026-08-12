"use client";

import { useState } from "react";
import { cliCommands } from "@/data/content";
import { useInView } from "@/hooks/useInView";

function highlightSyntax(command: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex to match: prompt ($ ), command name, flags (--flag), values, and output prefixes
  const regex =
    /(\$\s)|(\[--?[\w-]+\])|(\[\+\])|(\[-\])|(\[\*\])|(\[i\])|("[^"]*"|'[^']*')|(\S+)/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(command)) !== null) {
    // Add any text between matches as plain white/60
    if (match.index > lastIndex) {
      parts.push(
        <span key={`gap-${lastIndex}`} className="text-white/60">
          {command.slice(lastIndex, match.index)}
        </span>
      );
    }

    const value = match[0];

    if (match[1]) {
      // Prompt "$ "
      parts.push(
        <span key={`prompt-${match.index}`} className="text-white/60">
          {value}
        </span>
      );
    } else if (match[2]) {
      // Flags like --flag
      parts.push(
        <span key={`flag-${match.index}`} className="text-[#44aaff]">
          {value}
        </span>
      );
    } else if (match[3]) {
      // [+] output prefix
      parts.push(
        <span key={`plus-${match.index}`} className="text-[#00ff88]">
          {value}
        </span>
      );
    } else if (match[4]) {
      // [-] output prefix
      parts.push(
        <span key={`minus-${match.index}`} className="text-[#ff4466]">
          {value}
        </span>
      );
    } else if (match[5]) {
      // [*] output prefix
      parts.push(
        <span key={`star-${match.index}`} className="text-[#ffaa00]">
          {value}
        </span>
      );
    } else if (match[6]) {
      // [i] output prefix
      parts.push(
        <span key={`info-${match.index}`} className="text-[#44aaff]">
          {value}
        </span>
      );
    } else if (match[7]) {
      // Quoted values
      parts.push(
        <span key={`quoted-${match.index}`} className="text-[#00ff88]">
          {value}
        </span>
      );
    } else if (match[8]) {
      // Command name (first token after prompt)
      const before = command.slice(0, match.index);
      const isCommand = before.trim().length === 0 || before.endsWith("$ ");
      // Also check if it looks like a flag
      const looksLikeFlag = value.startsWith("-");

      if (isCommand && !looksLikeFlag) {
        parts.push(
          <span key={`cmd-${match.index}`} className="text-white font-semibold">
            {value}
          </span>
        );
        // After the command name, the rest of tokens on that line are args/values
        // We'll let subsequent iterations handle them
      } else if (looksLikeFlag) {
        parts.push(
          <span key={`flag-${match.index}`} className="text-[#44aaff]">
            {value}
          </span>
        );
        // Values after flags
      } else {
        // Check if preceded by a flag
        const preceding = command.slice(Math.max(0, match.index - 30), match.index);
        if (/--?[\w-]+\s*$/.test(preceding) || /\$\s\S+\s+\S+/.test(command.slice(0, match.index))) {
          parts.push(
            <span key={`val-${match.index}`} className="text-[#00ff88]">
              {value}
            </span>
          );
        } else {
          parts.push(
            <span key={`default-${match.index}`} className="text-white/80">
              {value}
            </span>
          );
        }
      }
    }

    lastIndex = match.index + value.length;
  }

  // Remaining text
  if (lastIndex < command.length) {
    parts.push(
      <span key={`tail-${lastIndex}`} className="text-white/60">
        {command.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

function parseAndHighlight(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const isPrompt = line.startsWith("$");
    const isPlus = line.startsWith("[+]");
    const isMinus = line.startsWith("[-]");
    const isStar = line.startsWith("[*]");
    const isInfo = line.startsWith("[i]");

    if (isPrompt) {
      return (
        <div key={lineIdx} className="flex items-start">
          <span className="text-white/60">$&nbsp;</span>
          <span className="text-white font-semibold">{line.slice(2).split(" ")[0]}</span>
          <span className="text-white/60">&nbsp;{line.slice(2).split(" ").slice(1).join(" ")}</span>
        </div>
      );
    }

    if (isPlus) {
      return (
        <div key={lineIdx}>
          <span className="text-[#00ff88]">[+] </span>
          <span className="text-white/60">{line.slice(4)}</span>
        </div>
      );
    }

    if (isMinus) {
      return (
        <div key={lineIdx}>
          <span className="text-[#ff4466]">[-] </span>
          <span className="text-white/60">{line.slice(4)}</span>
        </div>
      );
    }

    if (isStar) {
      return (
        <div key={lineIdx}>
          <span className="text-[#ffaa00]">[*] </span>
          <span className="text-white/60">{line.slice(4)}</span>
        </div>
      );
    }

    if (isInfo) {
      return (
        <div key={lineIdx}>
          <span className="text-[#44aaff]">[i] </span>
          <span className="text-white/60">{line.slice(4)}</span>
        </div>
      );
    }

    // Regular line - apply token-level highlighting
    return (
      <div key={lineIdx}>
        {highlightLine(line)}
      </div>
    );
  });
}

function highlightLine(line: string): React.ReactNode[] {
  const tokens = line.split(/(\s+)/);
  const promptSeen = false;

  return tokens.map((token, i) => {
    if (token.startsWith("--") || token.startsWith("-")) {
      return (
        <span key={i} className="text-[#44aaff]">
          {token}
        </span>
      );
    }
    if (token.startsWith('"') || token.startsWith("'")) {
      return (
        <span key={i} className="text-[#00ff88]">
          {token}
        </span>
      );
    }
    if (i === 0 && !promptSeen) {
      return (
        <span key={i} className="text-white font-semibold">
          {token}
        </span>
      );
    }
    return (
      <span key={i} className="text-white/60">
        {token}
      </span>
    );
  });
}

export default function CLISection() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { ref: cliRef, isInView } = useInView(0.05);

  const selectedCommand = cliCommands[selectedIndex] ?? cliCommands[0];

  return (
    <section
      id="cli"
      ref={cliRef}
      className="relative bg-black px-4 py-32 sm:px-6 lg:px-8"
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`mb-16 text-center transition-all duration-700 ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Command Line Interface
          </h2>
          <p className={`mx-auto mt-5 max-w-xl text-sm text-white/40 transition-all delay-100 duration-700 ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            45 commands. Every operation. One unified interface.
          </p>
        </div>

        {/* Main Layout: Terminal + Command Cards */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          {/* Left: Interactive Terminal */}
          <div className="flex-shrink-0 lg:w-[55%]">
            <div className="cli-showcase overflow-hidden rounded-xl border border-white/[0.06] bg-black/80 backdrop-blur-xl">
              {/* Title Bar */}
              <div className="cli-titlebar flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3" aria-hidden="true">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs tracking-wide text-white/20">
                    reconpro — {selectedCommand.name}
                  </span>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="cli-body min-h-[320px] p-5 font-mono text-sm leading-relaxed md:min-h-[400px]" role="img" aria-label={`Terminal output for ${selectedCommand.name}`}>
                <div className="space-y-1">
                  {selectedCommand.example
                    .split("\n")
                    .map((line, lineIdx) => {
                      const isPrompt = line.startsWith("$");
                      const isPlus = line.startsWith("[+]");
                      const isMinus = line.startsWith("[-]");
                      const isStar = line.startsWith("[*]");
                      const isInfo = line.startsWith("[i]");

                      if (isPrompt) {
                        const afterPrompt = line.slice(1).trimStart();
                        const cmdParts = afterPrompt.split(/\s+/);
                        const cmdName = cmdParts[0] || "";
                        const rest = cmdParts.slice(1);

                        return (
                          <div key={lineIdx} className="flex items-start leading-7">
                            <span className="mr-2 text-white/60 select-none">
                              $
                            </span>
                            <span className="text-white font-semibold">
                              {cmdName}
                            </span>
                            <span className="ml-2">
                              {rest.map((part, pi) => {
                                if (part.startsWith("--") || part.startsWith("-")) {
                                  return (
                                    <span key={pi} className="text-[#44aaff]">
                                      {" "}{part}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={pi} className="text-[#00ff88]">
                                    {" "}{part}
                                  </span>
                                );
                              })}
                            </span>
                            {lineIdx ===
                              selectedCommand.example.split("\n").findIndex((l) =>
                                l.startsWith("$")
                              ) && (
                              <span className="ml-1 inline-block h-[18px] w-[8px] animate-pulse bg-white/70" />
                            )}
                          </div>
                        );
                      }

                      if (isPlus) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#00ff88] select-none">[+] </span>
                            <span className="text-white/50">{line.slice(4)}</span>
                          </div>
                        );
                      }

                      if (isMinus) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#ff4466] select-none">[-] </span>
                            <span className="text-white/50">{line.slice(4)}</span>
                          </div>
                        );
                      }

                      if (isStar) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#ffaa00] select-none">[*] </span>
                            <span className="text-white/50">{line.slice(4)}</span>
                          </div>
                        );
                      }

                      if (isInfo) {
                        return (
                          <div key={lineIdx} className="leading-7">
                            <span className="text-[#44aaff] select-none">[i] </span>
                            <span className="text-white/50">{line.slice(4)}</span>
                          </div>
                        );
                      }

                      // Empty or other lines
                      return (
                        <div key={lineIdx} className="leading-7 text-white/40">
                          {line || "\u00A0"}
                        </div>
                      );
                    })}
                </div>

                {/* Blinking Cursor */}
                <div className="mt-2 flex items-center">
                  <span className="text-white/60 select-none mr-2">$</span>
                  <span className="inline-block h-[18px] w-[8px] animate-pulse bg-white/70" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Scrollable Command Cards */}
          <div className="flex-1 lg:max-h-[500px]">
            <div
              className="space-y-1.5 overflow-y-auto pr-1 lg:max-h-[500px] lg:[scrollbar-width:thin] lg:[scrollbar-color:rgba(255,255,255,0.08)_transparent]"
              role="listbox"
              aria-label="CLI commands"
            >
              {cliCommands.map((cmd, index) => {
                const isActive = index === selectedIndex;

                return (
                  <button
                    key={cmd.name}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`${cmd.name}: ${cmd.description}`}
                    className={`group w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? "border-white/[0.08] bg-white/[0.08]"
                        : "border-white/[0.04] bg-transparent hover:bg-white/[0.03] hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-mono text-sm ${
                            isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                          } transition-colors`}
                        >
                          {cmd.name}
                        </span>
                        <p
                          className={`mt-1 text-sm truncate ${
                            isActive ? "text-white/30" : "text-white/15 group-hover:text-white/25"
                          } transition-colors`}
                        >
                          {cmd.description}
                        </p>
                      </div>
                      <span
                        className="flex-shrink-0 rounded-md bg-white/[0.03] px-2 py-0.5 text-xs text-white/15 transition-colors group-hover:text-white/25"
                      >
                        {cmd.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
