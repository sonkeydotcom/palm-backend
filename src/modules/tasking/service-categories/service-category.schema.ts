import {
  InferInsertModel,
  InferSelectModel,
  relations,
  sql,
} from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { services } from "../services/service.schema";

export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: serial("parent_id"),
  displayOrder: serial("display_order"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const serviceCategoryRelations = relations(
  serviceCategories,
  ({ many }) => ({
    services: many(services),
  })
);

export type ServiceCategory = InferSelectModel<typeof serviceCategories>;
export type NewServiceCategory = InferInsertModel<typeof serviceCategories>;
