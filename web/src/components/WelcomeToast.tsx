import React, { useEffect, useState } from "react";

interface WelcomeToastProps {
  firstname: string;
  lastname: string;
  onDismiss?: () => void;
  duration?: number;
}

export const WelcomeToast: React.FC<WelcomeToastProps> = ({
  firstname,
  lastname,
  onDismiss,
  duration = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, 600);

      return () => clearTimeout(exitTimer);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-600 ${
      isExiting 
        ? "bg-black/0 backdrop-blur-0" 
        : "bg-black/40 backdrop-blur-md"
    }`}>
      <div className={`transform transition-all duration-600 ${
        isExiting 
          ? "scale-95 opacity-0" 
          : "scale-100 opacity-100"
      }`}>
        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
          {/* Background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-95" />
          
          {/* Subtle accent lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          
          {/* Content */}
          <div className="relative px-12 py-16 text-center max-w-lg">
            <p className="text-sm font-semibold tracking-widest text-cyan-400/70 uppercase mb-4">
              Bienvenue
            </p>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-transparent mb-4">
              {firstname}
            </h2>
            <p className="text-2xl font-light text-slate-300 mb-6">
              {lastname}
            </p>
            <p className="text-sm text-slate-400 font-light">
              Prêt à se concentrer sur vos projets
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
