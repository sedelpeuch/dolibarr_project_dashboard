interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Chargement...",
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6 animate-pulse-spin">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-slate-700/50"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500/70 border-r-cyan-400/70 animate-spin"></div>
            <div className="absolute inset-0 rounded-full border border-slate-600/30 animate-[spin_3s_linear_reverse]"></div>
          </div>
        </div>
        <p className="text-slate-400 font-light text-lg tracking-wide">{message}</p>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
