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
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-neutral-300 hover:border-white/[0.12] transition-all h-12 whitespace-nowrap"
            >
              {selectedType.icon}
              <span className="hidden sm:inline">{selectedType.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
            </button>
            <AnimatePresence>
              {showTypeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full mt-2 left-0 z-50 w-64 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] shadow-2xl"
                >
                  {scanTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setScanType(type.id); setShowTypeDropdown(false); }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                        scanType === type.id
                          ? 'bg-white/[0.08] border border-white/[0.12]'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${scanType === type.id ? 'bg-white/[0.12] text-white' : 'bg-white/[0.04] text-neutral-600'}`}>
                        {type.icon}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-neutral-200">{type.label}</div>
                        <div className="text-[11px] text-neutral-600">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Domain input */}
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

          {/* Scan button */}
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