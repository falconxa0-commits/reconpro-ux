// ═══════════════════════════════════════════════════════════════
// ReconPro v10.0.0 — JSON-LD Structured Data
// ═══════════════════════════════════════════════════════════════

const SITE_URL = "https://reconpro.dev";

/** WebApplication schema — describes ReconPro as a software application */
const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ReconPro",
  description:
    "Attack surface intelligence with autonomous reconnaissance, real-time threat intelligence, and compliance mapping.",
  url: SITE_URL,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Linux, macOS, Windows",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Open Source — MIT License",
  },
  featureList: [
    "16 scanner modules",
    "47 REST API endpoints",
    "Real-time threat intelligence",
    "Compliance mapping (SOC2, ISO27001, HIPAA, PCI-DSS)",
    "AI-powered security advisor",
    "Team management and audit logging",
    "SSRF-protected scanning engine",
  ],
  softwareVersion: "10.0.0",
  programmingLanguage: "Python",
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Organization",
    name: "ReconPro",
    url: SITE_URL,
  },
  installUrl: SITE_URL,
  screenshot: `${SITE_URL}/og-image.png`,
};

/** Organization schema — describes the project/entity */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ReconPro",
  alternateName: "ReconPro ASM",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description:
    "Open-source attack surface intelligence platform.",
  sameAs: [SITE_URL],
  foundingDate: "2024",
  license: "https://opensource.org/licenses/MIT",
  programmingLanguage: "Python",
};

/** SoftwareSourceCode schema for the GitHub repo */
const softwareSourceSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "ReconPro",
  description:
    "Attack surface intelligence platform. 51,875 lines of code.",
  url: SITE_URL,
  codeRepository: SITE_URL,
  programmingLanguage: "Python",
  runtimePlatform: "Python 3.10+",
  license: "https://opensource.org/licenses/MIT",
  version: "10.0.0",
  author: {
    "@type": "Organization",
    name: "ReconPro",
  },
};

export function JsonLdStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSourceSchema),
        }}
      />
    </>
  );
}
