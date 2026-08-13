export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
        </div>
        <span className="text-xs text-white/20">Loading...</span>
      </div>
    </div>
  );
}
