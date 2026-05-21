const { z } = require("zod");

const widgetPreferenceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().max(160),
  page: z.coerce.number().int().min(1).max(10).default(1),
  size: z.enum(["small", "medium", "full"]).default("medium"),
  visible: z.coerce.boolean().default(true),
  order: z.coerce.number().int().min(0).max(200).default(0)
});

const listTemplatesQuerySchema = z.object({
  scope: z.enum(["workspace", "private"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const saveTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional().default(""),
  themeVariant: z.enum(["enterprise", "minimal", "print"]).default("enterprise"),
  templatePreset: z.enum(["executive", "health", "delivery"]).default("executive"),
  widgetLayout: z.array(widgetPreferenceSchema).min(1).max(50),
  scope: z.enum(["workspace", "private"]).default("workspace")
});

module.exports = {
  listTemplatesQuerySchema,
  saveTemplateSchema
};
