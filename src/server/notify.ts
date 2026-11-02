import { absoluteUrl } from "@/lib/site";
import { db } from "./db";
import { sendEmail } from "./email";

type Note = { title: string; body?: string; href?: string; email?: boolean };

/** In-app notification, optionally mirrored by email. Never throws. */
export async function notify(userId: string, note: Note) {
  try {
    await db.notification.create({
      data: { userId, title: note.title, body: note.body, href: note.href },
    });
    if (note.email) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) {
        await sendEmail({
          to: user.email,
          subject: note.title,
          heading: note.title,
          body: note.body ?? "",
          cta: note.href ? { label: "Open", url: absoluteUrl(note.href) } : undefined,
        });
      }
    }
  } catch (err) {
    console.error("[notify] failed", err);
  }
}

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>,
) {
  try {
    await db.auditLog.create({
      data: { actorId, action, entity, entityId: entityId ?? null, meta: (meta ?? undefined) as never },
    });
  } catch (err) {
    console.error("[audit] failed", err);
  }
}
