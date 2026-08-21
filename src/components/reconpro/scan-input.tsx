'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Shield, Loader2, Clock, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScanInputProps {
  onScan: (domain: string, scanType: string) => void;
  isScanning: boolean;
}

const SCAN_TYPES = [
  { id: 'quick', label: 'Quick Scan', desc: 'Subdomains + open ports', icon: Zap, estimatedTime: '2–5 min', color: '#00ff88' },
  { id: 'full', label: 'Full Recon', desc: 'Complete attack surface analysis', icon: Shield, estimatedTime: '10–20 min', color: '#ffffff' },
  { id: 'vuln', label: 'Vuln Assessment', desc: 'Deep vulnerability analysis', icon: Bug, estimatedTime: '15–30 min', color: '#ff3355' },
];

export function ScanInput({ onScan, isScanning }: ScanInputProps) {
  const [domain, setDomain] = useState('');
  const [scanType, setScanType] = useState('full');

  const selectedType = SCAN_TYPES.find(t => t.id === scanType) || SCAN_TYPES[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || isScanning) return;
    onScan(domain.trim(), scanType);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Scan Type Selector - Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        {SCAN_TYPES.map((type) => {
          const TypeIcon = type.icon;
          const isActive = scanType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setScanType(type.id)}
              disabled={isScanning}
              className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all group ${
                isActive
                  ? 'bg-white/[0.06] border-white/[0.12]'
                  : 'bg-transparent border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02]'
              } disabled:opacity-50`}
            >
              <TypeIcon className="w-4 h-4" style={{ color: isActive ? type.color : undefined }} />
              <span className={`text-[12px] font-medium ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`}>{
                type.label
              }</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-700" />
                <span className="text-[10px] text-neutral-700">{type.estimatedTime}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input Row */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter target domain (e.g., github.com)"
              className="h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border-white/[0.07] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 transition-all font-mono text-[13px]"
              disabled={isScanning}
            />
          </div>

          <Button
            type="submit"
            disabled={!domain.trim() || isScanning}
            className="h-12 px-8 rounded-xl bg-white text-black hover:bg-white/90 font-semibold transition-all disabled:opacity-40 relative overflow-hidden"
          >
            {isScanning ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Scanning...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Launch Scan</span>
              </div>
            )}
          </Button>
        </div>
      </form>

      {/* Quick suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['example.com', 'testsite.io', 'sample.org', 'demo.dev', 'yourdomain.com'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => { setDomain(d); }}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-neutral-600 bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] hover:text-neutral-300 transition-all disabled:opacity-40"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
