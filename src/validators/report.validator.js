const { z } = require("zod");

const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "published"]).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

const updateReportStatusSchema = z.object({
  status: z.enum(["draft", "published"])
});

module.exports = { listReportsQuerySchema, updateReportStatusSchema };
