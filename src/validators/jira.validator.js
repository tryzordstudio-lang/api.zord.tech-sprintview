const { z } = require("zod");

const listSprintsQuerySchema = z.object({
  boardId: z.string().min(1)
});

const importJiraSprintSchema = z.object({
  boardId: z.string().min(1),
  sprintId: z.string().min(1),
  projectName: z.string().min(2).max(100).optional(),
  projectKey: z.string().min(1).max(50).optional()
});

module.exports = { listSprintsQuerySchema, importJiraSprintSchema };
