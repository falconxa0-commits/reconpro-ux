# ADR-003: HTTP Timing-Based Fingerprinting (No Raw Sockets)

## Status

Accepted

## Context

Operating system fingerprinting is a core reconnaissance capability. The industry-standard approach (used by Nmap, p0f, Xprobe) requires **raw socket access** to craft and analyze TCP/IP packets at the protocol level. This provides:

- TCP initial window size observation
- TTL deduction and initial TTL inference
- TCP options ordering (MSS, SACK, window scaling, timestamps)
- SYN-ACK response timing at the kernel level
- IP ID sequence analysis

The `quantum_fingerprint` module in ReconPro v10 achieves OS/kernel identification through a **different approach**: HTTP-level timing analysis. This was necessitated by ADR-001 (Pure Python Architecture), which prohibits raw socket access.

### The Problem

Without raw sockets (no `scapy`, no `AF_PACKET`, no `BPF`), how can we infer the remote operating system, TCP stack implementation, congestion control algorithm, and kernel clock resolution?

### Alternatives Considered

1. **Skip OS fingerprinting entirely**: Accept that this is outside ReconPro's scope. Rejected — OS identification is too valuable for reconnaissance.

2. **Use HTTP `Server` header**: Simple but unreliable. Headers can be changed, hidden, or behind proxies. Rejected — too low accuracy.

3. **Use HTTP `X-Powered-By` or similar headers**: Same problems as `Server` header. Rejected.

4. **Fingerprint based on response characteristics only**: Analyze error pages, default pages, cookie names. Useful for web server identification but not OS identification. Kept as part of the `recon` module.

5. **HTTP timing analysis**: Send carefully crafted HTTP requests and measure sub-millisecond timing characteristics. Novel approach with no established tool precedent. Accepted.

## Decision

Implement OS/kernel fingerprinting through seven orthogonal HTTP timing signals:

### Signal 1: Initial TTL Deduction

By sending HTTP requests with varying payload sizes and measuring RTT, infer the initial TTL of the remote system. TTL deduction patterns differ by OS family (Linux starts at 64, Windows at 128, network devices at 255).

### Signal 2: TCP Window Size

Analyze the initial data-burst volume by measuring how quickly the first N bytes of a large response arrive. The initial TCP window size correlates with OS defaults.

### Signal 3: SYN-ACK Timing Behaviour

Create fresh TCP connections and measure first-byte latency. The TLS handshake + HTTP response latency varies by TLS implementation and kernel.

### Signal 4: HTTP Keep-Alive Persistence

Send multiple requests over a persistent connection and measure timing degradation. Different TCP stacks handle keep-alive differently.

### Signal 5: Path MTU Detection

Send HTTP requests with escalating payload sizes (512B to 16KB). Fragmentation spikes indicate path MTU boundaries, which correlate with network configuration.

### Signal 6: Congestion Control Algorithm

Send a burst of requests followed by recovery probes. The timing pattern of congestion recovery differs between CUBIC (Linux default), BBR, and NewReno.

### Signal 7: Timestamp Resolution

Parse `Date` headers from 25 rapid sequential requests. The clock resolution (1ms vs 10ms vs 1000ms) varies by OS and HTTP server.

### Implementation Details

- Uses `http.client.HTTPSConnection` for low-level connection control
- Uses `time.perf_counter()` for sub-millisecond timing
- Uses `statistics.median()` and `statistics.stdev()` for noise reduction
- Maintains an embedded database of known OS signatures with weighted confidence scoring
- 12 iterations per sub-probe for statistical significance

### OS Signature Database

The module embeds a database of `OSSignature` dataclasses, each containing:
- Expected ranges for all 7 signals
- Tolerance bands and weights
- OS family, name, and kernel version

Confidence is computed as a weighted Euclidean distance between observed signals and known signatures.

## Consequences

### Positive

- **Works without root/admin**: No raw sockets means no privilege escalation. Runs as any user.
- **Works through proxies and CDNs**: Traditional OS fingerprinting fails behind load balancers. HTTP timing can sometimes extract OS signals through CDN layers (depending on cache configuration).
- **Works in restricted environments**: Cloud functions, containers, and restricted networks often block raw sockets but allow HTTP/HTTPS.
- **Novel approach**: This technique is not widely deployed, meaning fewer defenses are tuned against it.
- **Cross-platform**: Identical behavior on Linux, macOS, and Windows.

### Negative

- **Lower accuracy than raw socket methods**: Nmap's OS detection achieves 90%+ accuracy on a direct connection. HTTP timing-based detection is estimated at 40-60% accuracy due to network noise, CDN interference, and TCP middleboxes.
- **Slower**: Each sub-probe requires 12 iterations. The full fingerprint requires ~100+ HTTP requests (several minutes).
- **Affected by network conditions**: Latency jitter, packet loss, and routing changes introduce noise. Statistical methods help but can't eliminate environmental factors.
- **CDN blind spots**: Targets behind Cloudflare, Akamai, or similar CDNs will reflect the CDN's OS characteristics, not the origin server's.
- **No protocol-level data**: Cannot observe TCP options, IP ID sequences, or other protocol fields that are highly discriminative.
- **Probability, not certainty**: Results are expressed as confidence percentages, not definitive OS names. This is honest but less actionable for users accustomed to Nmap's definitive output.

### Neutral

- **Complementary to traditional tools**: When combined with Nmap, the HTTP timing signals provide additional data points that can improve overall OS identification confidence. They are not a replacement.
- **Academic interest**: The approach is based on published research (Zalewski 2006, Ha et al. 2008, Cardwell et al. 2016) and represents a novel application of HTTP timing analysis.

## Validation

1. Test against known OS targets (Linux, Windows, BSD) and verify that the correct OS family appears in the top-3 confidence-ranked results.
2. Test through a CDN (Cloudflare) and verify that CDN detection is reported rather than false OS attribution.
3. Verify that 100% of probes complete without requiring elevated privileges.

## Related Decisions

- ADR-001: Pure Python Architecture (this decision is a direct consequence)
- ADR-004: Universal Finding Dataclass (fingerprint results are returned as Findings)