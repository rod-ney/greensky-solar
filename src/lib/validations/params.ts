import { z } from "zod";
import { idSchema } from "./common";

export const idParamSchema = z.object({ id: idSchema });

export const projectTaskParamsSchema = z.object({
  id: idSchema,
  taskId: idSchema,
});

export const projectInventoryParamsSchema = z.object({
  id: idSchema,
  itemId: idSchema,
});
