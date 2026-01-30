import React, { useState } from "react";
import { Plus, Trash2, Eye, Edit2 } from "lucide-react";
import { MetaProject, useMetaProjects } from "../hooks/useMetaProjects";
import { Project } from "../api";

interface MetaProjectsTabProps {
  allProjects: Project[];
  onViewMetaProject: (metaProject: MetaProject) => void;
}

export const MetaProjectsTab: React.FC<MetaProjectsTabProps> = ({
  allProjects,
  onViewMetaProject,
}) => {
  const {
    metaProjects,
    create,
    update,
    delete: deleteMetaProject,
    isLoaded,
    loading,
    error,
  } = useMetaProjects();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(
    new Set(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCreateClick = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormName("");
    setSelectedProjectIds(new Set());
  };

  const handleEditClick = (metaProject: MetaProject) => {
    setEditingId(metaProject.id);
    setIsCreating(false);
    setFormName(metaProject.name);
    setSelectedProjectIds(new Set(metaProject.projectIds));
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormName("");
    setSelectedProjectIds(new Set());
  };

  const handleToggleProject = (projectId: number) => {
    const newSet = new Set(selectedProjectIds);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjectIds(newSet);
  };

  const handleSave = async () => {
    if (!formName.trim() || selectedProjectIds.size === 0) {
      setSaveError("Veuillez donner un nom et sélectionner au moins un projet");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingId) {
        await update(editingId, formName, Array.from(selectedProjectIds));
      } else {
        await create(formName, Array.from(selectedProjectIds));
      }
      handleCancel();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return <div className="p-6 text-slate-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">Meta-Projects</h2>
          <p className="text-sm text-slate-400 mt-1">
            Combinez plusieurs projets pour une vue d'ensemble
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Créer
          </button>
        )}
      </div>

      {/* Creation/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">
            {editingId ? "Modifier" : "Créer une"} Meta-Project
          </h3>

          {/* Error Message */}
          {saveError && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded text-red-400 text-sm">
              {saveError}
            </div>
          )}

          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Conv CATIE 2024"
              disabled={isSaving}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-50 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Projects Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Projets ({selectedProjectIds.size} sélectionnés)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {allProjects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.has(project.id)}
                    onChange={() => handleToggleProject(project.id)}
                    disabled={isSaving}
                    className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 text-sm truncate">
                      {project.ref}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {project.title}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "En cours..." : editingId ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </div>
      )}

      {/* Meta-Projects List */}
      {metaProjects.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-slate-400">Aucune meta-project créée</p>
          {!isCreating && !editingId && (
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Créer la première
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {metaProjects.map((metaProject) => {
            const projectCount = metaProject.projectIds.length;
            const projectNames = metaProject.projectIds
              .map((id) => allProjects.find((p) => p.id === id)?.ref)
              .filter(Boolean)
              .join(", ");

            return (
              <div
                key={metaProject.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-50">
                      {metaProject.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 truncate">
                      {projectCount} projet{projectCount > 1 ? "s" : ""}:{" "}
                      {projectNames}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Créée le{" "}
                      {new Date(metaProject.createdAt).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewMetaProject(metaProject)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      title="Afficher"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleEditClick(metaProject)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer "${metaProject.name}" ?`)) {
                          deleteMetaProject(metaProject.id).catch((err) => {
                            alert(
                              `Erreur lors de la suppression: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
                            );
                          });
                        }
                      }}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
