import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import type {
  RegisterBody,
  LoginBody,
  RefreshBody,
} from "../validators/auth.validator.ts";

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

const generateTokens = (user: { id: number; username: string }) => {
  const secret = process.env.JWT_SECRET!;

  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, type: "access" },
    secret,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: "refresh", jti: randomUUID() },
    secret,
    { expiresIn: REFRESH_TOKEN_TTL },
  );

  return { accessToken, refreshToken };
};

export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
) => {
  const { username, email, password, name } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    return res.status(409).json({ error: "Username or email already taken" });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, name, password: hashedPassword },
    select: publicUserSelect,
  });

  const tokens = generateTokens(user);

  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id },
  });

  res.status(201).json({ user, ...tokens });
};

export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response,
) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const tokens = generateTokens(user);

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id },
    }),
  ]);

  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  });
};

export const refresh = async (
  req: Request<{}, {}, RefreshBody>,
  res: Response,
) => {
  const { refreshToken } = req.body;

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    if (typeof payload === "string" || payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const tokens = generateTokens(stored.user);

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { id: stored.id } }),
    prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: stored.userId },
    }),
  ]);

  res.status(200).json(tokens);
};

export const logout = async (req: Request, res: Response) => {
  await prisma.refreshToken.deleteMany({
    where: { userId: req.user!.sub },
  });

  res.status(204).end();
};

export const me = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { ...publicUserSelect, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json(user);
};
