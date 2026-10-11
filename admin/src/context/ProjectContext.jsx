import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as projectService from '../services/projectService';

export const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { projects } = useDb();

  const value = useMemo(
    () => ({
      projects,
      projectsById: Object.fromEntries(projects.map((p) => [p.id, p])),
      createProject: projectService.createProject,
      updateProject: projectService.updateProject,
      updateProjectAssignments: projectService.updateProjectAssignments,
      setProjectStatus: projectService.setProjectStatus,
      suggestProjectNumber: () => projectService.suggestProjectNumber(projects),
    }),
    [projects],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
