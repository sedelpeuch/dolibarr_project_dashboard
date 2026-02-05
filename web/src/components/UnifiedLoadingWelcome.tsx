import React, { useEffect, useState } from "react";

interface UnifiedLoadingWelcomeProps {
  isLoading: boolean;
  hasData: boolean;
  firstname: string;
  lastname: string;
  onDismiss?: () => void;
}

type Stage = "init" | "loading" | "welcome";

export const UnifiedLoadingWelcome: React.FC<UnifiedLoadingWelcomeProps> = ({
  isLoading,
  hasData,
  firstname,
  lastname,
  onDismiss,
}) => {
  const [stage, setStage] = useState<Stage>("init");
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Keep init stage for at least 500ms
  useEffect(() => {
    if (stage === "init") {
      const timer = setTimeout(() => {
        if (isLoading) {
          setStage("loading");
        } else if (hasData) {
          setStage("welcome");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [stage, isLoading, hasData]);

  // Determine stage progression once init is done
  useEffect(() => {
    if (stage !== "init") {
      if (!isLoading && hasData) {
        setStage("welcome");
        // Auto-dismiss welcome after 3 seconds
        const timer = setTimeout(() => {
          setIsExiting(true);
          const exitTimer = setTimeout(() => {
            setIsVisible(false);
            if (onDismiss) onDismiss();
          }, 600);
          return () => clearTimeout(exitTimer);
        }, 3000);
        return () => clearTimeout(timer);
      } else if (isLoading) {
        setStage("loading");
      }
    }
  }, [isLoading, hasData, onDismiss]);

  if (!isVisible) return null;

  const stageLabels = {
    init: "Initialisation",
    loading: "Chargement",
    welcome: "Bienvenue",
  };

  const isStageComplete = (checkStage: Stage) => {
    const stages: Stage[] = ["init", "loading", "welcome"];
    const currentIndex = stages.indexOf(stage);
    const checkIndex = stages.indexOf(checkStage);
    return checkIndex < currentIndex;
  };

  const isStageActive = (checkStage: Stage) => stage === checkStage;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-600 ${
        isExiting
          ? "bg-black/0 backdrop-blur-0"
          : "bg-black/40 backdrop-blur-md"
      }`}
    >
      <div
        className={`transform transition-all duration-600 ${
          isExiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
          {/* Background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-95" />

          {/* Subtle accent lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          {/* Content */}
          <div className="relative px-12 py-16 text-center max-w-lg">
            {/* Progress indicators */}
            <div className="flex justify-center items-center gap-4 mb-12">
              {(["init", "loading", "welcome"] as Stage[]).map(
                (checkStage, index) => (
                  <div key={checkStage} className="flex items-center">
                    {/* Dot */}
                    <div
                      className={`w-3 h-3 rounded-full transition-all duration-500 ${
                        isStageComplete(checkStage)
                          ? "bg-cyan-400 scale-100"
                          : isStageActive(checkStage)
                            ? "bg-blue-500/70 animate-pulse scale-125"
                            : "bg-slate-700/50 scale-100"
                      }`}
                    />
                    {/* Label */}
                    <span
                      className={`ml-2 text-xs font-semibold tracking-widest uppercase transition-colors duration-500 ${
                        isStageComplete(checkStage) || isStageActive(checkStage)
                          ? "text-cyan-400"
                          : "text-slate-600"
                      }`}
                    >
                      {stageLabels[checkStage]}
                    </span>
                    {/* Connector line */}
                    {index < 2 && (
                      <div
                        className={`ml-4 w-6 h-px transition-all duration-500 ${
                          isStageComplete(checkStage)
                            ? "bg-cyan-400"
                            : "bg-slate-700/30"
                        }`}
                      />
                    )}
                  </div>
                )
              )}
            </div>

            {/* Stage-specific content */}
            {stage === "welcome" ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-sm font-semibold tracking-widest text-cyan-400/70 uppercase mb-8">
                  {stageLabels[stage]}
                </p>

                {/* Animated dots for loading */}
                <div className="flex justify-center gap-3 mb-4">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-blue-500/60 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-cyan-400/60 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-blue-500/60 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>

                <p className="text-xs text-slate-400 font-light">
                  {stage === "init"
                    ? "Récupération des données..."
                    : "Configuration..."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
