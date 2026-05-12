const { z } = require("zod");

const manualStorySchema = z.object({
  issueKey: z.string().optional(),
  name: z.string().min(1),
  status: z.string().min(1),
  assignee: z.string().optional(),
  storyPoints: z.number().min(0).default(0),
  issueType: z.string().optional(),
  blocked: z.boolean().optional()
});

const manualImportSprintSchema = z.object({
  projectName: z.string().min(2).max(100),
  projectKey: z.string().min(1).max(50).optional(),
  jiraBoardId: z.string().optional(),
  sprintNumber: z.number().int().positive().optional(),
  name: z.string().min(2).max(200),
  goal: z.string().max(500).optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    })
    .optional(),
  stories: z.array(manualStorySchema).min(1)
});

const listSprintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["imported", "processing", "ready", "failed"]).optional(),
  deliveryRisk: z.enum(["low", "medium", "high"]).optional(),
  projectId: z.string().min(1).optional(),
  search: z.string().min(1).max(100).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "healthScore", "completionRate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

const updateSprintSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    goal: z.string().max(500).nullable().optional(),
    sprintNumber: z.number().int().positive().optional(),
    dateRange: z
      .object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional()
      })
      .nullable()
      .optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

module.exports = { manualImportSprintSchema, listSprintsQuerySchema, updateSprintSchema };
