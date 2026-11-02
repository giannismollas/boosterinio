import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import { markNotificationsReadAction } from "@/server/actions/orders";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          unread ? (
            <ActionForm action={markNotificationsReadAction}>
              <SubmitButton className="btn-ghost btn-sm">Mark all as read</SubmitButton>
            </ActionForm>
          ) : null
        }
      />
      {items.length ? (
        <ul className="divide-y divide-cab-4 overflow-hidden rounded-[14px] border border-cab-4 bg-cab-2">
          {items.map((n) => {
            const body = (
              <div className="flex items-start gap-3 px-5 py-4">
                <span className={cn("mt-2 size-2 shrink-0", n.readAt ? "bg-cab-5" : "bg-p1 shadow-[0_0_8px_var(--color-p1)]")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", n.readAt ? "text-ink-2" : "text-ink")}>{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-sm text-ink-3">{n.body}</p> : null}
                </div>
                <span className="shrink-0 text-[0.75rem] text-ink-3">{timeAgo(n.createdAt)}</span>
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href} className="block transition-colors hover:bg-cab-3">{body}</Link> : body}</li>;
          })}
        </ul>
      ) : (
        <EmptyState title="All quiet">Order updates, messages and payouts will show up here.</EmptyState>
      )}
    </>
  );
}
