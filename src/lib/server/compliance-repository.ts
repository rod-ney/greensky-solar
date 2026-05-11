import { dbQuery } from "@/lib/server/db";
import { addDaysToIso, toIsoDateManila } from "@/lib/date-utils";
import {
  COMPLIANCE_TEMPLATE,
  complianceRowApplies,
  type ComplianceTemplateDef,
} from "@/lib/compliance-template";
import type {
  ComplianceTimelineItem,
  UserCompliancePreferences,
  ComplianceItemStatus,
} from "@/types/client";

type PrefsRow = {
  user_id: string;
  in_subdivision: boolean;
  wants_net_metering: boolean;
};

type ComplianceRow = {
  id: string;
  user_id: string;
  project_id: string;
  requirement_key: string;
  title: string;
  description: string;
  due_date: string | Date;
  sort_order: number;
  supplied_by: "client" | "admin";
  is_optional: boolean;
  subdivision_only: boolean;
  net_metering_only: boolean;
  status: ComplianceItemStatus;
  document_id: string | null;
  project_name: string;
  file_url: string | null;
  doc_title: string | null;
};

export async function getCompliancePreferencesFromDb(
  userId: string
): Promise<UserCompliancePreferences> {
  const result = await dbQuery<PrefsRow>(
    `
      SELECT user_id, in_subdivision, wants_net_metering
      FROM user_compliance_preferences
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    return { inSubdivision: false, wantsNetMetering: false };
  }
  return {
    inSubdivision: row.in_subdivision,
    wantsNetMetering: row.wants_net_metering,
  };
}

export async function upsertCompliancePreferencesInDb(
  userId: string,
  prefs: UserCompliancePreferences
): Promise<UserCompliancePreferences> {
  await dbQuery(
    `
      INSERT INTO user_compliance_preferences (user_id, in_subdivision, wants_net_metering, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        in_subdivision = EXCLUDED.in_subdivision,
        wants_net_metering = EXCLUDED.wants_net_metering,
        updated_at = NOW()
    `,
    [userId, prefs.inSubdivision, prefs.wantsNetMetering]
  );
  return prefs;
}

function mapComplianceItem(row: ComplianceRow): ComplianceTimelineItem {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    requirementKey: row.requirement_key,
    title: row.title,
    description: row.description,
    dueDate: toIsoDateManila(row.due_date),
    sortOrder: row.sort_order,
    suppliedBy: row.supplied_by,
    isOptional: row.is_optional,
    subdivisionOnly: row.subdivision_only,
    netMeteringOnly: row.net_metering_only,
    status: row.status,
    documentId: row.document_id ?? undefined,
    fileUrl: row.file_url ?? undefined,
    documentTitle: row.doc_title ?? undefined,
  };
}

function templateVisibleForPrefs(
  def: ComplianceTemplateDef,
  prefs: UserCompliancePreferences
): boolean {
  return complianceRowApplies(def, prefs);
}

/** Insert missing timeline rows for all of the user's projects. */
export async function syncComplianceTimelineForUser(userId: string): Promise<void> {
  const prefs = await getCompliancePreferencesFromDb(userId);
  const projects = await dbQuery<{ id: string; start_date: string | Date; name: string }>(
    `SELECT id, start_date, name FROM projects WHERE user_id = $1`,
    [userId]
  );

  for (const project of projects.rows) {
    const start = toIsoDateManila(project.start_date);
    for (const def of COMPLIANCE_TEMPLATE) {
      if (!templateVisibleForPrefs(def, prefs)) continue;
      const dueDate = addDaysToIso(start, def.daysFromStart);
      const itemId = `comp-${crypto.randomUUID()}`;
      await dbQuery(
        `
          INSERT INTO compliance_timeline_items (
            id, user_id, project_id, requirement_key, title, description, due_date, sort_order,
            supplied_by, is_optional, subdivision_only, net_metering_only, status, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NOW())
          ON CONFLICT (user_id, project_id, requirement_key) DO UPDATE SET
            due_date = EXCLUDED.due_date,
            sort_order = EXCLUDED.sort_order,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            supplied_by = EXCLUDED.supplied_by,
            is_optional = EXCLUDED.is_optional,
            subdivision_only = EXCLUDED.subdivision_only,
            net_metering_only = EXCLUDED.net_metering_only,
            updated_at = NOW()
        `,
        [
          itemId,
          userId,
          project.id,
          def.key,
          def.title,
          def.description,
          dueDate,
          def.sortOrder,
          def.suppliedBy,
          def.isOptional,
          def.subdivisionOnly,
          def.netMeteringOnly,
        ]
      );
    }
  }
}

/** Remove timeline rows that no longer apply (optional / gated requirements). */
export async function pruneComplianceTimelineForUser(userId: string): Promise<void> {
  const prefs = await getCompliancePreferencesFromDb(userId);
  for (const def of COMPLIANCE_TEMPLATE) {
    if (templateVisibleForPrefs(def, prefs)) continue;
    await dbQuery(
      `
        DELETE FROM compliance_timeline_items
        WHERE user_id = $1 AND requirement_key = $2
          AND document_id IS NULL
          AND status IN ('pending', 'waived')
      `,
      [userId, def.key]
    );
  }
}

const templateByKey = Object.fromEntries(COMPLIANCE_TEMPLATE.map((d) => [d.key, d]));

export async function listComplianceTimelineForUser(
  userId: string,
  projectId: string | null
): Promise<ComplianceTimelineItem[]> {
  const prefs = await getCompliancePreferencesFromDb(userId);
  const result = await dbQuery<ComplianceRow>(
    `
      SELECT c.id, c.user_id, c.project_id, c.requirement_key, c.title, c.description,
             c.due_date, c.sort_order, c.supplied_by, c.is_optional, c.subdivision_only,
             c.net_metering_only, c.status, c.document_id, p.name AS project_name,
             d.file_url, d.title AS doc_title
      FROM compliance_timeline_items c
      INNER JOIN projects p ON p.id = c.project_id AND p.user_id = c.user_id
      LEFT JOIN documents d ON d.id = c.document_id
      WHERE c.user_id = $1
        AND ($2::text IS NULL OR c.project_id = $2)
      ORDER BY c.sort_order ASC, c.due_date ASC
    `,
    [userId, projectId]
  );
  return result.rows
    .map(mapComplianceItem)
    .filter((item) => {
      const def = templateByKey[item.requirementKey as keyof typeof templateByKey];
      if (!def) return true;
      return complianceRowApplies(def, prefs);
    });
}

export async function getComplianceItemForUser(
  itemId: string,
  userId: string
): Promise<ComplianceTimelineItem | null> {
  const result = await dbQuery<ComplianceRow>(
    `
      SELECT c.id, c.user_id, c.project_id, c.requirement_key, c.title, c.description,
             c.due_date, c.sort_order, c.supplied_by, c.is_optional, c.subdivision_only,
             c.net_metering_only, c.status, c.document_id, p.name AS project_name,
             d.file_url, d.title AS doc_title
      FROM compliance_timeline_items c
      INNER JOIN projects p ON p.id = c.project_id AND p.user_id = c.user_id
      LEFT JOIN documents d ON d.id = c.document_id
      WHERE c.id = $1 AND c.user_id = $2
      LIMIT 1
    `,
    [itemId, userId]
  );
  const row = result.rows[0];
  return row ? mapComplianceItem(row) : null;
}

export async function updateComplianceItemDocumentInDb(
  itemId: string,
  userId: string,
  documentId: string,
  status: ComplianceItemStatus
): Promise<boolean> {
  const result = await dbQuery(
    `
      UPDATE compliance_timeline_items
      SET document_id = $3, status = $4, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [itemId, userId, documentId, status]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateComplianceItemStatusInDb(
  itemId: string,
  userId: string,
  status: ComplianceItemStatus
): Promise<boolean> {
  const result = await dbQuery(
    `
      UPDATE compliance_timeline_items
      SET status = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [itemId, userId, status]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Clears linked document ref and resets requirement to pending when client removes an upload (not approved). */
export async function clearUploadedComplianceDocumentInDb(
  itemId: string,
  userId: string,
  documentId: string
): Promise<boolean> {
  const result = await dbQuery(
    `
      UPDATE compliance_timeline_items
      SET document_id = NULL, status = 'pending', updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND document_id = $3 AND status <> 'approved'
      RETURNING id
    `,
    [itemId, userId, documentId]
  );
  return (result.rowCount ?? 0) > 0;
}

