import React, { useMemo } from "react";
import { X } from "lucide-react";
import { MetaProject } from "../hooks/useMetaProjects";
import type { Project } from "../types";
import { formatAmount } from "../utils";

interface MetaProjectDetailModalProps {
  metaProject: MetaProject;
  allProjects: Project[];
  onClose: () => void;
}

export const MetaProjectDetailModal: React.FC<MetaProjectDetailModalProps> = ({
  metaProject,
  allProjects,
  onClose,
}) => {
  // Get the projects included in this meta-project
  const includedProjects = useMemo(() => {
    return metaProject.projectIds
      .map((id) => allProjects.find((p) => p.id === id))
      .filter((p): p is Project => p !== undefined);
  }, [metaProject.projectIds, allProjects]);

  // Aggregate data from all projects
  const aggregated = useMemo(() => {
    const budgetData = {
      total_proposals: 0,
      total_facture: 0,
      total_invoice: 0,
      total_planned: 0,
    };
    const timeData = {
      total_time_spent: 0,
      total_planned_days: 0,
    };
    const tasksData: any[] = [];
    const timespentByUserData: {
      [key: number]: {
        user_id: number;
        user_name: string;
        total_duration: number;
      };
    } = {};

    includedProjects.forEach((project) => {
      // Budget
      if (project.proposals) {
        budgetData.total_proposals += project.proposals.reduce(
          (sum, p) => sum + (p.total || 0),
          0,
        );
      }
      if (project.invoices) {
        budgetData.total_invoice += project.invoices.reduce(
          (sum, i) => sum + (i.total || 0),
          0,
        );
      }

      // Time
      timeData.total_time_spent += project.time_spent_total;
      timeData.total_planned_days += project.wp_days + project.rd_days;

      // Tasks with project ref
      if (project.tasks) {
        project.tasks.forEach((task) => {
          tasksData.push({
            ...task,
            projectRef: project.ref,
            projectId: project.id,
          });
        });
      }

      // Timespent by user
      if (project.timespent_by_user) {
        project.timespent_by_user.forEach((tbu) => {
          if (!timespentByUserData[tbu.user_id]) {
            timespentByUserData[tbu.user_id] = {
              user_id: tbu.user_id,
              user_name: tbu.user_name,
              total_duration: 0,
            };
          }
          timespentByUserData[tbu.user_id].total_duration += tbu.total_duration;
        });
      }
    });

    const timespentByUser = Object.values(timespentByUserData).sort(
      (a, b) => b.total_duration - a.total_duration,
    );

    return {
      budgetData,
      timeData,
      tasksData,
      timespentByUser,
    };
  }, [includedProjects]);

  const consumption =
    aggregated.timeData.total_planned_days > 0
      ? (aggregated.timeData.total_time_spent /
          aggregated.timeData.total_planned_days) *
        100
      : 0;

  const isOverConsumed =
    aggregated.timeData.total_time_spent >
    aggregated.timeData.total_planned_days;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-50">
              {metaProject.name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {includedProjects.length} projet
              {includedProjects.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={24} className="text-slate-400 hover:text-slate-200" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Budget Section */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
              Budget Combiné
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Propositions</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatAmount(aggregated.budgetData.total_proposals)} €
                </p>
              </div>
              <div className="bg-slate-800/50 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Facturé</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatAmount(aggregated.budgetData.total_invoice)} €
                </p>
              </div>
            </div>
          </div>

          {/* Time Section */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
              Temps Combiné
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-800/50 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Temps Passé</p>
                <p className="text-lg font-semibold text-amber-400">
                  {aggregated.timeData.total_time_spent.toFixed(1)} j
                </p>
              </div>
              <div className="bg-slate-800/50 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Jours Planifiés</p>
                <p className="text-lg font-semibold text-slate-200">
                  {aggregated.timeData.total_planned_days.toFixed(1)} j
                </p>
              </div>
            </div>

            {/* Consumption gauge */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Consommation</span>
                <span className="text-slate-300 font-semibold">
                  {consumption.toFixed(0)}%
                </span>
                {isOverConsumed && (
                  <span className="text-red-400 font-semibold">Dépassé</span>
                )}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOverConsumed
                      ? "bg-red-500"
                      : consumption > 85
                        ? "bg-orange-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, consumption)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Temps par personne */}
          {aggregated.timespentByUser.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                Temps par Personne
              </p>
              <div className="space-y-2">
                {aggregated.timespentByUser.map((user) => {
                  const maxDuration =
                    aggregated.timespentByUser[0]?.total_duration || 1;
                  const percentage = (user.total_duration / maxDuration) * 100;

                  return (
                    <div
                      key={user.user_id}
                      className="bg-slate-800/50 rounded p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-300">
                          {user.user_name}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">
                          {user.total_duration.toFixed(1)} j
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks */}
          {aggregated.tasksData.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                Tâches ({aggregated.tasksData.length})
              </p>
              <div className="space-y-2">
                {aggregated.tasksData.map((task) => {
                  const consumption =
                    task.planned_workload > 0
                      ? (task.duration_effective / task.planned_workload) * 100
                      : 0;
                  const isOver =
                    task.duration_effective > task.planned_workload;

                  return (
                    <div
                      key={`${task.projectId}-${task.id}`}
                      className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded p-2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs text-slate-400">
                            {task.projectRef}
                          </p>
                          <p className="font-semibold text-slate-300">
                            {task.ref}
                          </p>
                          <p className="text-xs text-slate-400">{task.label}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                            isOver
                              ? "bg-red-500/20 text-red-300"
                              : consumption > 85
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {consumption.toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">
                          {task.duration_effective.toFixed(1)} /{" "}
                          {task.planned_workload.toFixed(1)} j
                        </span>
                      </div>

                      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver
                              ? "bg-red-500"
                              : consumption > 85
                                ? "bg-orange-500"
                                : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(100, consumption)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Included Projects */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
              Projets Inclus
            </p>
            <div className="space-y-2">
              {includedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-800/50 border border-slate-700 rounded p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-300">
                      {project.ref}
                    </p>
                    <p className="text-xs text-slate-400">{project.title}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-slate-400">
                      {formatAmount(project.total_invoiced)} € facturé
                    </p>
                    <p className="text-slate-500">
                      {project.time_spent_total.toFixed(1)} j
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
