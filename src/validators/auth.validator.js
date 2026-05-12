const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  workspaceName: z.string().trim().min(2).max(100).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128).optional().default(""),
    newPassword: z.string().min(8).max(128)
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"]
  });

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
  password: z.string().min(8).max(128).optional().default("")
});

const emailAvailabilityQuerySchema = z.object({
  email: z.string().trim().email()
});

module.exports = { signupSchema, loginSchema, changePasswordSchema, deleteAccountSchema, emailAvailabilityQuerySchema };
