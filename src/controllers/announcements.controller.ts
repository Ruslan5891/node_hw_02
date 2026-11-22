import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import type {
  AnnouncementParams,
  CreateAnnouncementBody,
  UpdateAnnouncementBody,
  GetAnnouncementsQuery,
} from "../validators/announcements.validator.ts";

const PER_PAGE = 10;

const announcementSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, username: true, email: true, name: true },
  },
} satisfies Prisma.AnnouncementSelect;

type ParamsLocals = { params: AnnouncementParams };

export const getAllAnnouncements = async (
  _req: Request,
  res: Response<any, { query: GetAnnouncementsQuery }>,
) => {
  const { search, sort, page = 1 } = res.locals.query;

  const where: Prisma.AnnouncementWhereInput = {};

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const orderBy: Prisma.AnnouncementOrderByWithRelationInput = {
    createdAt: sort === "oldest" ? "asc" : "desc",
  };

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: announcementSelect,
    }),
    prisma.announcement.count({ where }),
  ]);

  res.status(200).json({
    data: announcements,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
};

export const getAnnouncementById = async (
  _req: Request,
  res: Response<any, ParamsLocals>,
) => {
  const { id } = res.locals.params;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
  });

  if (!announcement) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  res.status(200).json(announcement);
};

export const createAnnouncement = async (
  req: Request<{}, {}, CreateAnnouncementBody>,
  res: Response,
) => {
  const { title, description, price, category } = req.body;

  const announcement = await prisma.announcement.create({
    data: {
      title,
      description,
      price,
      category,
      userId: req.user!.sub,
    },
    select: announcementSelect,
  });

  res.status(201).json(announcement);
};

export const updateAnnouncement = async (
  req: Request<{}, {}, UpdateAnnouncementBody>,
  res: Response<any, ParamsLocals>,
) => {
  const { id } = res.locals.params;
  const { title, description, price, category } = req.body;

  const existing = await prisma.announcement.findUnique({ where: { id } });

  if (!existing) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  if (existing.userId !== req.user!.sub) {
    return res.status(403).json({ error: "Access denied" });
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { title, description, price, category },
    select: announcementSelect,
  });

  res.status(200).json(announcement);
};

export const deleteAnnouncement = async (
  req: Request,
  res: Response<any, ParamsLocals>,
) => {
  const { id } = res.locals.params;

  const existing = await prisma.announcement.findUnique({ where: { id } });

  if (!existing) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  if (existing.userId !== req.user!.sub) {
    return res.status(403).json({ error: "Access denied" });
  }

  await prisma.announcement.delete({ where: { id } });

  res.status(204).end();
};
