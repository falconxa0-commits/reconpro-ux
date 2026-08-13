/**
 * Adversarial XSS Tests — Swarm F
 *
 * ATTACK: Attempt to inject HTML/scripts via user-controlled inputs.
 * Verifies escapeHtml utility defeats all injection vectors.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
// XSS ATTACK VECTORS — escapeHtml must neutralize ALL of these
// ═══════════════════════════════════════════════════════════════════

describe('Adversarial XSS — escapeHtml neutralizes injection vectors', () => {
  it('INFECT: escapes <script> tag injection — tags neutralized', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&lt;/script&gt;');
    // Text content "alert" is preserved as plain text (correct — escapeHtml only escapes HTML entities)
    // The browser will NOT execute the script because the tags are neutralized
  });

  it('INFECT: escapes <img onerror> injection — tag neutralized', () => {
    const input = '<img src=x onerror=alert(1)>';
    const result = escapeHtml(input);
    // Tag is fully escaped — browser never creates an <img> element
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
    expect(result).toContain('&gt;');
    // onerror text is harmless because no actual <img> element is rendered
  });

  it('INFECT: escapes SVG onload injection', () => {
    const input = '<svg onload="alert(document.cookie)">';
    const result = escapeHtml(input);
    expect(result).not.toContain('<svg');
    expect(result).toContain('&lt;svg');
  });

  it('INFECT: escapes JavaScript URI in href — tags neutralized', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = escapeHtml(input);
    // The <a> tag is escaped, so the browser never creates a clickable element
    expect(result).toContain('&lt;a');
    expect(result).toContain('&lt;/a&gt;');
    // Attribute value text preserved but harmless since no actual element exists
    expect(result).toContain('javascript:alert(1)');
  });

  it('INFECT: escapes HTML entity bypass attempt', () => {
    const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const result = escapeHtml(input);
    // Double-encoding prevents entity bypass
    expect(result).toContain('&amp;lt;');
    expect(result).not.toContain('<script>');
  });

  it('INFECT: escapes null byte injection', () => {
    const input = '<scr\x00ipt>alert(1)</script>';
    const result = escapeHtml(input);
    expect(result).not.toContain('<');
  });

  it('INFECT: escapes mixed case tags', () => {
    const input = '<ScRiPt>alert(1)</sCrIpT>';
    const result = escapeHtml(input);
    expect(result).toContain('&lt;ScRiPt&gt;');
    expect(result).not.toContain('<ScRiPt>');
  });

  it('INFECT: escapes template literal injection', () => {
    const input = '${alert(1)}';
    const result = escapeHtml(input);
    // Template literals don't contain HTML special chars, but verify no crash
    expect(result).toContain('${alert(1)}');
  });

  it('INFECT: escapes attribute injection without quotes — tags neutralized', () => {
    const input = '<div class=x onclick=alert(1)>test</div>';
    const result = escapeHtml(input);
    // The <div> tag is escaped so the browser never creates the element
    expect(result).toContain('&lt;div');
    expect(result).toContain('&lt;/div&gt;');
    // onclick text is harmless because no actual element exists
  });

  it('INFECT: escapes iframe injection', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = escapeHtml(input);
    expect(result).toContain('&lt;iframe');
    expect(result).not.toContain('<iframe');
  });

  it('INFECT: escapes style tag injection', () => {
    const input = '<style>body{display:none}</style>';
    const result = escapeHtml(input);
    expect(result).toContain('&lt;style&gt;');
  });

  it('INFECT: escapes single quote injection', () => {
    const input = "it's a test' onclick='alert(1)";
    const result = escapeHtml(input);
    expect(result).toContain('&#39;');
    // All single quotes should be escaped
    const unescapedCount = (result.match(/'/g) || []).length;
    const escapedCount = (result.match(/&#39;/g) || []).length;
    expect(escapedCount).toBeGreaterThan(0);
    expect(unescapedCount).toBe(0);
  });

  it('INFECT: escapes double quote injection', () => {
    const input = 'test" onmouseover="alert(1)';
    const result = escapeHtml(input);
    expect(result).toContain('&quot;');
  });

  it('REGENERATE: preserves safe text content', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('example.com')).toBe('example.com');
    expect(escapeHtml('12345')).toBe('12345');
    expect(escapeHtml('user@example.com')).toBe('user@example.com');
  });

  it('REGENERATE: handles empty and edge cases', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml('   ')).toBe('   ');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('REPLICATE: escapes all 5 HTML entities simultaneously', () => {
    const input = '<div class="test">&copy; 2026 \'ReconPro\'</div>';
    const result = escapeHtml(input);
    expect(result).toContain('&lt;div');
    expect(result).toContain('&quot;test&quot;');
    expect(result).toContain('&amp;copy;');
    expect(result).toContain('&#39;ReconPro&#39;');
    expect(result).toContain('&lt;/div&gt;');
  });
});
