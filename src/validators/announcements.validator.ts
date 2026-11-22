import { z } from "zod";
import { registry } from "../openapi.ts";
import { ErrorSchema, UserSchema } from "./auth.validator.ts";

export const AnnouncementParamsSchema = registry.register(
  "AnnouncementParams",
  z.object({
    id: z.coerce.number().int().positive(),
  }),
);

export const CreateAnnouncementSchema = registry.register(
  "CreateAnnouncement",
  z.object({
    title: z.string().min(5).max(50),
    description: z.string().min(10),
    price: z.number().positive(),
    category: z.enum(["sale", "service", "job", "other"]),
  }),
);

export const UpdateAnnouncementSchema = registry.register(
  "UpdateAnnouncement",
  CreateAnnouncementSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { error: "At least one field must be provided" },
  ),
);

export const GetAnnouncementsQuerySchema = registry.register(
  "GetAnnouncementsQuery",
  z.object({
    search: z.string().optional(),
    sort: z.enum(["newest", "oldest"]).optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
);

export type AnnouncementParams = z.infer<typeof AnnouncementParamsSchema>;
export type CreateAnnouncementBody = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof UpdateAnnouncementSchema>;
export type GetAnnouncementsQuery = z.infer<typeof GetAnnouncementsQuerySchema>;

const AnnouncementSchema = registry.register(
  "Announcement",
  z.object({
    id: z.number().int(),
    title: z.string(),
    description: z.string(),
    price: z.number(),
    category: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    user: UserSchema,
  }),
);

const AnnouncementListSchema = registry.register(
  "AnnouncementList",
  z.object({
    data: z.array(AnnouncementSchema),
    pagination: z.object({
      total: z.number().int(),
      page: z.number().int(),
      totalPages: z.number().int(),
      perPage: z.number().int(),
    }),
  }),
);

const json = <T extends z.ZodTypeAny>(schema: T) => ({
  "application/json": { schema },
});

const unauthorized = {
  description: "Missing, invalid or expired access token",
  content: json(ErrorSchema),
};
const forbidden = {
  description: "Access denied — not the owner",
  content: json(ErrorSchema),
};
const notFound = {
  description: "Announcement not found",
  content: json(ErrorSchema),
};
const invalidParams = {
  description: "Invalid parameters",
  content: json(ErrorSchema),
};
const validationError = {
  description: "Validation error",
  content: json(ErrorSchema),
};

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements with pagination, search and sorting",
  request: { query: GetAnnouncementsQuerySchema },
  responses: {
    200: {
      description: "Page of announcements (10 per page)",
      content: json(AnnouncementListSchema),
    },
    400: {
      description: "Invalid query parameters",
      content: json(ErrorSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get announcement by ID",
  request: { params: AnnouncementParamsSchema },
  responses: {
    200: {
      description: "Announcement with its author",
      content: json(AnnouncementSchema),
    },
    400: invalidParams,
    404: notFound,
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement",
  security: [{ bearerAuth: [] }],
  request: {
    body: { required: true, content: json(CreateAnnouncementSchema) },
  },
  responses: {
    201: {
      description: "Announcement created",
      content: json(AnnouncementSchema),
    },
    401: unauthorized,
    422: validationError,
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementParamsSchema,
    body: { required: true, content: json(UpdateAnnouncementSchema) },
  },
  responses: {
    200: {
      description: "Announcement updated",
      content: json(AnnouncementSchema),
    },
    400: invalidParams,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    422: validationError,
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  security: [{ bearerAuth: [] }],
  request: { params: AnnouncementParamsSchema },
  responses: {
    204: { description: "Announcement deleted" },
    400: invalidParams,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});
