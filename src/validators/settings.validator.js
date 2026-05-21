const { z } = require("zod");

const updateSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(300).optional().default(""),
  timezone: z.string().trim().min(2).max(64).optional().default("UTC"),
  branding: z
    .object({
      companyName: z.string().trim().max(120).optional().default(""),
      companyTagline: z.string().trim().max(160).optional().default(""),
      logoUrl: z.string().trim().url().or(z.literal("")).optional().default("")
    })
    .default({}),
  notifications: z
    .object({
      alertChannel: z.enum(["email", "slack-email", "slack"]).default("email"),
      digestWindow: z.enum(["monday-0900", "friday-1600"]).default("monday-0900")
    })
    .default({}),
  accessControl: z
    .object({
      defaultShareMode: z.enum(["private", "team", "public", "password"]).default("team"),
      allowPublicLinks: z.coerce.boolean().default(true)
    })
    .default({})
});

module.exports = { updateSettingsSchema };
