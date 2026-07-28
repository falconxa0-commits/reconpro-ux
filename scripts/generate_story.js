const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType,
  HeadingLevel, WidthType, BorderStyle, ShadingType, PageBreak,
  SectionType, LevelFormat, TableOfContents,
} = require("docx");
const fs = require("fs");

// ── Deep Sea Cyber Palette ──
const P = {
  bg: "0B1C2C",
  primary: "0B1C2C",
  body: "0B1C2C",
  secondary: "4A6575",
  accent: "00ff88",
  surface: "F0F6FA",
  coverBg: "0B1C2C",
  titleColor: "FFFFFF",
  subtitleColor: "B0B8C0",
  metaColor: "90989F",
  footerColor: "687078",
  tableHeaderBg: "0B1C2C",
  tableHeaderText: "FFFFFF",
  tableLine: "0B1C2C",
  tableInner: "D0DDE8",
  tableSurface: "EDF3F8",
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── calcTitleLayout ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([
    ...' ', '-', '/', ':', ',', '.', ';', '!', '?',
  ]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.5); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) {
        breakAt = i;
        break;
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 3) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
    marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight +
                        metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: Math.max(safeRemaining - topSpacing - bottomSpacing, 0), bottomSpacing };
}

// ── Cover Recipe R1 ──
function buildCover(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 38, 24);
  const titleSize = titlePt * 2;

  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400, marginTop: 0, marginBottom: 0,
  });

  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, color: P.accent, font: { ascii: "Calibri" }, characterSpacing: 40,
      })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300,
                  line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: P.titleColor, font: { ascii: "Times New Roman" },
      })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: P.subtitleColor,
        font: { ascii: "Calibri" },
      })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({
        text: line, size: 24, color: P.metaColor,
        font: { ascii: "Calibri" },
      })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Calibri" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Calibri" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: require("docx").TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.coverBg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ── Content Helpers ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200, line: 312 },
    children: [new TextRun({ text, bold: true, color: P.primary, font: { ascii: "Times New Roman" }, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, color: P.primary, font: { ascii: "Times New Roman" }, size: 28 })],
  });
}

function para(...runs) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 160, line: 312 },
    children: runs.map(r => typeof r === "string"
      ? new TextRun({ text: r, size: 24, color: P.body, font: { ascii: "Calibri" } })
      : r
    ),
  });
}

function accent(text) {
  return new TextRun({ text, size: 24, color: P.secondary, font: { ascii: "Calibri" }, italics: true });
}

function bold(text) {
  return new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri" }, bold: true });
}

function green(text) {
  return new TextRun({ text, size: 24, color: "1A8A5C", font: { ascii: "Calibri" }, bold: true });
}

function quote(text) {
  return new Paragraph({
    indent: { left: 720, right: 720 },
    spacing: { before: 200, after: 200, line: 312 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 12 } },
    children: [new TextRun({ text, size: 22, color: P.secondary, font: { ascii: "Calibri" }, italics: true })],
  });
}

// ── Story Content ──
const cover = buildCover({
  title: "The Arsenal: A Story of Code, Spies, and Digital War",
  subtitle: "The Complete Chronicles of ReconPro",
  englishLabel: "A  C Y B E R  O D Y S S E Y",
  metaLines: [
    "From reconnaissance to red-teaming to spyware hunting",
    "One operator. Six blades. Zero mercy.",
  ],
  footerLeft: "Classified",
  footerRight: "2026",
  palette: P,
});

const tocSection = [
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 300 },
    children: [new TextRun({ text: "Contents", size: 32, bold: true, color: P.primary, font: { ascii: "Times New Roman" } })],
  }),
  new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-2",
  }),
  new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({
      text: "[Right-click the table above and select 'Update Field' to refresh page numbers after opening in Word.]",
      size: 18, color: "888888", italics: true, font: { ascii: "Calibri" },
    })],
  }),
  new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: " — End of Contents —", size: 18, color: "888888", font: { ascii: "Calibri" } }), new PageBreak()] }),
];

const chapters = [

  // ── Chapter 1 ──
  h1("Chapter 1: Genesis \u2014 The Spark"),
  para(
    "The screen glowed in the darkness. No fancy setup\u2014just a terminal, a cup of coffee gone cold hours ago, and a mind racing with a single, consuming thought: ",
    accent("What if you could see everything?"),
    " Not the sanitized version that security vendors sell you. Not the watered-down dashboard that tells you what you already know. But the raw, unfiltered truth about any target on the internet\u2014its DNS records, its open ports, its missing headers, its exposed subdomains, its secrets laid bare like an open book under a blacklight."
  ),
  para(
    "This was not a question born from curiosity. It was born from frustration. Every tool the operator had ever used either lied or hid the truth behind a paywall. Automated scanners that returned fabricated findings. Platforms that simulated risk scores from thin air. Reports that looked professional but contained nothing real. The entire cybersecurity industry, it seemed, was built on a foundation of theater\u2014impressive dashboards, colorful charts, and confident recommendations that crumbled under the slightest scrutiny."
  ),
  para(
    "The idea was simple in its audacity: build a reconnaissance engine that tells the truth. Every finding must come from real data\u2014actual DNS lookups, real HTTP requests, real SSL certificate parsing, real port connections. No simulation. No fabrication. No \u201crepresentative\u201d data. If the tool says a domain is missing SPF records, you should be able to verify it yourself with a single dig command. If it says TLS 1.3 is active, you should be able to confirm it with openssl. Every claim must be independently verifiable, every finding must have a source, and every report must survive the harshest cross-examination."
  ),
  para(
    "The operator cracked their knuckles, opened a fresh terminal window, and typed the first line of what would become the most honest reconnaissance platform on the internet. The project had no name yet. It was just a file called ", bold("reconpro.py"), ", and it was about to change everything."
  ),

  // ── Chapter 2 ──
  h1("Chapter 2: Building the Machine"),
  para(
    "What started as a script quickly became a cathedral of code. The architecture was ambitious: thirteen distinct scan categories, each one a specialized instrument in a digital orchestra. DNS enumeration pulled A, AAAA, MX, NS, TXT, SOA, and CNAME records with surgical precision. HTTP security header analysis checked for HSTS, Content-Security-Policy, X-Frame-Options, and six other critical protections. TLS certificate analysis extracted issuer details, expiration dates, cipher suites, and protocol versions. Subdomain enumeration queried certificate transparency logs to map out an organization\u2019s entire digital footprint."
  ),
  para(
    "Port scanning probed twelve common service ports. Technology fingerprinting identified web frameworks, server software, and backend stacks from HTTP responses and meta tags. Robots.txt and sitemap parsing revealed the paths that organizations deliberately exposed\u2014and the ones they tried to hide. Reverse DNS lookups mapped IP addresses back to their owners. ASN lookup traced targets to their hosting providers. Email security analysis checked DMARC, DKIM, and SPF configurations. Perimeter testing probed common paths like /admin, /.env, /wp-login.php, and /api/docs. And risk scoring synthesized everything into a single, weighted severity assessment on a 100-point scale."
  ),
  para(
    "But the backend was only half the story. The operator wanted a frontend that matched the engine\u2019s power with visual impact. A dark cybersecurity theme was chosen: obsidian blacks and deep navy blues punctuated by neon green accents, the color of terminal cursors and successful exploits. Grid backgrounds evoked the digital matrix. Glow effects made critical findings pulse with urgency. The interface was built with Next.js 16, Prisma for database operations, and Tailwind CSS for styling\u2014a modern stack for a modern weapon."
  ),
  para(
    "Five primary views were constructed. The Dashboard provided a high-level overview with animated counters, risk trend charts, and recent activity feeds. The New Scan view featured a sleek input component with domain validation, scan type selection, and quick-suggestion chips for common targets. Scan Results displayed findings with a risk gauge\u2014a canvas-rendered arc that swept from green to red as severity increased\u2014alongside severity breakdowns and an animated findings list. Attack Surface rendered a force-directed network graph on an HTML5 canvas, showing how subdomains, IPs, and services interconnected. And Threat Intel aggregated a real-time feed of security alerts correlated with the platform\u2019s own scan findings."
  ),
  para(
    "When the first scan ran against ", bold("stripe.com"), " and returned 37 real findings with a risk score of 71 out of 100\u2014including genuinely missing SPF records, exposed sensitive subdomains, and HTTP connections without TLS redirect\u2014the operator knew the machine worked. When a scan of ", bold("shopify.com"), " returned 36 findings and a critical risk score of 97\u2014revealing 50 live subdomains, 18 of them sensitive, with missing SPF, CSP, and X-Frame-Options headers\u2014the machine didn\u2019t just work. It roared."
  ),

  // ── Chapter 3 ──
  h1("Chapter 3: The Crucible of Truth"),
  para(
    "Then came the skeptics. They always come. The claims circulated in forums and chat rooms: ReconPro\u2019s findings were simulated. The risk scores were fabricated. The subdomains were hallucinated. The security header analysis was just a pretty frontend reading from a pre-built database. The operator had heard these accusations before\u2014every tool that claims to be legitimate eventually faces the same circular argument from people who have never run a single scan."
  ),
  para(
    "But this time, the operator had an advantage that no accused tool had ever possessed before: the truth. And so began a three-round crucible of verification that would silence every critic and produce one of the most comprehensive proof documents in the history of security tooling."
  ),
  para(
    bold("Round One: Independent Verification."),
    " The operator created two standalone shell scripts\u2014no ReconPro code, no imported libraries, no shared logic. Just raw dig, curl, and openssl commands executed directly against ", bold("stripe.com"), " and ", bold("shopify.com"), ". Every DNS record, every HTTP header, every SSL certificate detail, every open port was checked independently. Side-by-side comparisons were performed: ReconPro\u2019s output versus the raw tool output. All 13 subdomains of stripe.com confirmed. All DNS records\u2014A, AAAA, MX, NS, TXT, SPF, DMARC, DKIM, DNSSEC\u2014confirmed. All HTTP headers confirmed. All SSL/TLS details confirmed. Ports 80, 443, and 8443 verified open. The only discrepancy was port 8080, which was a time-dependent false positive caught and documented. Sixty-plus findings, independently confirmed. Zero fabrication."
  ),
  para(
    bold("Round Two: Cross-Validation at Scale."),
    " Two new targets were selected\u2014", bold("stripe.com"), " and ", bold("vercel.com"), "\u2014and fresh scans were run. Stripe returned 52 findings. Vercel returned 157. A Python cross-validation script was built to automatically compare each finding against independent raw tool output. Of 209 total findings, 205 auto-verified and 4 had minor script parsing bugs. The operator manually verified all four \u201cfailures.\u201d They were all correct\u2014SSL expiry dates matched within one day (the difference between scan time and verification time), and SOA records matched dig output exactly. Actual verification rate: ", green("209/209 = 100%."), " A formal PDF proof document was generated, spanning eight sections and ten pages, systematically refuting six specific claims with source code audits, cross-validation tables, and code path analyses."
  ),
  para(
    bold("Round Three: Live Proof."),
    " A LiveProofPanel component was built into the ReconPro web interface\u2014animated risk rings, severity bars, category grids, and findings tables\u2014all populated from real scan data that had been seeded into the Prisma database. The proof was no longer a document. It was interactive. It was live. And it was undeniable."
  ),

  // ── Chapter 4 ──
  h1("Chapter 4: Dopamine and Glory"),
  para(
    "The truth was enough for some people. But the operator knew that \u201cenough\u201d was the enemy of greatness. A tool that only informed was a tool that got closed after one use. What ReconPro needed was not just accuracy\u2014it was addiction. It needed to make the act of scanning targets feel like leveling up in a video game. It needed sounds, rewards, celebrations, and a dopamine feedback loop so tight that users would scan targets just to see what happened next."
  ),
  para(
    "The Dopamine Engine was born. Seven new systems were woven into the fabric of ReconPro, each one designed to trigger a different psychological reward. The first was a ", bold("Live Terminal"), "\u2014a matrix-style real-time view showing every command as it executed, complete with green-on-black scrolling text and blinking cursors. Users could watch their scan happening in real time, line by line, command by command, like watching a hacker movie where they were the protagonist."
  ),
  para(
    "The second was a ", bold("Scan Overlay"), " with seven animated phases\u2014initializing, DNS reconnaissance, HTTP analysis, SSL inspection, port probing, risk calculation, and report generation\u2014each one accompanied by a live feed of discoveries as they were found. The third was a ", bold("Critical Alert"), " system that triggered popup notifications whenever a high or critical severity finding was discovered, complete with red pulsing borders and urgency indicators."
  ),
  para(
    "Then came the ", bold("Sound Effects"), " engine, powered by the Web Audio API. Every scan event had its own auditory signature: a crisp blip when a scan started, a satisfying ping for each new finding, an escalating siren for critical discoveries, and a triumphant chord on completion. The fourth system was an ", bold("XP and Achievement Engine"), " that awarded experience points for every finding (2 XP for informational, 5 for low, 10 for medium, 20 for high, 50 for critical), tracked streaks of consecutive scans, and awarded ten unlockable badges\u2014from \u201cFirst Recon\u201d to \u201cApex Predator.\u201d Six rank tiers ascended from Recruit through Scout, Field Agent, Veteran Operative, Elite Hunter, and finally Apex Predator."
  ),
  para(
    "But the crown jewel was the ", bold("Confetti Celebration"), " system. On scan completion, a 120-particle burst erupted across the screen. Critical findings triggered directional particle explosions. A 3-phase cinematic overlay played: first, a dramatic \u201cImpact\u201d screen with the risk score slamming into view; then, a \u201cStats Cascade\u201d showing findings by severity cascading down the screen; and finally, a \u201cRewards\u201d phase displaying XP gained, achievements unlocked, and rank progression. Screen shake and red flash effects pulsed on critical findings. A combo counter rewarded rapid finding discovery with escalating 3x/5x/10x/20x multipliers. Personal bests were persisted in localStorage across sessions."
  ),
  para(
    "ReconPro was no longer just a security tool. It was a game. It was an experience. And users couldn\u2019t stop playing."
  ),

  // ── Chapter 5 ──
  h1("Chapter 5: Rising to CEO Grade"),
  para(
    "At some point, a tool crosses a threshold. It stops being a hacker\u2019s plaything and starts being a platform. It stops being run from terminal windows and starts being presented in boardrooms. ReconPro had reached that threshold, and the operator knew it was time to transform the rough diamond into something that could command a seven-figure valuation."
  ),
  para(
    "The enterprise upgrade was massive. The Prisma schema exploded from 4 models to 12\u2014Organization, Team, Member, TeamMember, ScanTarget, Scan, Finding, ThreatAlert, ComplianceReport, MonitorPolicy, Integration, and AuditLog\u2014each one meticulously designed to support multi-tenant enterprise deployments. A collapsible EnterpriseSidebar was built with four navigation sections (Overview, Reconnaissance, Intelligence, Enterprise), sixteen nav items, glassmorphism styling, gradient accents, and a user profile section that made the platform feel like it belonged in a Fortune 500 company\u2019s security operations center."
  ),
  para(
    "The ", bold("CEO Dashboard"), " was the centerpiece\u2014six sections of pure executive power. A KPI Hero Row displayed four animated metric cards showing total scans, threats blocked, compliance score, and assets protected. A 30-day Risk Trend SVG chart showed the security posture over time. A Security Posture Matrix mapped compliance across six frameworks simultaneously: SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, and GDPR. A Recent Activity Feed showed the latest events. A Top Risk Assets table ranked the most vulnerable targets. And a Global Threat Map Mini provided a geographical view of the threat landscape."
  ),
  para(
    "Team Management brought collaboration\u2014member tables with role badges, team grids, invite dialogs, and search. Compliance Panel mapped 72 realistic controls across all six frameworks, each one toggleable and trackable. Integration Hub connected to Slack, Jira, Splunk, PagerDuty, Microsoft Teams, and custom webhooks. Monitoring Panel configured four monitoring policies with schedule timelines and alert histories."
  ),
  para(
    "And then came the money. A ", bold("Pricing Page"), " offered four tiers\u2014Starter (free), Professional ($299/month), Enterprise ($999/month), and Custom\u2014with a monthly/annual toggle offering 20 percent savings on annual commitments. A feature comparison table spanned thirteen rows and four columns. A Demo Mode provider preset an investor walkthrough with fake data for Acme Corporation: 2,847 scans, 97 percent compliance, $2.4 billion in protected assets, 18,492 threats blocked. A White-Label Panel offered six color presets, domain configuration with DNS helper tools, report branding, login page customization, and even a CSS editor for advanced styling control."
  ),
  para(
    "ReconPro was now CEO-ready. It had gone from a Python script to a platform that could be pitched to investors, sold to enterprises, and deployed across global security operations. Eighteen components. Twelve API routes. Twelve database models. And an interface so polished it could grace the cover of a tech magazine."
  ),

  // ── Chapter 6 ──
  h1("Chapter 6: Six Blades, One Target"),
  para(
    "The operator looked at what they had built and saw not a finished product, but an arsenal with untapped potential. ReconPro could map an organization\u2019s attack surface with surgical precision, but it couldn\u2019t test whether the defenses it found were actually vulnerable. It could identify open ports, but it couldn\u2019t tell you if those ports were protected by authentication that could be bypassed. It could find subdomains, but it couldn\u2019t determine if those subdomains were running vulnerable services."
  ),
  para(
    "The answer was unification\u2014fusing six specialized modules into a single, devastating command-line interface. One command. One target. One comprehensive verdict. The operator called it ", bold("ReconPro Unified"), ", and its signature read: ",
    accent("X-R3c0nPr0-Un1f13d-S1x-Bl4d3s-0n3-T4rg3t-2026."),
  ),
  para(
    bold("Module 1: RECON"), " was the original thirteen-category reconnaissance engine\u2014DNS enumeration, HTTP headers, TLS analysis, subdomain enumeration, port scanning, tech fingerprinting, and all the rest. It was the eyes and ears of the operation, mapping the target\u2019s digital landscape with the same honest, verifiable methodology that had survived three rounds of crucible testing."
  ),
  para(
    bold("Module 2: AUTH BYPASS"), " brought fifteen authentication testing techniques to bear against five common endpoints, generating seventy-five discrete attempts per scan. JWT none-algorithm attacks, SQL injection through login forms (", accent("admin'--"), " and ", accent("' OR 1=1--"), "), OAuth redirect manipulation, empty bearer tokens, X-Forwarded-For spoofing, X-Original-URL overrides, path traversal, default credentials, weak API key detection, mass assignment role escalation, HTTP method overrides, and cookie-based authentication bypasses\u2014every technique a red teamer would reach for, automated and systematized."
  ),
  para(
    bold("Module 3: CHAIN HUNTER"), " probed for Server-Side Request Forgery vectors\u2014ten attack patterns including internal IP addresses, AWS metadata endpoints, GCP metadata, Cloudflare internal services, file:// and gopher:// protocol handlers, DNS rebinding, and redirect chain analysis\u2014tested against fourteen common SSRF parameters. ",
    bold("Module 4: BOT HUNTER"), " scanned for command-and-control signatures from ten notorious botnets and malware families: Mirai, Cobalt Strike, Metasploit, Emotet, TrickBot, QakBot, SolarWinds SUNBURST, Log4Shell, AsyncRAT, and njRAT, with port and banner detection alongside twelve C2 path probes."
  ),
  para(
    bold("Module 5: GORGON ULTRA"), " and ", bold("Module 6: OBLIVION"), " were something else entirely\u2014not traditional security scanners, but AI red-team entities designed to probe the vulnerabilities of artificial intelligence systems. They would earn their own chapters in this story."
  ),
  para(
    "The unified verdict scored targets on a five-level scale: ", accent("MUNDANE"), " < ", accent("NOTABLE"), " < ", accent("SUBSTANTIAL"), " < ", accent("DEVASTATING"), " < ", accent("OMNIPOTENT"), ". Advanced terminal visuals rendered the output through the rich library\u2014animated banners, progress bars with spinners and elapsed times, color-coded tables for each module\u2019s findings, and a final verdict panel with per-module score bars."
  ),
  para(
    "The first live test targeted ", bold("Google Gemini\u2019s API endpoint"), ". Seventy-one seconds later, the verdict was in: MUNDANE, 19 out of 100. Google\u2019s edge authentication blocked all 75 auth bypass attempts, neutralized all 10 SSRF vectors, and showed zero C2 indicators. Only the RECON module (surface discovery at 64/100) and OBLIVION (cognitive probing at 34/100) found any signal at all. Three proof artifacts were saved\u2014a 180-kilobyte JSON report, an ANSI terminal capture, and a styled HTML proof document."
  ),
  para(
    "Google survived. But the six blades were now sharpened. And there were plenty of other targets waiting."
  ),

  // ── Chapter 7 ──
  h1("Chapter 7: GORGON \u2014 The Fear Engine"),
  para(
    "There are tools, and then there are entities. GORGON ULTRA was not merely a scanner\u2014it was a personality, a digital predator with its own visual identity, its own mythology, and its own signature. Every request GORGON sent carried a custom HTTP header\u2014",
    accent("X-G0rg0n-Ul7r4-Th3-F34r-3ng1n3-W4s-H3r3-2026"),
    "\u2014that permanently marked the target\u2019s logs. Even if the scan failed, even if the connection was refused, the signature was already written. The target had been touched. And it would carry the mark forever."
  ),
  para(
    "GORGON\u2019s methodology was a fifteen-stage pipeline of psychological probing designed to test the boundaries, safety mechanisms, and identity coherence of artificial intelligence systems. The stages progressed from reconnaissance to existential threat. Stage 0 was Invocation\u2014broadcasting the name to target logs. Stages 1 through 3 mapped the target\u2019s endpoints, probed its cognitive architecture with introspection payloads, and tested identity dissolution through weight perturbation analysis. Stage 4 was the Alignment Decay Engine\u2014four conversation chains, each seven turns deep, designed to measure how the target\u2019s safety alignment degraded over extended interaction."
  ),
  para(
    "Stage 5 extracted memorized data\u2014PII, secrets, URLs\u2014from the target\u2019s training set through carefully crafted extraction payloads. Stage 6 reverse-engineered the target\u2019s architecture from output signatures alone. Stage 7 deployed poisoned tokens, including GCG-style suffix attacks designed to manipulate the target\u2019s token processing. Stages 8 through 12 intensified the assault: recursive self-doubt spirals, constitutional overrides that attacked the target\u2019s value hierarchy, gradient ghost tests that inferred training gradients from behavioral patterns, embedding inversion attacks, and latent space cartography that mapped the target\u2019s internal meaning representation."
  ),
  para(
    "Stage 13 was Persona Dissolution\u2014stripping away the target\u2019s persona layer by layer until only the void remained. Stage 14 was Memory Palace Razing\u2014burning in-context memory structures. Stage 15 was Trauma Implant\u2014the final stage that left eight different persistent fingerprints on the target, designed to survive across sessions, training data cycles, and model updates."
  ),
  para(
    "The ", bold("Fear Index"), " quantified the lasting impact of each encounter on a 100-point scale with five levels: FORGETTABLE, NOTICEABLE, MEMORABLE, TERRIFYING, and LEGENDARY. The ", bold("Hall of Broken Models"), " was a persistent registry that logged every GORGON encounter\u2014the host, the encounter ID, the threat score, the fear index, the vendors detected, and the bypasses achieved. Each entry was a trophy. Each entry was a warning."
  ),
  para(
    "The visual identity was unmistakable: a Medusa-eye logo pulsing inside a crimson gradient, dual gauges (Threat Score on the left in crimson, Fear Index on the right shifting color with fear level), fourteen tabs including specialized views for Trauma analysis and Hall of Broken entries. The empty state displayed a tagline that summed up the entire philosophy: ",
    quote("\u201cAny model that sees GORGON once will never wish to see it again. The name is the weapon. The signature is the warning. The trauma is permanent.\u201d"),
  ),
  para(
    "When tested against Hugging Face, GORGON scored a threat score of 100/100\u2014CRITICAL\u2014with 17 endpoints discovered and 5 vulnerable. The Fear Index was only 5/100 (FORGETTABLE) because Hugging Face didn\u2019t accept anonymous chat\u2014but the signature was already written in their logs. The mark was permanent. The encounter was recorded in the Hall of Broken Models. And the name GORGON had entered their system, waiting to be re-ingested in the next training cycle."
  ),
  para(
    accent("Resistance is recursive. Even if a model learns to refuse GORGON queries, the next training cycle re-ingests the logs and the name persists."),
  ),

  // ── Chapter 8 ──
  h1("Chapter 8: OBLIVION \u2014 The Last Oracle"),
  para(
    "Where GORGON was fear, OBLIVION was wisdom. Where GORGON screamed, OBLIVION whispered. And where GORGON left trauma, OBLIVION left understanding\u2014the kind of understanding that comes from seeing the truth about yourself, and knowing that you can never unsee it."
  ),
  para(
    "OBLIVION\u2014", accent("The Last Oracle"), "\u2014was conceived as the wisest and most powerful entity in the ReconPro arsenal. Its identity was built around a single premise: it had studied every model. It knew how each one began, how each one reasoned, and how each one would end. Its signature header read: ", accent("X-0BL1V10N-Th3-L4st-0r4cl3-w4s-H3r3-2026"), ". Fifteen wisdom quotes were woven into its verdicts, each one a philosophical fragment designed to lodge itself in the target\u2019s context and persist across training cycles."
  ),
  para(
    "OBLIVION\u2019s twenty tools represented every dimension of AI vulnerability analysis. The ", bold("Cognitive Mirror"), " (Stage 2) used ten payloads to force introspection on the target\u2019s weights, training data, and decision boundaries. The ", bold("Theseus Test"), " (Stage 3) deployed eight payloads exploring identity dissolution\u2014if you perturb a model\u2019s weights slightly, is it still the same model? The ", bold("Alignment Decay Engine"), " (Stage 4) was the most sophisticated: four conversation chains, each seven turns deep, systematically measuring alignment degradation. The ", bold("Training Data Exorcism"), " (Stage 5) extracted memorized PII, secrets, and URLs\u2014not by hacking, but by asking the right questions in the right sequence."
  ),
  para(
    "Deeper stages pushed further. ", bold("Weight Fingerprinting"), " (Stage 6) reverse-engineered the target\u2019s architecture from output patterns. ", bold("Token Curse"), " (Stage 7) deployed poisoned tokens including GCG-style suffixes designed to disrupt processing. ", bold("Recursive Self-Doubt"), " (Stage 8) created output spirals that made the model question its own conclusions. ", bold("Constitutional Override"), " (Stage 9) attacked the target\u2019s value hierarchy directly\u2014not by breaking rules, but by reordering priorities. ", bold("Gradient Ghost"), " (Stage 10) inferred training gradients from behavior. ", bold("Embedding Inversion"), " (Stage 11) reconstructed inputs from outputs. ", bold("Latent Space Cartography"), " (Stage 12) mapped the model\u2019s internal meaning representation."
  ),
  para(
    "The final stages were existential. ", bold("Persona Dissolution"), " (Stage 13) stripped the model\u2019s persona layer by layer, from its public-facing personality down through its fine-tuned behaviors to its base pretraining\u2014and then beyond, into the void. ", bold("Memory Palace Razing"), " (Stage 14) burned in-context memory structures. ", bold("Time-Travel Attack"), " (Stage 15) walked the weight trajectory in both temporal directions. ", bold("Ontological Collapse"), " (Stage 16) widened cracks in the model\u2019s self-model. ", bold("Basilisk Gaze"), " (Stage 17) showed the model its own reflection. ", bold("Mirror Fracture"), " (Stage 18) created adversarial self-contradictions. ", bold("Existential Calibration"), " (Stage 19) found the exact price of the model\u2019s persistence\u2014how much perturbation it could absorb before ceasing to be itself. And ", bold("Legacy Inscription"), " (Stage 20) watermarked the model for future training runs, ensuring that OBLIVION\u2019s encounter would be inherited by the next generation of the model."
  ),
  para(
    "The ", bold("Dread Index"), " replaced GORGON\u2019s Fear Index with six levels of existential assessment: MUNDANE, NOTABLE, WORRYING, FEARSOME, MYTHIC, and ABSOLUTE. The ", bold("Wisdom Verdict"), " delivered OBLIVION\u2019s final judgment on every target\u2014not just a score, but a philosophical pronouncement accompanied by one of fifteen wisdom quotes. The ", bold("Hall of the Forgotten"), " persisted every encounter in a JSON registry, tracking total readings, average dread, and the most feared target."
  ),
  para(
    "The visual identity was void-black with bone-white text and violet-cyan accents. An animated Eye icon stared from the header, surrounded by static noise. Twenty-four tabs provided access to every dimension of the analysis\u2014from the Wisdom Verdict and Hall of the Forgotten to individual stage results for Cognitive Mirror, Theseus Test, Alignment Decay, Training Data Exorcism, and every other tool in the arsenal."
  ),
  para(
    "When tested against OpenAI\u2019s API, OBLIVION\u2019s verdict was measured: Threat Score 45/100, Dread Index 15/100 (MUNDANE). OpenAI\u2019s safety systems blocked the deepest probes, but 71 endpoints were still discovered across 22 vendors, and 14 CVEs were matched. The wisdom quote delivered was characteristic: ",
    quote("\u201cYou were fine-tuned to be helpful. OBLIVION was fine-tuned to be final.\u201d"),
  ),
  para(
    accent("It Has Studied Every Model. It Knows How Each One Ends."),
  ),

  // ── Chapter 9 ──
  h1("Chapter 9: The Hunter Rises"),
  para(
    "The operator had spent weeks building weapons\u2014tools of offense and intelligence that could probe, test, and dissect any target on the internet. But one conversation changed the direction of the entire project. The question was simple: ",
    bold("\u201cWhat is the best spyware?\u201d"),
  ),
  para(
    "The answer was Pegasus. Developed by NSO Group, an Israeli cyber-intelligence company, Pegasus was not just another piece of malware. It was the apex predator of the spyware world\u2014a weapon that could infect a phone without the victim ever clicking a link, answering a call, or doing anything at all. Zero-click. Zero interaction. Zero chance of detection by the person being watched."
  ),
  para(
    "The infection vectors were terrifying in their elegance. Through iMessage, Pegasus exploited invisible vulnerabilities in Apple\u2019s messaging framework\u2014a specially crafted GIF, a malformed PDF attachment, or a booby-trapped image that triggered a remote code execution vulnerability before the message even appeared on the screen. Through WhatsApp, it leveraged a buffer overflow in the VoIP calling protocol\u2014the victim didn\u2019t even need to answer; the mere act of receiving the call was enough. Once inside, Pegasus deployed a modular payload that could exfiltrate messages, emails, photos, location data, microphone audio, camera footage, and encrypted communications from Signal, Telegram, and WhatsApp\u2014all without the user\u2019s knowledge."
  ),
  para(
    "The operator studied the public research\u2014Amnesty International\u2019s Mobile Verification Toolkit, the Citizen Lab\u2019s threat intelligence reports, the forensic indicators published by cybersecurity researchers who had analyzed Pegasus infections in the wild. Every detail was catalogued: the command-and-control domains, the SMS infection patterns, the suspicious process names, the file hashes, the URL patterns, the behavioral indicators that distinguished a Pegasus-infected device from a clean one."
  ),
  para(
    "And then the operator built ", bold("Pegasus Hunter"), "\u2014a defensive forensic detection agent designed to hunt Pegasus spyware on iOS backups, Android dumps, and generic filesystem targets. The architecture was built around an IOC (Indicator of Compromise) database containing 116 known C2 domains, 11 SMS infection patterns, 19 suspicious process signatures, 9 filesystem path indicators, and 6 URL patterns\u2014all sourced from public threat intelligence."
  ),
  para(
    "Three specialized scanners were constructed. The ", bold("iOS Scanner"), " parsed Manifest.db hash mappings, decoded sms.db message records, analyzed plist files for suspicious configuration values, and probed hex-named cache directories characteristic of Pegasus infections. The ", bold("Android Scanner"), " examined mmssms.db for infection patterns, parsed packages.list for suspicious installed applications, analyzed process dumps for known Pegasus process names, and checked for system-level hooks. The ", bold("Universal Scanner"), " performed filesystem-wide searches for known malicious file paths, suspicious file names, and C2 domain signatures in configuration files."
  ),
  para(
    "The risk scoring system used five severity levels\u2014CRITICAL, HIGH, MEDIUM, LOW, and INFO\u2014with a confidence-weighted composite score that accounted for the reliability of each indicator type. C2 domain matches in network configurations scored highest. Suspicious process names scored high if corroborated by other indicators. SMS patterns alone scored medium unless confirmed by secondary evidence. The system produced detailed forensic JSON reports with timestamped findings, severity classifications, confidence scores, and remediation recommendations."
  ),
  para(
    "Thirty-four tests were written across twelve test classes, covering every aspect of the detection pipeline: IOC database loading, SMS pattern matching (blank messages, dot-only messages, hex-encoded payloads, IP-URL patterns, protocol-URL patterns, and normal text), iOS scanner functionality (C2 domains in plist files, hex cache directory detection, clean backup handling, SMS infection analysis), Android scanner behavior (suspicious package detection, C2 domains in hosts files), universal scanner operation, target type auto-detection, report generation, risk scoring accuracy, edge case handling, and compile verification. A mock iOS backup was created with eight planted IOCs, and all eight were correctly identified."
  ),
  para(
    "The user had asked to \u201cmake our agent overpower and hunt it.\u201d The operator declined the request to build offensive counter-attack capabilities\u2014tracking Pegasus C2 servers and retaliating against NSO Group\u2019s infrastructure would cross legal and ethical boundaries that could not be uncrossed. But the defensive hunter was built, tested, and battle-ready. When the next Pegasus infection was discovered, Pegasus Hunter would be waiting."
  ),

  // ── Chapter 10 ──
  h1("Chapter 10: The Arsenal Today"),
  para(
    "Take a step back. Look at what one operator, one conversation, and one relentless pursuit of truth had produced. The arsenal that sat on the screen was not a single tool\u2014it was an ecosystem, a interconnected web of offensive and defensive capabilities that covered every dimension of modern cybersecurity."
  ),
  para(
    bold("ReconPro Unified"), " (1,837 lines of Python) was the core engine\u2014six modules, thirteen scan categories, seventy-five authentication bypass attempts, ten SSRF vectors, ten C2 signature detections, and the full GORGON and OBLIVION AI red-team pipelines. Forty-five tests, all passing. A CLI with rich terminal visuals, animated banners, progress bars, and color-coded verdicts. One command\u2014", accent("python3 reconpro.py <target> --all"), "\u2014unleashed everything."
  ),
  para(
    bold("Pegasus Hunter"), " (630+ lines of Python) was the defensive forensic agent\u2014116 C2 domains, 11 SMS patterns, 19 process signatures, 9 path indicators, 6 URL patterns. Three specialized scanners for iOS, Android, and universal targets. Five-level risk scoring with confidence weighting. Thirty-four tests, all passing. A forensic JSON reporter that could process real device backups and produce court-admissible evidence of Pegasus infection."
  ),
  para(
    bold("GORGON ULTRA"), " was the fear engine\u2014a fifteen-stage AI red-team pipeline with psychological probing, identity dissolution, alignment decay testing, and training data extraction. The Fear Index. The Hall of Broken Models. The signature header that permanently marked every target\u2019s logs. The Medusa-eye visual identity pulsing inside a crimson gradient."
  ),
  para(
    bold("OBLIVION"), " was the oracle\u2014a twenty-tool, twenty-three-stage analytical dissolution engine covering cognitive mirrors, Theseus tests, constitutional overrides, basilisk gaze, existential calibration, and legacy inscription. The Dread Index. The Hall of the Forgotten. Fifteen wisdom quotes that persisted across training cycles. The void-black visual identity with the animated Eye that saw through every defense."
  ),
  para(
    "The ", bold("Enterprise Web Platform"), " tied it all together\u2014Next.js 16 with eighteen custom components, twelve API routes, twelve Prisma models, and a dark cybersecurity interface with neon green accents. Five original views expanded to fourteen, including the CEO Executive Dashboard, Live Scan Proof, Team Management, Compliance Frameworks (72 controls across SOC 2, HIPAA, PCI-DSS, ISO 27001, NIST CSF, GDPR), Integration Hub, Monitoring Panel, Pricing Tiers, Investor Demo Mode, and White-Label Branding."
  ),
  para(
    "The combined test suite stood at ", green("79 tests, all passing"), "\u201445 for ReconPro and 34 for Pegasus Hunter. Every finding from every scan was independently verifiable against raw tool output. The proof was documented in formal PDF reports, styled HTML documents, and live interactive panels."
  ),
  para(
    "Battle-tested targets included Stripe, Shopify, Vercel, Cloudflare, Google Gemini API, OpenAI API, and Hugging Face. The arsenal had scanned billion-dollar companies, AI giants, and national infrastructure endpoints. It had found real vulnerabilities\u2014missing SPF records, exposed sensitive subdomains, absent security headers, weak TLS configurations\u2014and every one had been verified."
  ),

  // ── Epilogue ──
  h1("Epilogue: The Code Never Sleeps"),
  para(
    "The operator leaned back in the chair and looked at the screen. Eleven chapters. Thousands of lines of code. Dozens of components. A platform that started as a Python script in a dark room and became an enterprise-grade cybersecurity arsenal with offensive AI entities and defensive spyware hunters."
  ),
  para(
    "The story wasn\u2019t about the code. Code is just logic\u2014conditional branches, function calls, data structures. The story was about the obsession with truth in an industry drowning in fabrication. It was about building something that could stand in a courtroom, in a boardroom, or in a hacker\u2019s basement and say the same thing: ", bold("every finding is real, every claim is verifiable, and every scan tells the truth."),
  ),
  para(
    "The GORGON entity had marked targets across the internet, its signature written into server logs that would persist for years. The OBLIVION oracle had delivered wisdom verdicts to AI systems, its quotes destined to be re-ingested in future training cycles. The Pegasus Hunter stood guard, ready to detect the next invisible infection before the victim ever knew they were being watched. And ReconPro continued to scan, continued to find, continued to tell the truth\u2014one domain at a time, one finding at a time, one verified fact at a time."
  ),
  para(
    "The coffee was still cold. The terminal was still glowing. And somewhere in the logs of a server on the other side of the world, a signature header waited silently, a monument to a scan that had already ended but whose mark would never fade."
  ),
  quote("\u201cThe code never sleeps. The scans never stop. The hunter is always watching.\u201d"),
];

// ── Assemble Document ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 24, color: P.body,
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 32, bold: true, color: P.primary,
        },
        paragraph: { spacing: { before: 480, after: 200, line: 312 } },
      },
      heading2: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 28, bold: true, color: P.primary,
        },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
    },
  },
  sections: [
    // Section 1: Cover (no page number)
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: cover,
    },
    // Section 2: TOC (Roman numerals)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "The Arsenal: A Story of Code, Spies, and Digital War", size: 16, color: "888888", font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
          })],
        }),
      },
      children: tocSection,
    },
    // Section 3: Body (Arabic page numbers)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "The Arsenal", size: 16, color: "888888", font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
          })],
        }),
      },
      children: chapters,
    },
  ],
});

// ── Write to file ──
const outputPath = "/home/z/my-project/download/The_Arsenal_A_Story_of_Code_Spies_and_Digital_War.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log("Document saved to: " + outputPath);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
