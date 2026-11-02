import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { ImageUploader } from "@/components/image-uploader";
import { PageHeader } from "@/components/ui";
import { TICKET_CATEGORIES } from "@/lib/catalog";
import { str } from "@/lib/utils";
import { createTicketAction } from "@/server/actions/tickets";
import { requireUser } from "@/server/session";

export const metadata = { title: "New ticket" };

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("/dashboard/tickets/new");
  const order = str((await searchParams).order).toUpperCase();
  return (
    <>
      <PageHeader title="New ticket" description="Tell us what's going on. Include the order number if it's about an order; it gets your ticket handled first." />
      <ActionForm action={createTicketAction} className="panel max-w-2xl space-y-5 p-5 sm:p-6">
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="t-cat">
                  Topic
                </label>
                <select id="t-cat" name="category" className="field" defaultValue={order ? "ORDER" : "OTHER"}>
                  {Object.entries(TICKET_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="t-order">
                  Order number (optional)
                </label>
                <input id="t-order" name="order" className="field uppercase" defaultValue={order} placeholder="BST-XXXXXX" maxLength={20} />
                <FieldError name="order" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="t-subject">
                Subject
              </label>
              <input id="t-subject" name="subject" className="field" required minLength={5} maxLength={140} />
              <FieldError name="subject" />
            </div>
            <div>
              <label className="label" htmlFor="t-body">
                Message
              </label>
              <textarea id="t-body" name="body" className="field min-h-40" required minLength={15} maxLength={5000} />
              <FieldError name="body" />
            </div>
            <div>
              <p className="label">Screenshots (optional)</p>
              <ImageUploader name="images" folder="tickets" max={6} />
            </div>
            <SubmitButton className="btn-coin" pendingText="Sending…">
              Send ticket
            </SubmitButton>
          </>
      </ActionForm>
    </>
  );
}
