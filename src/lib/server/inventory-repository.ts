import { dbQuery, withTransaction } from "@/lib/server/db";
import type { PoolClient } from "pg";
import type {
  ProjectInventoryItem,
  InventoryMovement,
  InventoryMovementType,
  InventoryCategory,
} from "@/types";

type ProjectInventoryRow = {
  id: string;
  project_id: string;
  inventory_item_id: string;
  item_name: string;
  item_sku: string;
  item_category: InventoryCategory;
  quantity: number;
  unit_price: string | number;
  unit: string;
  notes: string;
  allocated_by: string | null;
  allocated_by_name: string | null;
  created_at: string | Date;
};

type InventoryMovementRow = {
  id: string;
  inventory_item_id: string;
  item_name: string;
  item_sku: string;
  project_id: string | null;
  project_name: string | null;
  movement_type: InventoryMovementType;
  quantity: number;
  reason: string;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string | Date;
};

function computeInventoryStatus(
  quantity: number,
  minStock: number
): "in_stock" | "low_stock" | "out_of_stock" {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= minStock) return "low_stock";
  return "in_stock";
}

function mapProjectInventoryRow(row: ProjectInventoryRow): ProjectInventoryItem {
  return {
    id: row.id,
    projectId: row.project_id,
    inventoryItemId: row.inventory_item_id,
    itemName: row.item_name,
    itemSku: row.item_sku,
    itemCategory: row.item_category,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    unit: row.unit,
    notes: row.notes,
    allocatedBy: row.allocated_by ?? "",
    allocatedByName: row.allocated_by_name ?? "",
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
  };
}

function mapMovementRow(row: InventoryMovementRow): InventoryMovement {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    itemName: row.item_name,
    itemSku: row.item_sku,
    projectId: row.project_id,
    projectName: row.project_name,
    movementType: row.movement_type,
    quantity: row.quantity,
    reason: row.reason,
    performedBy: row.performed_by,
    performedByName: row.performed_by_name,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
  };
}

export type AllocationItem = {
  inventoryItemId: string;
  quantity: number;
  notes?: string;
};

/**
 * Allocate inventory items to a project. Uses a transaction with row-level
 * locking to guarantee stock consistency. Validates ALL items have sufficient
 * stock before performing any mutations.
 */
export async function allocateInventoryToProject(
  projectId: string,
  items: AllocationItem[],
  userId: string
): Promise<ProjectInventoryItem[]> {
  if (items.length === 0) throw new Error("No items to allocate.");

  return withTransaction(async (client: PoolClient) => {
    const projectCheck = await client.query<{ name: string }>(
      "SELECT name FROM projects WHERE id = $1",
      [projectId]
    );
    if (projectCheck.rows.length === 0) throw new Error("Project not found.");
    const projectName = projectCheck.rows[0].name;

    const itemIds = items.map((i) => i.inventoryItemId);
    const locked = await client.query<{
      id: string;
      name: string;
      quantity: number;
      min_stock: number;
      unit_price: string;
    }>(
      `SELECT id, name, quantity, min_stock, unit_price
       FROM inventory_items
       WHERE id = ANY($1)
       FOR UPDATE`,
      [itemIds]
    );

    const stockMap = new Map(locked.rows.map((r) => [r.id, r]));

    const existingAllocs = await client.query<{
      inventory_item_id: string;
      quantity: number;
    }>(
      `SELECT inventory_item_id, quantity FROM project_inventory
       WHERE project_id = $1 AND inventory_item_id = ANY($2)`,
      [projectId, itemIds]
    );
    const existingMap = new Map(
      existingAllocs.rows.map((r) => [r.inventory_item_id, r.quantity])
    );

    const insufficient: string[] = [];
    for (const item of items) {
      const stock = stockMap.get(item.inventoryItemId);
      if (!stock) {
        insufficient.push(`Item ${item.inventoryItemId} not found`);
        continue;
      }
      const additionalNeeded = existingMap.has(item.inventoryItemId)
        ? item.quantity - existingMap.get(item.inventoryItemId)!
        : item.quantity;
      if (additionalNeeded > 0 && stock.quantity < additionalNeeded) {
        insufficient.push(
          `${stock.name}: need ${additionalNeeded} more but only ${stock.quantity} available`
        );
      }
    }
    if (insufficient.length > 0) {
      throw new Error(`Insufficient stock: ${insufficient.join("; ")}`);
    }

    const nextIdResult = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM project_inventory"
    );
    let nextSeq = Number(nextIdResult.rows[0]?.count ?? "0");

    const allocatedIds: string[] = [];

    for (const item of items) {
      const stock = stockMap.get(item.inventoryItemId)!;
      const existingQty = existingMap.get(item.inventoryItemId);
      const notes = item.notes ?? "";

      if (existingQty !== undefined) {
        const delta = item.quantity - existingQty;
        await client.query(
          `UPDATE project_inventory
           SET quantity = $3, notes = $4
           WHERE project_id = $1 AND inventory_item_id = $2
           RETURNING id`,
          [projectId, item.inventoryItemId, item.quantity, notes]
        );
        if (delta !== 0) {
          const newQty = stock.quantity - delta;
          const newStatus = computeInventoryStatus(
            newQty,
            stock.min_stock
          );
          await client.query(
            `UPDATE inventory_items SET quantity = $2, status = $3 WHERE id = $1`,
            [item.inventoryItemId, newQty, newStatus]
          );
          const moveId = `imov-${String(Date.now())}-${item.inventoryItemId}`;
          await client.query(
            `INSERT INTO inventory_movements
             (id, inventory_item_id, project_id, movement_type, quantity, reason, performed_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              moveId,
              item.inventoryItemId,
              projectId,
              delta > 0 ? "deduction" : "return",
              -delta,
              delta > 0
                ? `Allocated ${delta} more for project "${projectName}"`
                : `Returned ${-delta} from project "${projectName}" (quantity adjustment)`,
              userId,
            ]
          );
        }
      } else {
        nextSeq++;
        const allocId = `pi-${String(nextSeq).padStart(4, "0")}`;
        allocatedIds.push(allocId);
        await client.query(
          `INSERT INTO project_inventory
           (id, project_id, inventory_item_id, quantity, unit_price, allocated_by, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            allocId,
            projectId,
            item.inventoryItemId,
            item.quantity,
            stock.unit_price,
            userId,
            notes,
          ]
        );
        const newQty = stock.quantity - item.quantity;
        const newStatus = computeInventoryStatus(newQty, stock.min_stock);
        await client.query(
          `UPDATE inventory_items SET quantity = $2, status = $3 WHERE id = $1`,
          [item.inventoryItemId, newQty, newStatus]
        );
        const moveId = `imov-${String(Date.now())}-${item.inventoryItemId}`;
        await client.query(
          `INSERT INTO inventory_movements
           (id, inventory_item_id, project_id, movement_type, quantity, reason, performed_by)
           VALUES ($1, $2, $3, 'deduction', $4, $5, $6)`,
          [
            moveId,
            item.inventoryItemId,
            projectId,
            -item.quantity,
            `Allocated for project "${projectName}"`,
            userId,
          ]
        );
      }
    }

    const result = await client.query<ProjectInventoryRow>(
      `SELECT pi.id, pi.project_id, pi.inventory_item_id,
              i.name AS item_name, i.sku AS item_sku, i.category AS item_category,
              pi.quantity, pi.unit_price, i.unit, pi.notes,
              pi.allocated_by, u.name AS allocated_by_name, pi.created_at
       FROM project_inventory pi
       JOIN inventory_items i ON i.id = pi.inventory_item_id
       LEFT JOIN users u ON u.id = pi.allocated_by
       WHERE pi.project_id = $1
       ORDER BY pi.created_at DESC`,
      [projectId]
    );

    return result.rows.map(mapProjectInventoryRow);
  });
}

/**
 * Return ALL allocated inventory for a project back to stock.
 * Used when a project is cancelled.
 */
export async function returnProjectInventory(
  projectId: string,
  userId: string
): Promise<void> {
  return withTransaction(async (client: PoolClient) => {
    const projectCheck = await client.query<{ name: string }>(
      "SELECT name FROM projects WHERE id = $1",
      [projectId]
    );
    const projectName = projectCheck.rows[0]?.name ?? projectId;

    const allocs = await client.query<{
      inventory_item_id: string;
      quantity: number;
    }>(
      `SELECT inventory_item_id, quantity FROM project_inventory WHERE project_id = $1`,
      [projectId]
    );

    if (allocs.rows.length === 0) return;

    const itemIds = allocs.rows.map((r) => r.inventory_item_id);
    const locked = await client.query<{
      id: string;
      quantity: number;
      min_stock: number;
    }>(
      `SELECT id, quantity, min_stock FROM inventory_items WHERE id = ANY($1) FOR UPDATE`,
      [itemIds]
    );
    const stockMap = new Map(locked.rows.map((r) => [r.id, r]));

    for (const alloc of allocs.rows) {
      const stock = stockMap.get(alloc.inventory_item_id);
      if (!stock) continue;

      const newQty = stock.quantity + alloc.quantity;
      const newStatus = computeInventoryStatus(newQty, stock.min_stock);
      await client.query(
        `UPDATE inventory_items SET quantity = $2, status = $3 WHERE id = $1`,
        [alloc.inventory_item_id, newQty, newStatus]
      );

      const moveId = `imov-${String(Date.now())}-${alloc.inventory_item_id}-ret`;
      await client.query(
        `INSERT INTO inventory_movements
         (id, inventory_item_id, project_id, movement_type, quantity, reason, performed_by)
         VALUES ($1, $2, $3, 'return', $4, $5, $6)`,
        [
          moveId,
          alloc.inventory_item_id,
          projectId,
          alloc.quantity,
          `Returned from cancelled project "${projectName}"`,
          userId,
        ]
      );
    }

    await client.query(
      `DELETE FROM project_inventory WHERE project_id = $1`,
      [projectId]
    );
  });
}

/**
 * Remove a single inventory item allocation from a project and return stock.
 */
export async function removeProjectInventoryItem(
  projectId: string,
  inventoryItemId: string,
  userId: string
): Promise<boolean> {
  return withTransaction(async (client: PoolClient) => {
    const projectCheck = await client.query<{ name: string }>(
      "SELECT name FROM projects WHERE id = $1",
      [projectId]
    );
    const projectName = projectCheck.rows[0]?.name ?? projectId;

    const alloc = await client.query<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM project_inventory
       WHERE project_id = $1 AND inventory_item_id = $2`,
      [projectId, inventoryItemId]
    );
    if (alloc.rows.length === 0) return false;

    const qty = alloc.rows[0].quantity;

    const stock = await client.query<{
      quantity: number;
      min_stock: number;
    }>(
      `SELECT quantity, min_stock FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [inventoryItemId]
    );
    if (stock.rows.length === 0) return false;

    const newQty = stock.rows[0].quantity + qty;
    const newStatus = computeInventoryStatus(newQty, stock.rows[0].min_stock);
    await client.query(
      `UPDATE inventory_items SET quantity = $2, status = $3 WHERE id = $1`,
      [inventoryItemId, newQty, newStatus]
    );

    const moveId = `imov-${String(Date.now())}-${inventoryItemId}-rm`;
    await client.query(
      `INSERT INTO inventory_movements
       (id, inventory_item_id, project_id, movement_type, quantity, reason, performed_by)
       VALUES ($1, $2, $3, 'return', $4, $5, $6)`,
      [
        moveId,
        inventoryItemId,
        projectId,
        qty,
        `Returned from project "${projectName}"`,
        userId,
      ]
    );

    await client.query(
      `DELETE FROM project_inventory WHERE project_id = $1 AND inventory_item_id = $2`,
      [projectId, inventoryItemId]
    );

    return true;
  });
}

/**
 * Get all inventory items allocated to a project with item details.
 */
export async function getProjectInventory(
  projectId: string
): Promise<ProjectInventoryItem[]> {
  const result = await dbQuery<ProjectInventoryRow>(
    `SELECT pi.id, pi.project_id, pi.inventory_item_id,
            i.name AS item_name, i.sku AS item_sku, i.category AS item_category,
            pi.quantity, pi.unit_price, i.unit, pi.notes,
            pi.allocated_by, u.name AS allocated_by_name, pi.created_at
     FROM project_inventory pi
     JOIN inventory_items i ON i.id = pi.inventory_item_id
     LEFT JOIN users u ON u.id = pi.allocated_by
     WHERE pi.project_id = $1
     ORDER BY pi.created_at DESC`,
    [projectId]
  );
  return result.rows.map(mapProjectInventoryRow);
}

/**
 * List inventory movements with optional filters.
 */
export async function listInventoryMovements(filters?: {
  inventoryItemId?: string;
  projectId?: string;
  movementType?: InventoryMovementType;
  limit?: number;
  offset?: number;
}): Promise<{ items: InventoryMovement[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 0;

  if (filters?.inventoryItemId) {
    paramIdx++;
    conditions.push(`m.inventory_item_id = $${paramIdx}`);
    params.push(filters.inventoryItemId);
  }
  if (filters?.projectId) {
    paramIdx++;
    conditions.push(`m.project_id = $${paramIdx}`);
    params.push(filters.projectId);
  }
  if (filters?.movementType) {
    paramIdx++;
    conditions.push(`m.movement_type = $${paramIdx}`);
    params.push(filters.movementType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = Math.min(200, Math.max(1, filters?.limit ?? 50));
  const offset = Math.max(0, filters?.offset ?? 0);

  const [countResult, dataResult] = await Promise.all([
    dbQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inventory_movements m ${where}`,
      params
    ),
    dbQuery<InventoryMovementRow>(
      `SELECT m.id, m.inventory_item_id, i.name AS item_name, i.sku AS item_sku,
              m.project_id, p.name AS project_name,
              m.movement_type, m.quantity, m.reason,
              m.performed_by, u.name AS performed_by_name,
              m.created_at
       FROM inventory_movements m
       JOIN inventory_items i ON i.id = m.inventory_item_id
       LEFT JOIN projects p ON p.id = m.project_id
       LEFT JOIN users u ON u.id = m.performed_by
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
      [...params, limit, offset]
    ),
  ]);

  return {
    items: dataResult.rows.map(mapMovementRow),
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}
