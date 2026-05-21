const { z } = require("zod");

const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

const widgetPreferenceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().max(160),
  page: z.coerce.number().int().min(1).max(10).default(1),
  size: z.enum(["small", "medium", "full"]).default("medium"),
  visible: z.coerce.boolean().default(true),
  order: z.coerce.number().int().min(0).max(200).default(0)
});

const updateReportPreferencesSchema = z.object({
  title: z.string().trim().max(180).optional(),
  themeVariant: z.enum(["enterprise", "minimal", "print"]).default("enterprise"),
  templatePreset: z.enum(["executive", "health", "delivery"]).default("executive"),
  widgetLayout: z.array(widgetPreferenceSchema).min(1).max(50)
});

const updateReportSharingSchema = z
  .object({
    mode: z.enum(["private", "team", "public", "password"]),
    publicSlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      .optional()
      .default(""),
    password: z.string().trim().min(4).max(64).optional().default(""),
    allowComments: z.coerce.boolean().default(false),
    expiresAt: z.string().datetime().optional().or(z.literal("")).default("")
  })
  .superRefine((value, ctx) => {
    if ((value.mode === "public" || value.mode === "password") && !value.publicSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Public slug is required for shared reports",
        path: ["publicSlug"]
      });
    }

    if (value.mode === "password" && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required for password-protected sharing",
        path: ["password"]
      });
    }
  });

const publicReportAccessSchema = z.object({
  password: z.string().trim().max(64).optional().default("")
});

const publicReportCommentSchema = z.object({
  authorName: z.string().trim().min(2).max(80).optional().default("Anonymous"),
  password: z.string().trim().max(64).optional().default(""),
  message: z.string().trim().min(2).max(500)
});

module.exports = {
  listReportsQuerySchema,
  updateReportPreferencesSchema,
  updateReportSharingSchema,
  publicReportAccessSchema,
  publicReportCommentSchema
};
