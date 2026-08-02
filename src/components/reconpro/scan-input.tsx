'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Shield, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScanInputProps {
  onScan: (domain: string, scanType: string) => void;
  isScanning: boolean;
}

export function ScanInput({ onScan, isScanning }: ScanInputProps) {
  const [domain, setDomain] = useState('');
  const [scanType, setScanType] = useState('full');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const scanTypes = [
    { id: 'quick', label: 'Quick Scan', desc: 'Subdomains + open ports', icon: <Zap className="w-4 h-4" /> },
    { id: 'full', label: 'Full Scan', desc: 'Complete attack surface analysis', icon: <Shield className="w-4 h-4" /> },
  ];

  const selectedType = scanTypes.find(t => t.id === scanType) || scanTypes[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || isScanning) return;
    onScan(domain.trim(), scanType);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2 items-center">
          {/* Scan type selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#151c2e] border border-[rgba(52,211,153,0.12)] text-sm text-[#f1f5f9] hover:border-[rgba(52,211,153,0.3)] transition-all h-12 whitespace-nowrap"
            >
              {selectedType.icon}
              <span className="hidden sm:inline">{selectedType.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {showTypeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 left-0 z-50 w-64 p-2 rounded-xl bg-[#0f1422] border border-[rgba(52,211,153,0.15)] shadow-2xl"
                >
                  {scanTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setScanType(type.id); setShowTypeDropdown(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        scanType === type.id
                          ? 'bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)]'
                          : 'hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${scanType === type.id ? 'bg-[rgba(52,211,153,0.15)] text-[#34d399]' : 'bg-[rgba(255,255,255,0.06)] text-muted-foreground'}`}>
                        {type.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#f1f5f9]">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Domain input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter target domain (e.g., github.com)"
              className="h-12 pl-12 pr-4 rounded-xl bg-[#151c2e] border-[rgba(52,211,153,0.12)] text-[#f1f5f9] placeholder:text-muted-foreground focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399] transition-all font-mono text-sm"
              disabled={isScanning}
            />
          </div>

          {/* Scan button */}
          <Button
            type="submit"
            disabled={!domain.trim() || isScanning}
            className="h-12 px-8 rounded-xl bg-[#34d399] text-[#080a10] font-semibold hover:bg-[#00cc6e] transition-all disabled:opacity-50 relative overflow-hidden"
          >
            {isScanning ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="hidden sm:inline">Scanning...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="hidden sm:inline">Launch Scan</span>
              </div>
            )}
            {isScanning && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </Button>
        </div>
      </form>

      {/* Quick suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['github.com', 'google.com', 'stripe.com', 'netflix.com', 'shopify.com'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => { setDomain(d); }}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(52,211,153,0.2)] hover:text-[#34d399] transition-all disabled:opacity-50"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}