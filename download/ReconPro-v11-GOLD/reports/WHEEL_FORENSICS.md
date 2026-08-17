# Wheel Forensics — reconpro-11.0.0-py3-none-any.whl

**Files:** 204
**Compressed:** 1,583,658 bytes
**Uncompressed:** 7,006,451 bytes

## METADATA
```
Metadata-Version: 2.4
Name: reconpro
Version: 11.0.0
Summary: ReconPro v11 — Enterprise Security Reconnaissance Platform. 30 Modules. 50+ Commands. MITRE ATT&CK. SARIF/PDF/CSV. Pure Python.
Author-email: ReconPro Security <security@reconpro.io>
License-Expression: MIT
Keywords: security,scanner,reconnaissance,vulnerability,pentest,osint,subdomain,mitre-attack,sarif,fuzzer,waf-bypass,grpc,lfi,rfi,timing-attack,webhook,plugin
Classifier: Development Status :: 4 - Beta
Classifier: Environment :: Console
Classifier: Intended Audience :: Developers
Classifier: Intended Audience :: Information Technology
Classifier: Intended Audience :: System Administrators
Classifier: Programming Language :: Python :: 3
Classifier: Topic :: Security
Requires-Python: >=3.8
Description-Content-Type: text/markdown
License-File: LICENSE
Requires-Dist: rich>=13.0.0
Requires-Dist: textual>=0.40.0
Requires-Dist: requests>=2.28.0
Provides-Extra: async
Requires-Dist: aiohttp>=3.9.0; extra == "async"
Provides-Extra: browser
Requires-Dist: playwright>=1.40.0; extra == "browser"
Provides-Extra: llm
Requires-Dist: openai>=1.0.0; extra == "llm"
Requires-Dist: anthropic>=0.18.0; extra == "llm"
Provides-Extra: graph
Requires-Dist: networkx>=3.0; extra == "graph"
Provides-Extra: raw
Requires-Dist: scapy>=2.5.0; extra == "raw"
Provides-Extra: intel
Requires-Dist: shodan>=1.25.0; extra == "intel"
Provides-Extra: collab
Requires-Dist: websockets>=12.0; extra == "collab"
Provides-Extra: integrations
Requires-Dist: jira>=3.0; extra == "integrations"
Requires-Dist: slack-sdk>=3.0; extra == "integrations"
Provides-Extra: full
Requires-Dist: aiohttp>=3.9.0; extra == "full"
Requires-Dist: playwright>=1.40.0; extra == "full"
Requires-Dist: openai>=1.0.0; extra == "full"
Requires-Dist: anthropic>=0.18.0; extra == "full"
Requires-Dist: networkx>=3.0; extra == "full"
Requires-Dist: scapy>=2.5.0; extra == "full"
Requires-Dist: shodan>=1.25.0; extra == "full"
Requires-Dist: websockets>=12.0; extra == "full"
Dynamic: license-file

# ReconPro v11.0.0

```

## WHEEL
```
Wheel-Version: 1.0
Generator: setuptools (84.0.0)
Root-Is-Purelib: true
Tag: py3-none-any


```

## entry_points.txt
```
[console_scripts]
reconpro = reconpro.cli:main

```

## top_level.txt
```
reconpro

```

## File Count by Extension

| Extension | Count |
|-----------|-------|
| .py | 198 |
| .txt | 2 |
| .dist-info/licenses/LICENSE | 1 |
| .dist-info/METADATA | 1 |
| .dist-info/WHEEL | 1 |
| .dist-info/RECORD | 1 |

## RECORD Integrity (first 10 entries)
``
reconpro/__init__.py,sha256=qd45tmy34EZ76BFdVlTXa7mY3qw2MekxNBv_c179A4w,4468
reconpro/adversarial.py,sha256=DVYGQiuJZDiwEFCfF0m0PajBVMx_oQFF8A3ekq3ECqk,49897
reconpro/agent.py,sha256=ay7h7bTe_SepNZwsWpYgS5Hp6X0oX37Tz_C56y7Ro0A,7514
reconpro/ai_analyst.py,sha256=c7_y1ibXqy_jMWQfiX3USL7FQmwZNhxsnZtwrBvo5hk,74349
reconpro/ai_copilot.py,sha256=pbgOlvXahVjXfbT2VDSBYvhRPZOi41iDYgII2CFi_pY,9981
reconpro/ai_cve_db.py,sha256=NNMM6SwqtWfyow_AiZJXj7DSaPppUSvoN31k4rVgg9s,20435
reconpro/ai_red_team.py,sha256=C7DQbmC-8o001AZQG3fDnpTwXniHeNT1fs8MzuE826o,35778
reconpro/ansi_capture.py,sha256=vePPJEJeygd5wm531lUCd-lFc7HGmBG_qZM8qDdfV-s,7167
reconpro/api_discovery.py,sha256=caoloJATYASynm7BPx3V3wgnwP5UjC6f4UD7eiWdB98,45810
reconpro/async_http.py,sha256=_ZFCvnmanvFhxheI6RD2MYbwphFqug3-uT6c7J6pY-4,32772
... (204 total entries)
```