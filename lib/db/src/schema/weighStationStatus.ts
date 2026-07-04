import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weighStationStatusTable = pgTable("weigh_station_status", {
  osmId: text("osm_id").primaryKey(),
  status: text("status", { enum: ["open", "closed"] }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWeighStationStatusSchema = createInsertSchema(weighStationStatusTable).omit({
  updatedAt: true,
});
export type InsertWeighStationStatus = z.infer<typeof insertWeighStationStatusSchema>;
export type WeighStationStatus = typeof weighStationStatusTable.$inferSelect;
