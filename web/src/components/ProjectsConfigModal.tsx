import React, { useState, useEffect } from "react";
import { X, Trash2, Plus, Loader } from "lucide-react";
import api from "../api";

interface ProjectListItem {
  id: number;
  title: string;
  ref: string;
  status?: string;
}

interface ProjectsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectsConfigModal: React.FC<ProjectsConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [searchedProject, setSearchedProject] =
    useState<ProjectListItem | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  // Load projects on open
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      console.log("Fetching projects config...");
      const response = await api.get("/projects-config");
      console.log("Response:", response.data);
      const projectsData = response.data?.projects || [];

      // Trier: ouverts en premier, fermés en dernier
      projectsData.sort((a: any, b: any) => {
        const aIsClosed = a.status === 2 || a.status === "2";
        const bIsClosed = b.status === 2 || b.status === "2";

        if (aIsClosed === bIsClosed) {
          return (a.id as number) - (b.id as number); // Garder l'ordre par ID si même statut
        }
        return aIsClosed ? 1 : -1; // Les fermés à la fin
      });

      setProjects(projectsData);
      setError("");
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Erreur lors du chargement des projets");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchProject = async () => {
    setSearchedProject(null);
    setError("");

    if (!newProjectId || newProjectId.trim() === "") {
      setError("Veuillez entrer un ID de projet");
      return;
    }

    try {
      setSearching(true);
      const response = await api.get(`/search-project/${newProjectId}`);

      if (response.data) {
        setSearchedProject({
          id: response.data.id,
          title: response.data.title,
          ref: response.data.ref,
          status: response.data.status,
        });
      } else {
        setError(`Projet ${newProjectId} introuvable`);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(`Projet ${newProjectId} introuvable dans Dolibarr`);
      } else {
        setError("Erreur lors de la recherche du projet");
      }
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddProject = async () => {
    if (!searchedProject) return;

    // Vérifier si le projet n'est pas déjà dans la liste
    if (projects.some((p) => p.id === searchedProject.id)) {
      setError("Ce projet est déjà dans la liste");
      return;
    }

    try {
      setConfirming(true);
      const updatedProjects = [...projects, searchedProject].sort(
        (a, b) => a.id - b.id,
      );
      const projectIds = updatedProjects.map((p) => p.id);

      await api.post("/projects-config", { projects: projectIds });

      setProjects(updatedProjects);
      setNewProjectId("");
      setSearchedProject(null);
      setError("");
    } catch (err) {
      setError("Erreur lors de l'ajout du projet");
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const handleRemoveProject = async (projectId: number) => {
    try {
      const updatedProjects = projects.filter((p) => p.id !== projectId);
      const projectIds = updatedProjects.map((p) => p.id);

      await api.post("/projects-config", { projects: projectIds });

      setProjects(updatedProjects);
      setError("");
    } catch (err) {
      setError("Erreur lors de la suppression du projet");
      console.error(err);
    }
  };

  if (!isOpen) return null;

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
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-100">
              Gestion des projets
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Current projects list */}
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Projets actuels ({projects.length})
              </h3>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader size={16} className="animate-spin" />
                  Chargement...
                </div>
              ) : projects.length === 0 ? (
                <p className="text-slate-400">Aucun projet configuré</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded p-3 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-slate-100">
                          {proj.ref}
                        </p>
                        <p className="text-sm text-slate-400">
                          ID: {proj.id} • {proj.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {proj.status && (
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                              String(proj.status) === "2"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {String(proj.status) === "2" ? "Cloturé" : "Ouvert"}
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveProject(proj.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
                          title="Supprimer ce projet"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new project */}
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Ajouter un projet
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ID du projet
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newProjectId}
                      onChange={(e) => setNewProjectId(e.target.value)}
                      placeholder="Entrez l'ID du projet..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      onClick={handleSearchProject}
                      disabled={searching}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-medium rounded transition-colors flex items-center justify-center gap-2 flex-shrink-0"
                    >
                      {searching ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                        </>
                      ) : (
                        "Chercher"
                      )}
                    </button>
                  </div>
                </div>

                {/* Search results */}
                {searchedProject && !searching && (
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded p-4 space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Projet trouvé:</p>
                      <p className="font-semibold text-slate-100">
                        {searchedProject.title}
                      </p>
                      <p className="text-sm text-slate-400">
                        Ref: {searchedProject.ref}
                      </p>
                    </div>
                    <button
                      onClick={handleAddProject}
                      disabled={confirming}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      {confirming ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Ajout en cours...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Confirmer l'ajout
                        </>
                      )}
                    </button>
                  </div>
                )}

                {!searchedProject && newProjectId && !searching && (
                  <p className="text-sm text-red-400">Projet non trouvé</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
