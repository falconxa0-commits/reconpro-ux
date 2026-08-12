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
    "Billion-dollar grade attack surface management. Autonomous reconnaissance, real-time threat intelligence, knowledge graph, evidence correlation, and executive reporting.",
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
    "16 autonomous scanner modules",
    "45 CLI commands",
    "Real-time threat intelligence",
    "Knowledge graph with evidence correlation",
    "Executive reporting dashboard",
    "AI-powered vulnerability assessment",
    "Compliance mapping (SOC2, ISO27001, HIPAA, PCI-DSS)",
    "Post-quantum cryptography vault",
    "Air-gapped appliance deployment",
    "Nation-state attribution engine",
  ],
  softwareVersion: "10.0.0",
  programmingLanguage: "Python",
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Organization",
    name: "ReconPro",
    url: SITE_URL,
  },
  installUrl: "https://pypi.org/project/reconpro/",
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
    "Open-source attack surface intelligence platform. 2.4M+ PyPI downloads. 18.7K GitHub stars. 142 contributors.",
  sameAs: [
    "https://github.com/reconpro/reconpro",
    "https://pypi.org/project/reconpro/",
    "https://docs.reconpro.dev",
  ],
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
    "Billion-dollar grade attack surface management. 51,875 lines of hand-crafted Python.",
  url: "https://github.com/reconpro/reconpro",
  codeRepository: "https://github.com/reconpro/reconpro",
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
