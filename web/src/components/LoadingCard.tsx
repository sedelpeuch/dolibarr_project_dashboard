import React from "react";

interface LoadingCardProps {
  message?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  message = "Chargement du projet",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-700 ease-out opacity-100">
      <div className="transform transition-all duration-700 scale-100 opacity-100">
        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
          {/* Background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-95" />

          {/* Subtle accent lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          {/* Content */}
          <div className="relative px-12 py-16 text-center max-w-lg">
            <p className="text-sm font-semibold tracking-widest text-cyan-400/70 uppercase mb-8">
              {message}
            </p>

            {/* Animated dots - 3rd one scales up on completion */}
            <div className="flex justify-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500/60 animate-bounce transition-transform duration-1000" style={{ animationDelay: '300ms' }} />
            </div>

            <p className="text-xs text-slate-400 font-light">
              Récupération des données...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
