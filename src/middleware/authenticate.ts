import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export type AuthUser = {
  sub: number;
  username: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);

    if (
      typeof payload === "string" ||
      payload.type !== "access" ||
      typeof payload.sub !== "number"
    ) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = { sub: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
