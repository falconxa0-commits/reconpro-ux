# ReconPro Intelligence Pipeline — Performance Benchmark Results

**Date:** 2026-08-10 10:10:31 UTC
**Python:** 3.12.13
**Script:** `reconpro/scripts/benchmark_intelligence.py`
**Environment:** Single-run, no warmup, `time.perf_counter()` + `tracemalloc`

---

## Raw Results (All Measured — No Fabrication)

### Individual Engine Timings

| Findings | AI Analyst (ms) | Attack Graph (ms) | Threat Intel (ms) |
|----------|-----------------|-------------------|-------------------|
| 100      | 204.72          | 83.71             | 35.61             |
| 500      | 1089.13         | 1834.69           | 168.32            |
| 1000     | 1965.46         | 7492.83           | 342.48            |
| 2000     | 3771.78         | 30972.56          | 708.52            |

### Full Pipeline (AI + Graph + Intel combined)

| Findings | Pipeline (ms) | AI (ms) | Graph (ms) | Intel (ms) | Peak Mem (KB) |
|----------|---------------|---------|------------|------------|---------------|
| 100      | 312.06        | 194.0   | 81.7       | 34.1       | 1,248.5       |
| 500      | 3187.86       | 1067.0  | 1930.3     | 175.8      | 6,421.0       |
| 1000     | 9976.56       | 1963.4  | 7624.6     | 357.4      | 12,363.7      |
| 2000     | 36968.49      | 3796.4  | 32391.2    | 716.2      | 24,375.7      |

### Memory Usage (Peak)

| Findings | AI Analyst (KB) | Attack Graph (KB) | Threat Intel (KB) | Pipeline (KB) |
|----------|-----------------|-------------------|-------------------|----------------|
| 100      | 663.6           | 169.8             | 574.3             | 1,248.5        |
| 500      | 3430.1          | 822.4             | 2799.9            | 6,421.0        |
| 1000     | 6258.7          | 1659.3            | 5615.5            | 12,363.7       |
| 2000     | 11945.6         | 3326.4            | 11244.8           | 24,375.7       |

### Engine Output Metrics

| Findings | AI: Classified | AI: Correlated | AI: Paths | Graph: Nodes | Graph: Edges | Intel: CWEs | Intel: MITRE |
|----------|----------------|----------------|-----------|--------------|--------------|-------------|--------------|
| 100      | 100            | 116            | 3         | 102          | 100          | 3           | 2            |
| 500      | 500            | 995            | 3         | 502          | 500          | 3           | 2            |
| 1000     | 1000           | 991            | 3         | 1002         | 1000         | 3           | 2            |
| 2000     | 2000           | 1042           | 3         | 2002         | 2000         | 3           | 2            |

---

## Scaling Analysis

### AI Analyst — ~O(n^1.3) scaling
- 100→205ms, 500→1089ms, 1000→1965ms, 2000→3772ms
- Roughly doubles from 1000→2000 findings. Correlation phase uses `itertools.combinations` (O(n²)) but appears limited.
- Memory: ~6KB per finding (linear)

### Attack Graph — **O(n²) scaling — CRITICAL BOTTLENECK**
- 100→84ms, 500→1835ms, 1000→7493ms, **2000→30,973ms (31 seconds)**
- Time increases ~4× when findings double. This dominates the pipeline at scale.
- At 2000 findings, Attack Graph consumes **87.6%** of total pipeline time.
- Memory: ~1.7KB per finding (best of the three engines)

### Threat Intel — ~O(n) scaling (linear)
- 100→36ms, 500→168ms, 1000→342ms, 2000→709ms
- Best scaling behavior. Roughly doubles linearly with input size.
- Memory: ~5.6KB per finding (linear)

---

## Key Findings

1. **Attack Graph is the bottleneck.** At 2000 findings it takes 31 seconds vs. 3.8s for AI Analyst and 0.7s for Threat Intel. The graph construction uses O(n²) edge analysis.

2. **Pipeline feasibility by size:**
   - **100 findings:** 312ms — excellent, suitable for interactive use
   - **500 findings:** 3.2s — acceptable for batch/background processing
   - **1000 findings:** 10.0s — slow for interactive, acceptable for reports
   - **2000 findings:** 37.0s — requires background processing or optimization

3. **Memory usage is manageable.** Even at 2000 findings, peak memory is ~24MB for the full pipeline. No risk of memory exhaustion for typical workloads.

4. **Threat Intel is very efficient.** Linear scaling and the fastest engine at every size. No optimization needed.

5. **No errors encountered** in any benchmark run. All three engines processed all findings successfully.

---

## Recommendations

1. **Optimize Attack Graph** — The O(n²) edge analysis is the primary target. Consider:
   - Asset-indexed adjacency (skip non-connected pairs)
   - Limiting combinations to same-asset findings only
   - Parallelizing edge construction

2. **AI Analyst correlation** — The `itertools.combinations` pass could be limited to same-asset groups to reduce from O(n²) to O(sum of k²) where k is per-asset finding count.

3. **5000+ finding support** — Currently impractical due to Attack Graph. With optimization, should target <30s at 5000 findings.

---

*Results JSON saved to: `reconpro/download/benchmark_results.json`*
