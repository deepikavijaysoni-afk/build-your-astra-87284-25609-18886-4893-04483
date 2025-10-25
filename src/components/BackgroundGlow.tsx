export function BackgroundGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/30 blur-[120px] rounded-full" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-400/20 blur-[100px] rounded-full" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[200px] bg-white/10 blur-[80px] rounded-full" />
        </div>
      </div>
    </div>
  );
}
