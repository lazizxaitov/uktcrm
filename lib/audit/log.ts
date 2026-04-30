import { db } from "@/lib/db/db";
import { nanoid } from "nanoid";

export function logAudit(input: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: unknown;
}) {
  const database = db();
  database
    .prepare("INSERT INTO audit (id, user_id, action, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?, ?)")
    .run(nanoid(), input.userId, input.action, input.entity, input.entityId ?? null, input.payload ? JSON.stringify(input.payload) : null);
}

