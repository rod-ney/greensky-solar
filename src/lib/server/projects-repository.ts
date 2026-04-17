import { dbQuery } from "@/lib/server/db";
import { toIsoDateManila, getTodayInManila } from "@/lib/date-utils";
import { createSolarInstallationBookingInDb } from "@/lib/server/client-bookings-repository";
import type { Project, Task } from "@/types";

type ProjectRow = {
  id: string;
  name: string;
  client: string;
  location: string;
  status: Project["status"];
  priority: Project["priority"];
  start_date: string | Date;
  end_date: string | Date;
  budget: string | number;
  progress: number;
  description: string;
  project_lead: string | null;
  user_id: string | null;
  warranty_start_date: string | Date | null;
  warranty_end_date: string | Date | null;
};

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  assigned_to: string | null;
  due_date: string | Date;
  created_at: string | Date;
};

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to ?? "",
    dueDate: toIsoDateManila(row.due_date),
    createdAt: toIsoDateManila(row.created_at),
  };
}

async function getTasksByProjectIds(projectIds: string[]): Promise<Record<string, Task[]>> {
  if (projectIds.length === 0) return {};

  const tasksResult = await dbQuery<TaskRow>(
    `
      SELECT id, project_id, title, description, status, priority, assigned_to, due_date, created_at
      FROM tasks
      WHERE project_id = ANY($1)
      ORDER BY due_date ASC
    `,
    [projectIds]
  );

  const taskMap: Record<string, Task[]> = {};
  for (const row of tasksResult.rows) {
    const mapped = mapTask(row);
    taskMap[mapped.projectId] = taskMap[mapped.projectId] ?? [];
    taskMap[mapped.projectId].push(mapped);
  }
  return taskMap;
}

async function getAssignedTechnicians(projectIds: string[]): Promise<Record<string, string[]>> {
  if (projectIds.length === 0) return {};

  const assignmentResult = await dbQuery<{ project_id: string; technician_id: string }>(
    `
      SELECT project_id, technician_id
      FROM project_technicians
      WHERE project_id = ANY($1)
      ORDER BY technician_id ASC
    `,
    [projectIds]
  );

  const assignmentMap: Record<string, string[]> = {};
  for (const row of assignmentResult.rows) {
    assignmentMap[row.project_id] = assignmentMap[row.project_id] ?? [];
    assignmentMap[row.project_id].push(row.technician_id);
  }
  return assignmentMap;
}

function mapProject(
  row: ProjectRow,
  taskMap: Record<string, Task[]>,
  assignmentMap: Record<string, string[]>
): Project {
  const assignedTechnicians = assignmentMap[row.id] ?? [];
  const projectLead = row.project_lead ?? undefined;

  return {
    id: row.id,
    name: row.name,
    client: row.client,
    location: row.location,
    status: row.status,
    priority: row.priority,
    startDate: toIsoDateManila(row.start_date),
    endDate: toIsoDateManila(row.end_date),
    budget: Number(row.budget),
    progress: row.progress,
    description: row.description,
    assignedTechnicians,
    projectLead,
    userId: row.user_id ?? undefined,
    warrantyStartDate: row.warranty_start_date ? toIsoDateManila(row.warranty_start_date) : undefined,
    warrantyEndDate: row.warranty_end_date ? toIsoDateManila(row.warranty_end_date) : undefined,
    tasks: taskMap[row.id] ?? [],
  };
}

const DEFAULT_PAGE_SIZE = 50;

export async function listProjectsFromDb(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ items: Project[]; total: number; hasMore: boolean }> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? DEFAULT_PAGE_SIZE));
  const offset = Math.max(0, opts?.offset ?? 0);

  const [countResult, projectResult] = await Promise.all([
    dbQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM projects"),
    dbQuery<ProjectRow>(
      `
      SELECT id, name, client, location, status, priority, start_date, end_date, budget, progress, description, project_lead, user_id, warranty_start_date, warranty_end_date
      FROM projects
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit + 1, offset]
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  const rows = projectResult.rows.slice(0, limit);
  const hasMore = projectResult.rows.length > limit;

  const ids = rows.map((row) => row.id);
  const [taskMap, assignmentMap] = await Promise.all([
    getTasksByProjectIds(ids),
    getAssignedTechnicians(ids),
  ]);
  const items = rows.map((row) => mapProject(row, taskMap, assignmentMap));

  return { items, total, hasMore };
}

export async function listProjectsForTechnicianFromDb(
  technicianId: string
): Promise<{ items: Project[]; total: number; hasMore: boolean }> {
  const projectResult = await dbQuery<ProjectRow>(
    `
      SELECT p.id, p.name, p.client, p.location, p.status, p.priority, p.start_date, p.end_date, p.budget, p.progress, p.description, p.project_lead, p.user_id, p.warranty_start_date, p.warranty_end_date
      FROM projects p
      WHERE EXISTS (SELECT 1 FROM project_technicians pt WHERE pt.project_id = p.id AND pt.technician_id = $1)
         OR p.project_lead = $1
      ORDER BY p.start_date DESC
    `,
    [technicianId]
  );

  const rows = projectResult.rows;
  const ids = rows.map((row) => row.id);
  const [taskMap, assignmentMap] = await Promise.all([
    getTasksByProjectIds(ids),
    getAssignedTechnicians(ids),
  ]);
  const items = rows.map((row) => mapProject(row, taskMap, assignmentMap));

  return { items, total: items.length, hasMore: false };
}

export type ClientProjectSummary = {
  id: string;
  name: string;
  location: string;
  status: Project["status"];
  priority: Project["priority"];
  startDate: string;
  endDate: string;
  progress: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
};

export async function listClientProjectsFromDb(userId: string): Promise<ClientProjectSummary[]> {
  const projectResult = await dbQuery<ProjectRow>(
    `
      SELECT id, name, location, status, priority, start_date, end_date, progress, warranty_start_date, warranty_end_date
      FROM projects
      WHERE user_id = $1
      ORDER BY end_date DESC
    `,
    [userId]
  );
  return projectResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    priority: row.priority,
    startDate: toIsoDateManila(row.start_date),
    endDate: toIsoDateManila(row.end_date),
    progress: row.progress,
    warrantyStartDate: row.warranty_start_date ? toIsoDateManila(row.warranty_start_date) : undefined,
    warrantyEndDate: row.warranty_end_date ? toIsoDateManila(row.warranty_end_date) : undefined,
  }));
}

export async function getProjectByIdFromDb(id: string): Promise<Project | null> {
  const projectResult = await dbQuery<ProjectRow>(
    `
      SELECT id, name, client, location, status, priority, start_date, end_date, budget, progress, description, project_lead, user_id, warranty_start_date, warranty_end_date
      FROM projects
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  const row = projectResult.rows[0];
  if (!row) return null;

  const [taskMap, assignmentMap] = await Promise.all([
    getTasksByProjectIds([id]),
    getAssignedTechnicians([id]),
  ]);
  return mapProject(row, taskMap, assignmentMap);
}

export async function createProjectInDb(data: {
  name: string;
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: Project["priority"];
  description: string;
  projectLead?: string;
  assignedTechnicians?: string[];
  bookingId?: string;
  userId?: string;
}): Promise<Project> {
  const countResult = await dbQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM projects");
  const nextId = `proj-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;

  let bookingId = data.bookingId;
  if (!bookingId && data.userId) {
    const solarBooking = await createSolarInstallationBookingInDb({
      date: data.startDate,
      endDate: data.endDate,
      time: "09:00",
      address: data.location,
      notes: data.description || `Solar installation - ${data.name}`,
      technician: "Unassigned",
      amount: data.budget,
      userId: data.userId,
    });
    bookingId = solarBooking.id;
  }

  await dbQuery(
    `
      INSERT INTO projects (id, name, client, location, status, priority, start_date, end_date, budget, progress, description, project_lead, booking_id, user_id)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, 0, $9, $10, $11, $12)
    `,
    [
      nextId,
      data.name,
      data.client,
      data.location,
      data.priority,
      data.startDate,
      data.endDate,
      data.budget,
      data.description,
      data.projectLead ?? null,
      bookingId ?? null,
      data.userId ?? null,
    ]
  );

  const technicianIds = Array.from(
    new Set([...(data.assignedTechnicians ?? []), ...(data.projectLead ? [data.projectLead] : [])])
  ).filter(Boolean);
  for (const technicianId of technicianIds) {
    await dbQuery(
      `
        INSERT INTO project_technicians (project_id, technician_id)
        VALUES ($1, $2)
        ON CONFLICT (project_id, technician_id) DO NOTHING
      `,
      [nextId, technicianId]
    );
  }

  if (bookingId && data.projectLead) {
    const techResult = await dbQuery<{ name: string }>(
      `SELECT name FROM technicians WHERE id = $1`,
      [data.projectLead]
    );
    const techName = techResult.rows[0]?.name;
    if (techName) {
      await dbQuery(
        `UPDATE bookings SET technician = $1 WHERE id = $2`,
        [techName, bookingId]
      );
    }
  }

  const created = await getProjectByIdFromDb(nextId);
  if (!created) {
    throw new Error("Project was created but could not be read back.");
  }
  return created;
}

export async function createTaskInDb(data: {
  projectId: string;
  title: string;
  description: string;
  priority: Task["priority"];
  assignedTo?: string;
  dueDate: string;
}): Promise<Task> {
  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM tasks"
  );
  const nextId = `task-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;
  const createdAt = getTodayInManila();

  const result = await dbQuery<TaskRow>(
    `INSERT INTO tasks
      (id, project_id, title, description, status, priority, assigned_to, due_date, created_at)
     VALUES
      ($1, $2, $3, $4, 'todo', $5, $6, $7, $8)
     RETURNING id, project_id, title, description, status, priority, assigned_to, due_date, created_at`,
    [
      nextId,
      data.projectId,
      data.title,
      data.description,
      data.priority,
      data.assignedTo || null,
      data.dueDate,
      createdAt,
    ]
  );

  if (data.assignedTo) {
    await dbQuery(
      `INSERT INTO project_technicians (project_id, technician_id)
       VALUES ($1, $2)
       ON CONFLICT (project_id, technician_id) DO NOTHING`,
      [data.projectId, data.assignedTo]
    );
  }

  const task = mapTask(result.rows[0]);
  await recalculateAndUpdateProjectProgress(data.projectId);
  return task;
}

async function recalculateAndUpdateProjectProgress(projectId: string): Promise<void> {
  const taskMap = await getTasksByProjectIds([projectId]);
  const tasks = taskMap[projectId] ?? [];
  const completed = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  await dbQuery(
    `UPDATE projects SET progress = $2 WHERE id = $1`,
    [projectId, progress]
  );
}

export async function updateTaskInDb(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: Task["status"];
    priority?: Task["priority"];
    assignedTo?: string;
    dueDate?: string;
  }
): Promise<Task | null> {
  const result = await dbQuery<TaskRow>(
    `UPDATE tasks
     SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       status = COALESCE($4, status),
       priority = COALESCE($5, priority),
       assigned_to = COALESCE($6, assigned_to),
       due_date = COALESCE($7::date, due_date)
     WHERE id = $1
     RETURNING id, project_id, title, description, status, priority, assigned_to, due_date, created_at`,
    [
      taskId,
      data.title ?? null,
      data.description ?? null,
      data.status ?? null,
      data.priority ?? null,
      data.assignedTo ?? null,
      data.dueDate ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) return null;

  const assignedTo = data.assignedTo ?? row.assigned_to;
  if (assignedTo) {
    await dbQuery(
      `INSERT INTO project_technicians (project_id, technician_id)
       VALUES ($1, $2)
       ON CONFLICT (project_id, technician_id) DO NOTHING`,
      [row.project_id, assignedTo]
    );
  }

  await recalculateAndUpdateProjectProgress(row.project_id);
  return mapTask(row);
}

export async function updateProjectInDb(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    status?: Project["status"];
    priority?: Project["priority"];
    location?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    progress?: number;
    projectLead?: string | null;
    assignedTechnicians?: string[];
    userId?: string | null;
    warrantyStartDate?: string | null;
    warrantyEndDate?: string | null;
  }
): Promise<Project | null> {
  const existing = await getProjectByIdFromDb(projectId);
  if (!existing) return null;

  const name = data.name ?? existing.name;
  const description = data.description ?? existing.description;
  const status = data.status ?? existing.status;
  const priority = data.priority ?? existing.priority;
  const location = data.location ?? existing.location;
  const startDate = data.startDate ?? existing.startDate;
  const endDate = data.endDate ?? existing.endDate;
  const budget = data.budget ?? existing.budget;
  const progress =
    data.progress !== undefined ? data.progress : existing.progress;
  const assignedTechnicians = data.assignedTechnicians ?? existing.assignedTechnicians;
  const projectLead =
    data.projectLead !== undefined
      ? data.projectLead
      : assignedTechnicians[0] ?? existing.projectLead ?? null;
  const userId = data.userId !== undefined ? data.userId : existing.userId ?? null;
  const warrantyStartDate = data.warrantyStartDate !== undefined ? data.warrantyStartDate : existing.warrantyStartDate ?? null;
  const warrantyEndDate = data.warrantyEndDate !== undefined ? data.warrantyEndDate : existing.warrantyEndDate ?? null;

  await dbQuery(
    `
      UPDATE projects
      SET name = $2, description = $3, status = $4, priority = $5, location = $6,
          start_date = $7, end_date = $8, budget = $9, progress = $10, project_lead = $11, user_id = $12,
          warranty_start_date = $13, warranty_end_date = $14
      WHERE id = $1
    `,
    [
      projectId,
      name,
      description,
      status,
      priority,
      location,
      startDate,
      endDate,
      budget,
      progress,
      projectLead,
      userId,
      warrantyStartDate,
      warrantyEndDate,
    ]
  );

  await dbQuery(
    `DELETE FROM project_technicians WHERE project_id = $1`,
    [projectId]
  );
  for (const techId of assignedTechnicians) {
    if (techId) {
      await dbQuery(
        `INSERT INTO project_technicians (project_id, technician_id)
         VALUES ($1, $2)
         ON CONFLICT (project_id, technician_id) DO NOTHING`,
        [projectId, techId]
      );
    }
  }

  return getProjectByIdFromDb(projectId);
}

export async function deleteTaskInDb(taskId: string): Promise<boolean> {
  const projectResult = await dbQuery<{ project_id: string }>(
    "SELECT project_id FROM tasks WHERE id = $1",
    [taskId]
  );
  const projectId = projectResult.rows[0]?.project_id;
  const result = await dbQuery<{ id: string }>(
    "DELETE FROM tasks WHERE id = $1 RETURNING id",
    [taskId]
  );
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted && projectId) {
    await recalculateAndUpdateProjectProgress(projectId);
  }
  return deleted;
}

export async function deleteProjectInDb(projectId: string): Promise<boolean> {
  const result = await dbQuery<{ id: string }>(
    "DELETE FROM projects WHERE id = $1 RETURNING id",
    [projectId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ===== Client-Facing Project Detail =====

import type { ClientProjectDetail, ClientTask } from "@/types/client";

type ClientTaskRow = {
  id: string;
  title: string;
  status: ClientTask["status"];
  priority: ClientTask["priority"];
  due_date: string | Date;
  created_at: string | Date;
  assigned_to_name: string | null;
};

/**
 * Fetch a single project for a client user with moderate detail:
 * project info, progress, schedule, description, technician names, and tasks.
 * Returns null if the project doesn't exist or doesn't belong to the given user.
 */
export async function getClientProjectDetailFromDb(
  projectId: string,
  userId: string
): Promise<ClientProjectDetail | null> {
  const projectResult = await dbQuery<
    ProjectRow & { project_lead_name: string | null }
  >(
    `
      SELECT p.id, p.name, p.client, p.location, p.status, p.priority,
             p.start_date, p.end_date, p.budget, p.progress, p.description,
             p.project_lead, p.user_id, p.warranty_start_date, p.warranty_end_date,
             t.name AS project_lead_name
      FROM projects p
      LEFT JOIN technicians t ON p.project_lead = t.id
      WHERE p.id = $1 AND p.user_id = $2
      LIMIT 1
    `,
    [projectId, userId]
  );
  const row = projectResult.rows[0];
  if (!row) return null;

  // Fetch tasks with assigned technician names resolved
  const taskResult = await dbQuery<ClientTaskRow>(
    `
      SELECT tk.id, tk.title, tk.status, tk.priority, tk.due_date, tk.created_at,
             tn.name AS assigned_to_name
      FROM tasks tk
      LEFT JOIN technicians tn ON tk.assigned_to = tn.id
      WHERE tk.project_id = $1
      ORDER BY tk.due_date ASC
    `,
    [projectId]
  );

  // Fetch assigned technician names
  const techResult = await dbQuery<{ name: string }>(
    `
      SELECT tn.name
      FROM project_technicians pt
      JOIN technicians tn ON pt.technician_id = tn.id
      WHERE pt.project_id = $1
      ORDER BY tn.name ASC
    `,
    [projectId]
  );

  const tasks: ClientTask[] = taskResult.rows.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: toIsoDateManila(t.due_date),
    createdAt: toIsoDateManila(t.created_at),
    assignedToName: t.assigned_to_name ?? "Unassigned",
  }));

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    priority: row.priority,
    startDate: toIsoDateManila(row.start_date),
    endDate: toIsoDateManila(row.end_date),
    progress: row.progress,
    description: row.description,
    projectLeadName: row.project_lead_name ?? "Unassigned",
    assignedTechnicianNames: techResult.rows.map((r) => r.name),
    tasks,
  };
}
