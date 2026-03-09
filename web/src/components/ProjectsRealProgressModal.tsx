import React, { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import type { Project } from "../types";
import { formatDate, getPlannedDays } from "../utils";

interface ProjectsRealProgressModalProps {
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
}

interface EstimatedDays {
  [projectId: number]: number;
}

const ProjectsRealProgressModal: React.FC<ProjectsRealProgressModalProps> = ({
  projects,
  isOpen,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [confirmedDate, setConfirmedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [estimatedDays, setEstimatedDays] = useState<EstimatedDays>({});
  const [defaultEstimatedDays, setDefaultEstimatedDays] = useState<EstimatedDays>({});
  const [reportText, setReportText] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const confirmedTimestamp = Math.floor(new Date(confirmedDate).getTime() / 1000);

  // Recalculate default estimated days when confirmed date changes
  useEffect(() => {
    const newDefaults: EstimatedDays = {};
    
    for (const project of projects) {
      if (project.status === '2') continue; // Skip closed projects
      
      const totalPlannedDays = getPlannedDays(project);
      let consumedBeforeDate = 0;
      let consumedAfterDate = 0;

      if (project.tasks && project.tasks.length > 0) {
        for (const task of project.tasks) {
          if (task.timespent_lines && task.timespent_lines.length > 0) {
            for (const line of task.timespent_lines) {
              if (line.date <= confirmedTimestamp) {
                consumedBeforeDate += line.duration;
              } else {
                consumedAfterDate += line.duration;
              }
            }
          }
        }
      }

      // Default = budget - consumed before - consumed after
      const defaultValue = Math.max(0, totalPlannedDays - consumedBeforeDate - consumedAfterDate);
      newDefaults[project.id] = defaultValue;
    }

    setDefaultEstimatedDays(newDefaults);
  }, [confirmedDate, projects, confirmedTimestamp]);

  if (!isOpen) return null;

  const now = Math.floor(Date.now() / 1000);

  // Calculate consumption and remaining work for each project
  const calculateProjectProgress = (project: Project) => {
    // Total planned days (same logic as ProjectDetailModal)
    const totalPlannedDays = getPlannedDays(project);

    // Parse all timespent lines to get before/after confirmed date
    let consumedBeforeDate = 0;
    let consumedAfterDate = 0;

    if (project.tasks && project.tasks.length > 0) {
      for (const task of project.tasks) {
        if (task.timespent_lines && task.timespent_lines.length > 0) {
          for (const line of task.timespent_lines) {
            if (line.date <= confirmedTimestamp) {
              consumedBeforeDate += line.duration;
            } else {
              consumedAfterDate += line.duration;
            }
          }
        }
      }
    }

    const totalTimeSpent = consumedBeforeDate + consumedAfterDate;

    // Estimated days remaining: use user input or default value
    const estimatedRemaining = (estimatedDays[project.id] ?? defaultEstimatedDays[project.id]) || 0;

    // Real progress = consumed before date / (consumed before + consumed after + estimated remaining)
    const totalDaysToConsume = consumedBeforeDate + consumedAfterDate + estimatedRemaining;
    const realProgress = totalDaysToConsume > 0 
      ? (consumedBeforeDate / totalDaysToConsume) * 100 
      : 0;

    // Consumption = time spent before confirmed date / total budgeted days
    const consumption =
      totalPlannedDays > 0 ? (consumedBeforeDate / totalPlannedDays) * 100 : 0;

    // Cost Performance Index (CPI) = Earned Value (Real Progress) / Actual Cost (Real Consumption)
    const cpi = consumption > 0 ? realProgress / consumption : 0;

    return {
      consumption,
      consumedBeforeDate,
      consumedAfterDate,
      estimatedRemaining,
      realProgress,
      cpi,
      totalPlannedDays,
      totalTimeSpent,
    };
  };

  const handleEstimatedDaysChange = (projectId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEstimatedDays((prev) => ({
      ...prev,
      [projectId]: Math.max(0, numValue),
    }));
  };

  const handleExport = () => {
    const today = new Date();
    const todayTimestamp = Math.floor(today.getTime() / 1000);
    const nextDayAfterConfirmed = new Date((confirmedTimestamp + 86400) * 1000);
    const nextDayAfterTimestamp = Math.floor(nextDayAfterConfirmed.getTime() / 1000);
    
    // Helper function to format date as dd/mm/yyyy
    const formatDateShort = (timestamp: number): string => {
      const date = new Date(timestamp * 1000);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    let text = `Rapport d'avancement\n`;
    text += `===\n`;
    text += `Date limite pour le flash : ${formatDateShort(confirmedTimestamp)}\n`;
    text += `Date d'estimation : ${formatDateShort(todayTimestamp)}\n`;
    text += `===\n\n`;

    const openProjects = projects.filter((p) => p.status !== "2");

    // Column widths for alignment
    const colWidths = { ref: 27, consumed: 19, after: 26, estimated: 12, progress: 14 };

    // Header lines with visual separators and date ranges
    const consumedHeader = `- ${formatDateShort(confirmedTimestamp)}`;
    const afterHeader = `${formatDateShort(nextDayAfterTimestamp)} - ${formatDateShort(todayTimestamp)}`;
    
    const headerLine1 = `${'Ref'.padEnd(colWidths.ref)} | ${'Consommé'.padStart(colWidths.consumed)} | ${'Reste à faire'.padStart(colWidths.after + colWidths.estimated + 3)} | ${'Avancement'.padStart(colWidths.progress)}\n`;
    const headerLine2 = `${' '.repeat(colWidths.ref)} | ${consumedHeader.padStart(colWidths.consumed)} | ${afterHeader.padStart(colWidths.after)} | ${'Estimé'.padStart(colWidths.estimated)} | ${' '.repeat(colWidths.progress)}\n`;
    const separatorLine = `${'-'.repeat(colWidths.ref)}-+-${'-'.repeat(colWidths.consumed)}-+-${'-'.repeat(colWidths.after)}-+-${'-'.repeat(colWidths.estimated)}-+-${'-'.repeat(colWidths.progress)}\n`;

    text += headerLine1;
    text += separatorLine;
    text += headerLine2;
    text += separatorLine;

    for (const project of openProjects) {
      const progress = calculateProjectProgress(project);
      const refTruncated = project.ref.length > 25 ? project.ref.substring(0, 25) : project.ref;
      
      text += `${refTruncated.padEnd(colWidths.ref)} | ${progress.consumedBeforeDate.toFixed(1).padStart(colWidths.consumed)} | ${progress.consumedAfterDate.toFixed(1).padStart(colWidths.after)} | ${progress.estimatedRemaining.toFixed(1).padStart(colWidths.estimated)} | ${progress.realProgress.toFixed(1).padStart(colWidths.progress - 1)}%\n`;
    }
    
    text += separatorLine;

    // Show preview modal
    setReportText(text);
    setShowPreview(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      setShowPreview(false);
      alert("Rapport copié dans le presse-papiers!");
    });
  };

  return (
    <>
      {/* Preview Modal */}
      {showPreview && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-60"
            onClick={() => setShowPreview(false)}
          ></div>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100">Aperçu du rapport</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-800/30">
                <pre className="text-slate-300 text-xs font-mono whitespace-pre-wrap break-words">
                  {reportText}
                </pre>
              </div>
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700 p-4 flex gap-3 justify-end">
                <button
                  onClick={() => setShowPreview(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={copyToClipboard}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  Copier
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-100">
              Avancement Réel
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Date Selector */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-blue-400" />
                  <span className="text-slate-300 font-medium">
                    Date de référence:
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-700 text-slate-100 border border-slate-600 rounded px-3 py-2 hover:border-slate-500 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => setConfirmedDate(selectedDate)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                  >
                    Valider
                  </button>
                </div>
                <button
                  onClick={handleExport}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex-shrink-0"
                >
                  Exporter
                </button>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Aucun projet trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="text-left px-4 py-2 text-slate-400 font-semibold">
                        Projet
                      </th>
                      <th className="text-right px-4 py-2 text-slate-400 font-semibold">
                        Budget
                      </th>
                      <th className="text-right px-4 py-2 text-slate-400 font-semibold">
                        Consommation
                      </th>
                      <th className="text-right px-4 py-2 text-slate-400 font-semibold text-base">
                        Reste à faire
                      </th>
                      <th className="text-right px-4 py-2 text-slate-400 font-semibold">
                        Consommation
                      </th>
                      <th className="text-right px-4 py-2 text-slate-400 font-semibold">
                        Avancement
                      </th>
                      <th className="text-right px-4 py-2 text-slate-400 font-semibold">
                        IPC
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects
                      .filter((p) => p.status !== '2')
                      .map((project) => {
                        const progress = calculateProjectProgress(project);

                        return (
                          <tr
                            key={project.id}
                            className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-blue-400 text-sm">
                                {project.ref}
                              </p>
                            </td>
                            <td className="text-right px-4 py-3 text-slate-300">
                              {progress.totalPlannedDays.toFixed(1)}
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className="font-semibold text-blue-400">
                                {progress.consumedBeforeDate.toFixed(1)} j
                              </p>
                            </td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="text-right">
                                  <p className="font-semibold text-purple-400 text-sm">
                                    {progress.consumedAfterDate.toFixed(1)} j
                                  </p>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={estimatedDays[project.id] ?? ""}
                                    onChange={(e) =>
                                      handleEstimatedDaysChange(project.id, e.target.value)
                                    }
                                    placeholder={defaultEstimatedDays[project.id]?.toFixed(1) || "0"}
                                    className="w-16 bg-slate-700 text-slate-100 border border-slate-600 rounded px-2 py-1 text-xs hover:border-slate-500 focus:outline-none focus:border-blue-400 text-right"
                                  />
                                  {!estimatedDays[project.id]}
                                </div>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className="font-semibold text-slate-300">
                                {(progress.consumption).toFixed(1)}%
                              </p>
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className={`font-semibold text-lg ${
                                progress.realProgress > 100 ? "text-red-400" : 
                                progress.realProgress > 75 ? "text-orange-400" :
                                "text-green-400"
                              }`}>
                                {progress.realProgress.toFixed(1)}%
                              </p>
                            </td>
                            <td className="text-right px-4 py-3">
                              <p className={`font-semibold text-lg ${
                                progress.cpi > 1.1 ? "text-green-400" :
                                progress.cpi >= 0.9 ? "text-yellow-400" :
                                "text-red-400"
                              }`}>
                                {progress.cpi.toFixed(2)}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectsRealProgressModal;
