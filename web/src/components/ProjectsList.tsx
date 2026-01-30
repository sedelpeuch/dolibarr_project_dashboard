import React from "react";
import type { Project } from "../types";
import { ProjectCard } from "./ProjectCard";

interface ProjectsListProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  onProjectClick,
}) => {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Aucun projet trouvé</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDetailClick={onProjectClick}
        />
      ))}
    </div>
  );
};
