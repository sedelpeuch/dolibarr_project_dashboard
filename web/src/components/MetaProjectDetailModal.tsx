import React, { useMemo, useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { MetaProject } from "../hooks/useMetaProjects";
import type { Project } from "../types";
import { formatAmount, formatDate, formatPaymentCondition, getPlannedDays } from '../utils';
import { dolibarrLinks } from "../config";

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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Get the projects included in this meta-project
  const includedProjects = useMemo(() => {
    return metaProject.projectIds
      .map((id) => allProjects.find((p) => p.id === Number(id)))
      .filter((p): p is Project => p !== undefined);
  }, [metaProject.projectIds, allProjects]);

  // Sort projects with opportunities first
  const sortedProjects = useMemo(() => {
    return [...includedProjects].sort((a, b) => {
      if (a.is_opportunity && !b.is_opportunity) return -1;
      if (!a.is_opportunity && b.is_opportunity) return 1;
      return 0;
    });
  }, [includedProjects]);

  // Initialize first project on mount
  useEffect(() => {
    if (sortedProjects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(sortedProjects[0].id);
    }
  }, [sortedProjects, selectedProjectId]);

  // Aggregate data from all projects
  const aggregated = useMemo(() => {
    const budgetData = {
      total_budget: 0,
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
      const displayAmount = project.is_opportunity
        ? (project.opp_amount * project.opp_percent) / 100
        : project.budget_amount;
      budgetData.total_budget += displayAmount;
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
      timeData.total_planned_days += getPlannedDays(project);

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

  const selectedProject = sortedProjects.find(
    (p) => p.id === selectedProjectId,
  );

  const getStatusBadge = (status: string | number): string => {
    const statusNum = typeof status === "string" ? parseInt(status) : status;
    return statusNum === 2 ? "Cloturé" : "Ouvert";
  };

  const getStatusColor = (status: string | number): string => {
    const statusNum = typeof status === "string" ? parseInt(status) : status;
    return statusNum === 2
      ? "bg-slate-700 text-slate-300"
      : "bg-green-500/20 text-green-300";
  };

  const getInvoiceStatusBadge = (
    status: string | number,
  ): { text: string; color: string } => {
    const statusNum = typeof status === "string" ? parseInt(status) : status;
    if (statusNum === 2) {
      return { text: "Payée", color: "bg-green-500/20 text-green-300" };
    }
    return { text: "Impayée", color: "bg-amber-500/20 text-amber-300" };
  };

  const getProposalStatusBadge = (
    status: string | number,
  ): { text: string; color: string } => {
    const statusNum = typeof status === "string" ? parseInt(status) : status;
    switch (statusNum) {
      case 0:
        return { text: "Brouillon", color: "bg-slate-500/20 text-slate-300" };
      case 1:
        return { text: "Validée", color: "bg-blue-500/20 text-blue-300" };
      case 2:
        return { text: "Signée", color: "bg-purple-500/20 text-purple-300" };
      case 3:
        return { text: "Facturée", color: "bg-green-500/20 text-green-300" };
      default:
        return { text: "Brouillon", color: "bg-slate-500/20 text-slate-300" };
    }
  };

  const extractPaymentSchedule = (
    code: string,
    proposal: {
      date_signature: number | null;
      delivery_date: number | null;
      total: number;
    },
  ) => {
    if (!code) return [];
    const schedule: any[] = [];
    const parts = code.replace("PaymentCondition", "").replace("PT_", "");

    if (parts.match(/^\d{4}$/)) {
      const first = parseInt(parts.substring(0, 2));
      const second = parseInt(parts.substring(2, 4));

      if (first > 0 && proposal.date_signature) {
        schedule.push({
          percentage: first,
          date: proposal.date_signature,
          label: `${first}% signature`,
        });
      }

      if (second > 0 && proposal.delivery_date) {
        schedule.push({
          percentage: second,
          date: proposal.delivery_date,
          label: `${second}% livraison`,
        });
      }
    }

    if ((parts === "100" || parts === "000100") && proposal.delivery_date) {
      schedule.push({
        percentage: 100,
        date: proposal.delivery_date,
        label: "100% livraison",
      });
    }

    return schedule;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-slate-900 rounded-lg w-[95%] h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-center justify-between flex-shrink-0">
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Section 1: Composition */}
          <div className="p-6 border-b border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-4 font-semibold">
              Composition du Méta-Projet
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-800/50 border border-slate-700 rounded p-3 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <a
                        href={dolibarrLinks.project(project.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-400 hover:text-blue-300 transition-colors text-sm truncate flex items-center gap-1"
                      >
                        {project.ref.split(" ")[0]}
                        <ExternalLink size={12} className="flex-shrink-0" />
                      </a>
                      <p className="text-xs text-slate-400 truncate">
                        {project.title}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(
                      project.status,
                    )}`}
                  >
                    {getStatusBadge(project.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Résumé Combiné */}
          <div className="p-6 border-b border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-4 font-semibold">
              Résumé Combiné
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="bg-slate-800/50 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Budgets</p>
                <p className="text-xl font-semibold text-slate-200">
                  {formatAmount(aggregated.budgetData.total_budget)} €
                </p>
              </div>
              <div className="bg-slate-800/50 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Propositions</p>
                <p className="text-xl font-semibold text-slate-200">
                  {formatAmount(aggregated.budgetData.total_proposals)} €
                </p>
              </div>
              <div className="bg-slate-800/50 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Facturé</p>
                <p className="text-xl font-semibold text-slate-200">
                  {formatAmount(aggregated.budgetData.total_invoice)} €
                </p>
              </div>
              <div className="bg-slate-800/50 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Temps Passé</p>
                <p className="text-xl font-semibold text-amber-400">
                  {aggregated.timeData.total_time_spent.toFixed(1)} j
                </p>
              </div>
              <div className="bg-slate-800/50 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Jours Planifiés</p>
                <p className="text-xl font-semibold text-slate-200">
                  {aggregated.timeData.total_planned_days.toFixed(1)} j
                </p>
              </div>
            </div>

            {/* Consumption gauge */}
            <div className="bg-slate-800/50 rounded p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Consommation</span>
                <span className="text-slate-300 font-semibold">
                  {consumption.toFixed(0)}%
                </span>
                {isOverConsumed && (
                  <span className="text-red-400 font-semibold">Dépassé</span>
                )}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
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

          {/* Section 3: Détail par Projet avec Tabs */}
          <div className="p-6">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-4 font-semibold">
              Détail par Projet
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 pb-4 border-b border-slate-700 flex-wrap">
              {sortedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded transition-colors font-medium text-sm ${
                    selectedProjectId === project.id
                      ? "bg-blue-500/20 text-blue-300 border border-blue-400/50"
                      : "bg-slate-800/50 text-slate-400 hover:text-slate-300 border border-slate-700"
                  }`}
                >
                  {project.title}
                </button>
              ))}
            </div>

            {/* Project Details */}
            {selectedProject && (
              <div className="space-y-4">
                {/* Project Header */}
                <div className="bg-slate-800/50 border border-slate-700 rounded p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-1">{selectedProject.ref}</p>
                    <h3 className="text-lg font-semibold text-slate-200 break-words">
                      {selectedProject.title}
                    </h3>
                  </div>
                  <a
                    href={`https://gaaspard.catie.fr/projet/card.php?id=${selectedProject.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                    title="Ouvrir dans Dolibarr"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>

                {/* Info Générales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">
                      {selectedProject.is_opportunity ? "Opportunité" : "Budget"}
                    </p>
                    <p className="text-lg font-semibold text-slate-200">
                      {formatAmount(
                        selectedProject.is_opportunity
                          ? (selectedProject.opp_amount * selectedProject.opp_percent) / 100
                          : selectedProject.budget_amount
                      )}{" "}
                      €
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Temps Passé</p>
                    <p className="text-lg font-semibold text-amber-400">
                      {selectedProject.time_spent_total.toFixed(1)} j
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Jours Planifiés</p>
                    <p className="text-lg font-semibold text-slate-200">
                      {getPlannedDays(selectedProject).toFixed(1)} j
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Facturé</p>
                    <p className="text-lg font-semibold text-slate-200">
                      {formatAmount(selectedProject.total_invoiced)} €
                    </p>
                  </div>
                </div>

                {/* Propositions */}
                {selectedProject.proposals && selectedProject.proposals.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-semibold">
                      Propositions Commerciales ({selectedProject.proposals.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {selectedProject.proposals.map((proposal) => {
                        const statusBadge = getProposalStatusBadge(proposal.status);
                        return (
                          <div
                            key={proposal.id}
                            className="bg-slate-800/50 border border-slate-700 rounded p-2"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <a
                                href={dolibarrLinks.proposal(proposal.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs"
                              >
                                {proposal.ref}
                                <ExternalLink size={10} />
                              </a>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge.color}`}
                              >
                                {statusBadge.text}
                              </span>
                            </div>

                            {proposal.date_signature && (
                              <p className="text-xs text-slate-400 mb-1">
                                {formatDate(proposal.date_signature)}
                              </p>
                            )}

                            {proposal.cond_reglement_doc && (
                              <p className="text-xs text-slate-500 mb-1">
                                {formatPaymentCondition(proposal.cond_reglement_doc)}
                              </p>
                            )}

                            <div className="border-t border-slate-700 pt-1 text-right">
                              <p className="text-xs text-slate-300">
                                {formatAmount(proposal.total_ht)} € HT
                              </p>
                              <p className="text-xs text-slate-200 font-semibold">
                                {formatAmount(proposal.total)} € TTC
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Factures (Réelles + Planifiées) */}
                {(() => {
                  const now = Math.floor(Date.now() / 1000);
                  const allInvoices: Array<{
                    id: string;
                    ref: string;
                    date: number;
                    amount: number;
                    amountHT?: number;
                    status?: string | number;
                    isPlanned?: boolean;
                    label?: string;
                  }> = [];

                  // Real invoices
                  if (selectedProject.invoices) {
                    selectedProject.invoices.forEach((invoice) => {
                      allInvoices.push({
                        id: `real-${invoice.id}`,
                        ref: invoice.ref,
                        date: invoice.date_validation || 0,
                        amount: invoice.total,
                        amountHT: invoice.total_ht,
                        status: invoice.status || 0,
                        isPlanned: false,
                      });
                    });
                  }

                  // Planned invoices
                  if (selectedProject.proposals) {
                    selectedProject.proposals.forEach((proposal) => {
                      const schedule = extractPaymentSchedule(
                        proposal.cond_reglement_doc,
                        proposal,
                      );
                      schedule.forEach((payment) => {
                        if (payment.date && payment.date > now) {
                          allInvoices.push({
                            id: `planned-${proposal.id}-${payment.date}`,
                            ref: proposal.ref,
                            date: payment.date,
                            amount: (proposal.total * payment.percentage) / 100,
                            isPlanned: true,
                            label: payment.label,
                          });
                        }
                      });
                    });
                  }

                  return allInvoices.length > 0 ? (
                    <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-semibold">
                      Factures ({allInvoices.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {allInvoices.map((invoice) => {
                          const statusBadge = !invoice.isPlanned && invoice.status
                            ? getInvoiceStatusBadge(invoice.status)
                            : null;

                          return (
                            <div
                              key={invoice.id}
                              className="bg-slate-800/50 border border-slate-700 rounded p-3"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <a
                                  href={
                                    !invoice.isPlanned
                                      ? dolibarrLinks.invoice(parseInt(invoice.id.split("-")[1]))
                                      : "#"
                                  }
                                  target={!invoice.isPlanned ? "_blank" : undefined}
                                  rel={!invoice.isPlanned ? "noopener noreferrer" : undefined}
                                  className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs"
                                >
                                  {invoice.ref}
                                  {!invoice.isPlanned && <ExternalLink size={10} />}
                                </a>
                                {statusBadge && (
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${statusBadge.color}`}
                                  >
                                    {statusBadge.text}
                                  </span>
                                )}
                                {invoice.isPlanned && (
                                  <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-slate-500/20 text-slate-300 flex-shrink-0">
                                    Planifiée
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-400 mb-1">
                                {formatDate(invoice.date)}
                              </p>

                              {invoice.label && (
                                <p className="text-xs text-slate-500 mb-1">
                                  {invoice.label}
                                </p>
                              )}

                              <div className="border-t border-slate-700 pt-1 text-right">
                                {invoice.amountHT && (
                                  <p className="text-xs text-slate-300">
                                    {formatAmount(invoice.amountHT)} € HT
                                  </p>
                                )}
                                <p className="text-xs text-slate-200 font-semibold">
                                  {formatAmount(invoice.amount)} € TTC
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Tasks */}
                {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-semibold">
                      Tâches ({selectedProject.tasks.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {selectedProject.tasks.map((task) => {
                        const consumption =
                          task.planned_workload > 0
                            ? (task.duration_effective /
                                task.planned_workload) *
                              100
                            : 0;
                        const isOver =
                          task.duration_effective > task.planned_workload;

                        return (
                          <div
                            key={task.id}
                            className="bg-slate-800/50 border border-slate-700 rounded p-4 hover:bg-slate-800 transition-colors min-h-[140px] flex flex-col"
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div className="flex-1 min-w-0">
                                <a
                                  href={dolibarrLinks.task(task.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs"
                                >
                                  {task.ref}
                                  <ExternalLink size={10} />
                                </a>
                                <p className="text-xs text-slate-400 truncate">
                                  {task.label}
                                </p>
                              </div>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
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

                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-slate-500">
                                {task.duration_effective.toFixed(1)} /{" "}
                                {task.planned_workload.toFixed(1)} j
                              </span>
                            </div>

                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mt-auto">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOver
                                    ? "bg-red-500"
                                    : consumption > 85
                                      ? "bg-orange-500"
                                      : "bg-blue-500"
                                }`}
                                style={{
                                  width: `${Math.min(100, consumption)}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Time by User */}
                {selectedProject.timespent_by_user &&
                  selectedProject.timespent_by_user.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-semibold">
                        Temps par Personne
                      </p>
                      <div className="space-y-2">
                        {selectedProject.timespent_by_user
                          .sort(
                            (a, b) =>
                              b.total_duration - a.total_duration,
                          )
                          .map((user) => {
                            const maxDuration =
                              selectedProject.timespent_by_user?.[0]
                                ?.total_duration || 1;
                            const percentage =
                              (user.total_duration / maxDuration) * 100;

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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
