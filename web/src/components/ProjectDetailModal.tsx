import React, { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Project } from "../types";
import { dolibarrLinks } from "../config";
import {
  formatDate,
  formatAmount,
  formatPaymentCondition,
  getPlannedDays,
  computeElapsedPercent,
  extractPaymentSchedule,
} from "../utils";
import ProgressBar from './ProgressBar'

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const getUnitechBadge = (unittech: number): string => {
  switch (unittech) {
    case 1:
      return "SIDO";
    case 2:
      return "SONU";
    case 3:
      return "HOMA";
    default:
      return "";
  }
};

const getUnitechColor = (unittech: number): string => {
  switch (unittech) {
    case 1:
      return "bg-blue-500";
    case 2:
      return "bg-[#45a288]";
    case 3:
      return "bg-orange-500";
    default:
      return "bg-slate-600";
  }
};

interface PaymentSchedule {
  percentage: number;
  date: number | null;
  label: string;
}

// extractPaymentSchedule moved to ../utils

const getStatusBadge = (
  status: string | number,
): { text: string; color: string } => {
  const statusNum = typeof status === "string" ? parseInt(status) : status;
  return statusNum === 2
    ? { text: "Cloturé", color: "bg-slate-700 text-slate-300" }
    : { text: "Ouvert", color: "bg-green-500/20 text-green-300" };
};

const countryCodeToFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
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

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  if (!isOpen || !project) return null;

  const toggleLineExpanded = (proposalId: number, lineIdx: number) => {
    const key = `${proposalId}-${lineIdx}`;
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedLines(newExpanded);
  };

  const displayAmount = project.is_opportunity
    ? (project.opp_amount * project.opp_percent) / 100
    : project.budget_amount;

  const statusBadge = getStatusBadge(project.status);

  const unittechs = project.unittech
    .map((ut) => ({
      badge: getUnitechBadge(ut),
      color: getUnitechColor(ut),
    }))
    .filter((ut) => ut.badge !== "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-400 mb-1">{project.ref}</p>
              <h2 className="text-2xl font-bold text-slate-100 break-words">
                {project.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`text-xs px-3 py-1 rounded font-medium whitespace-nowrap ${statusBadge.color}`}
              >
                {statusBadge.text}
              </span>
              <a
                href={`https://gaaspard.catie.fr/projet/card.php?id=${project.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Ouvrir dans Dolibarr"
              >
                <ExternalLink size={20} />
              </a>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Unitechs */}
            {unittechs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {unittechs.map((ut) => (
                  <span
                    key={ut.badge}
                    className={`${ut.color} text-white text-xs px-3 py-1 rounded font-semibold`}
                  >
                    {ut.badge}
                  </span>
                ))}
              </div>
            )}

            {/* Client */}
            {!project.is_rd && (
              <div className="border-t border-slate-700/50 pt-6">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={dolibarrLinks.company(parseInt(project.client_id))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors inline-flex"
                    >
                      {project.client_name || "N/A"}
                      <ExternalLink size={14} className="flex-shrink-0" />
                    </a>
                    {(project.client_code || project.client_address) && (
                      <p className="text-xs text-slate-500 inline ml-2">
                        {project.client_code && `${project.client_code}`}
                        {project.client_code && project.client_address && " • "}
                        {project.client_address &&
                          `${project.client_address}${
                            project.client_zip || project.client_town
                              ? ", " + project.client_zip + " " + project.client_town
                              : ""
                          }`}
                      </p>
                    )}
                  </div>
                  {project.client_country_code && (
                    <span className="text-xl flex-shrink-0">
                      {countryCodeToFlag(project.client_country_code)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            {!project.is_rd && (
              <div className="border-t border-slate-700/50 pt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                  Période
                </p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Début</p>
                    <p className="text-lg font-semibold text-slate-200">
                      {formatDate(project.date_start)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Fin</p>
                    {project.date_end === 0 ? (
                      <p className="text-lg font-semibold text-red-400">
                        Pas de deadline
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-slate-200">
                        {formatDate(project.date_end)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {project.date_end !== 0 && (
                  <div>
                    {(() => {
                      const progress = computeElapsedPercent(project.date_start, project.date_end)
                      const isOverdue = Math.floor(Date.now() / 1000) > project.date_end

                      return (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">{progress.toFixed(0)}%</span>
                            {isOverdue && <span className="text-red-400 font-semibold">Dépassé</span>}
                          </div>
                          <ProgressBar percent={progress} />
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Budget */}
            {!project.is_rd && (
              <div className="border-t border-slate-700/50 pt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                  {project.is_opportunity ? "Opportunité" : "Budget"}
                </p>
                {displayAmount === 0 && project.total_invoiced === 0 ? (
                  <p className="text-sm font-semibold text-red-400">
                    Pas de budget
                  </p>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {project.total_invoiced > 0 && (
                        <div>
                          <p className="text-xs text-slate-400">Facturé</p>
                          <p className="text-base font-semibold text-amber-400">
                            {formatAmount(project.total_invoiced)} €
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-400">
                          {project.is_opportunity ? "Montant" : "Budget"}
                        </p>
                        <p className="text-base font-semibold text-blue-400">
                          {formatAmount(displayAmount)} €
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {project.total_invoiced > 0 && displayAmount > 0 && (
                      <div className="mb-3">
                        {(() => {
                          const progress = Math.min(100, (project.total_invoiced / displayAmount) * 100)
                          const isOverBudget = project.total_invoiced > displayAmount

                          return (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400">{progress.toFixed(0)}%</span>
                                {isOverBudget && <span className="text-red-400 font-semibold">Dépassé</span>}
                              </div>
                              <ProgressBar percent={Math.min(100, progress)} heightClass="h-1.5" />
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Proposals */}
                    {project.proposals && project.proposals.length > 0 && (
                      <div className="mt-2 pt-2 space-y-1">
                        {project.proposals.map((proposal) => {
                          const statusBadge = getProposalStatusBadge(
                            proposal.status,
                          );
                          return (
                            <div
                              key={proposal.id}
                              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded p-2 transition-colors group"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <a
                                  href={dolibarrLinks.proposal(proposal.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
                                >
                                  {proposal.ref}
                                  <ExternalLink size={12} />
                                </a>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge.color}`}
                                >
                                  {statusBadge.text}
                                </span>
                              </div>

                              {proposal.date_creation && (
                                <p className="text-xs text-slate-400 mb-1">
                                  {formatDate(proposal.date_creation)}
                                </p>
                              )}

                              {proposal.lines && proposal.lines.length > 0 && (
                                <div className="text-xs text-slate-400 space-y-0.5 mb-2">
                                  {proposal.lines.map((line, idx) => {
                                    const lineKey = `${proposal.id}-${idx}`;
                                    const isExpanded =
                                      expandedLines.has(lineKey);
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() =>
                                          toggleLineExpanded(proposal.id, idx)
                                        }
                                        className="w-full text-left bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 rounded p-1 transition-colors"
                                      >
                                        <div className="flex justify-between gap-2 items-start">
                                          <span className="text-slate-400 font-medium text-xs">
                                            Ligne {line.rang}
                                          </span>
                                          <span className="flex-shrink-0 font-medium text-slate-300 text-xs">
                                            {formatAmount(line.total)} €
                                          </span>
                                        </div>
                                        {isExpanded && (
                                          <div className="mt-1 pt-1 border-t border-slate-600">
                                            <div
                                              className="prose prose-sm prose-invert max-w-none text-slate-300"
                                              dangerouslySetInnerHTML={{
                                                __html: line.description,
                                              }}
                                            />
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {proposal.cond_reglement_doc && (
                                <p className="text-xs text-slate-500 mb-1">
                                  {formatPaymentCondition(
                                    proposal.cond_reglement_doc,
                                  )}
                                </p>
                              )}

                              <div className="border-t border-slate-700 pt-1 text-right">
                                <p className="text-xs text-slate-300">
                                  {formatAmount(proposal.total_ht)} € HT
                                </p>
                                <p className="text-sm text-slate-200 font-semibold">
                                  {formatAmount(proposal.total)} € TTC
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Invoices */}
                    {project.invoices && project.invoices.length > 0 && (
                      <div className="mt-2 pt-2">
                        <div className="space-y-1">
                          {project.invoices.map((invoice) => {
                            const statusBadge = getInvoiceStatusBadge(
                              invoice.status,
                            );
                            return (
                              <div
                                key={invoice.id}
                                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded p-2 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <a
                                    href={dolibarrLinks.invoice(invoice.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
                                  >
                                    {invoice.ref}
                                    <ExternalLink size={12} />
                                  </a>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge.color}`}
                                  >
                                    {statusBadge.text}
                                  </span>
                                </div>

                                {invoice.date_validation && (
                                  <p className="text-xs text-slate-400 mb-1">
                                    {formatDate(invoice.date_validation)}
                                  </p>
                                )}

                                <div className="border-t border-slate-700 pt-1 text-right">
                                  <p className="text-xs text-slate-300">
                                    {formatAmount(invoice.total_ht)} € HT
                                  </p>
                                  <p className="text-sm text-slate-200 font-semibold">
                                    {formatAmount(invoice.total)} € TTC
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Planned Invoices */}
                    {(() => {
                      const now = Math.floor(Date.now() / 1000);
                      const plannedInvoices: Array<{
                        label: string;
                        date: number;
                        amount: number;
                        proposalRef: string;
                      }> = [];

                      // Extract all future payment schedules from proposals
                      if (project.proposals) {
                        project.proposals.forEach((proposal) => {
                          const schedule = extractPaymentSchedule(
                            proposal.cond_reglement_doc,
                            proposal,
                          );
                          schedule.forEach((payment) => {
                            if (payment.date && payment.date > now) {
                              plannedInvoices.push({
                                label: payment.label,
                                date: payment.date,
                                amount:
                                  (proposal.total * payment.percentage) / 100,
                                proposalRef: proposal.ref,
                              });
                            }
                          });
                        });
                      }

                      return plannedInvoices.length > 0 ? (
                        <div className="mt-2 pt-2">
                          <div className="space-y-1">
                            {plannedInvoices
                              .sort((a, b) => a.date - b.date)
                              .map((invoice, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded p-2 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-semibold text-slate-300 text-sm">
                                      {invoice.label} ({invoice.proposalRef})
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-500/20 text-blue-300">
                                      Prévu
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mb-1">
                                    {formatDate(invoice.date)}
                                  </p>
                                  <div className="border-t border-slate-700 pt-1 text-right">
                                    <p className="text-sm text-slate-200 font-semibold">
                                      {formatAmount(invoice.amount)} € TTC
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Time */}
            <div className="border-t border-slate-700/50 pt-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                Temps
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Temps Passé</p>
                  <p className="text-lg font-semibold text-amber-400">
                    {project.time_spent_total.toFixed(1)} j
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Jours Planifiés</p>
                  <p className="text-lg font-semibold text-slate-200">
                    {getPlannedDays(project).toFixed(1)} j
                  </p>
                </div>
              </div>

              {/* Consumption gauge */}
              {(() => {
                const plannedDays = getPlannedDays(project)
                const consumption = plannedDays > 0 ? (project.time_spent_total / plannedDays) * 100 : 0
                const isOverConsumed = project.time_spent_total > plannedDays

                return (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Consommation</span>
                      <span className="text-slate-300 font-semibold">{consumption.toFixed(0)}%</span>
                      {isOverConsumed && <span className="text-red-400 font-semibold">Dépassé</span>}
                    </div>
                    <ProgressBar percent={Math.min(100, consumption)} />
                  </div>
                )
              })()}

              {/* Tasks List */}
              {project.tasks && project.tasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                    Tâches
                  </p>
                  <div className="space-y-2">
                    {project.tasks.map((task, idx) => {
                      const consumption =
                        task.planned_workload > 0
                          ? (task.duration_effective / task.planned_workload) *
                            100
                          : 0;
                      const isOverConsumed =
                        task.duration_effective > task.planned_workload;

                      return (
                        <div
                          key={idx}
                          className="bg-slate-700/20 border border-slate-700/50 rounded p-2"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <a
                              href={`https://gaaspard.catie.fr/projet/tasks/task.php?id=${task.id}&withproject=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 hover:opacity-80 transition-opacity"
                            >
                              <div>
                                <h4 className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                  {task.ref}
                                  <ExternalLink size={12} />
                                </h4>
                                <p className="text-xs text-slate-400">
                                  {task.label}
                                </p>
                              </div>
                            </a>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {task.duration_effective.toFixed(1)} /{" "}
                              {task.planned_workload.toFixed(1)} j
                            </span>
                          </div>
                          <ProgressBar percent={Math.min(100, consumption)} heightClass="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timespent by User */}
              {project.timespent_by_user &&
                project.timespent_by_user.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                      Temps par personne
                    </p>
                    <div className="space-y-2">
                      {project.timespent_by_user
                        .sort((a, b) => b.total_duration - a.total_duration)
                        .map((user, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-700/20 border border-slate-700/50 rounded p-2"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-300">
                                {user.user_name}
                              </span>
                              <span className="text-xs text-slate-400 flex-shrink-0">
                                {user.total_duration.toFixed(1)} j
                              </span>
                            </div>
                            <ProgressBar
                              percent={Math.min(100, (user.total_duration / project.time_spent_total) * 100)}
                              heightClass="h-1.5"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Description */}
            {project.description && (
              <div className="border-t border-slate-700/50 pt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                  Description
                </p>
                <div
                  className="text-slate-300 text-sm prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: project.description }}
                />
              </div>
            )}

            {/* Link to Dolibarr */}
            <div className="border-t border-slate-700/50 pt-6">
              <a
                href={dolibarrLinks.project(project.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Voir dans Dolibarr
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
