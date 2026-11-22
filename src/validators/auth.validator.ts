import { z } from "zod";
import { registry } from "../openapi.ts";

export const RegisterSchema = registry.register(
  "Register",
  z.object({
    username: z.string().min(3).max(30),
    email: z.email(),
    password: z.string().min(6),
    name: z.string().min(2),
  }),
);

export const LoginSchema = registry.register(
  "Login",
  z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
);

export const RefreshSchema = registry.register(
  "Refresh",
  z.object({
    refreshToken: z.string().min(1),
  }),
);

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type RefreshBody = z.infer<typeof RefreshSchema>;

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.number().int(),
    username: z.string(),
    email: z.email(),
    name: z.string(),
  }),
);

const TokenPairSchema = registry.register(
  "TokenPair",
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
);

const AuthResponseSchema = registry.register(
  "AuthResponse",
  TokenPairSchema.extend({ user: UserSchema }),
);

const ProfileSchema = registry.register(
  "Profile",
  UserSchema.extend({ createdAt: z.iso.datetime() }),
);

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.string(),
    details: z.any().optional(),
  }),
);

const json = <T extends z.ZodTypeAny>(schema: T) => ({
  "application/json": { schema },
});

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: { required: true, content: json(RegisterSchema) },
  },
  responses: {
    201: {
      description: "User registered, token pair issued",
      content: json(AuthResponseSchema),
    },
    409: {
      description: "Username or email already taken",
      content: json(ErrorSchema),
    },
    422: { description: "Validation error", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in with username and password",
  request: {
    body: { required: true, content: json(LoginSchema) },
  },
  responses: {
    200: {
      description: "Logged in, new token pair issued",
      content: json(AuthResponseSchema),
    },
    401: { description: "Invalid credentials", content: json(ErrorSchema) },
    422: { description: "Validation error", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Exchange a refresh token for a new token pair (token rotation)",
  request: {
    body: { required: true, content: json(RefreshSchema) },
  },
  responses: {
    200: {
      description: "New token pair issued",
      content: json(TokenPairSchema),
    },
    401: {
      description: "Invalid, expired or revoked refresh token",
      content: json(ErrorSchema),
    },
    422: { description: "Validation error", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Log out — invalidate the current user's refresh token",
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: "Logged out" },
    401: {
      description: "Missing, invalid or expired access token",
      content: json(ErrorSchema),
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get the current user's profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Current user", content: json(ProfileSchema) },
    401: {
      description: "Missing, invalid or expired access token",
      content: json(ErrorSchema),
    },
  },
});
