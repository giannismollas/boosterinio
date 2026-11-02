import { timeAgo } from "@/lib/utils";
import { Stars } from "../ui";

/** Buyer names are masked on public pages: "Ja***s". */
export function maskName(name: string) {
  const clean = name.trim();
  if (clean.length <= 2) return `${clean[0] ?? "?"}***`;
  return `${clean.slice(0, 2)}***${clean.slice(-1)}`;
}

export type ReviewCardData = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  author: { name: string };
  order: { gameName: string; type: string; title: string };
};

export function ReviewCard({ review }: { review: ReviewCardData }) {
  return (
    <li className="panel-flat p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <Stars value={review.rating} />
          <span className="text-sm font-medium text-ink-2">{maskName(review.author.name)}</span>
        </span>
        <span className="text-[0.75rem] text-ink-3">{timeAgo(review.createdAt)}</span>
      </div>
      {review.comment ? <p className="mt-2.5 text-sm leading-relaxed text-ink">{review.comment}</p> : null}
      <p className="mt-2.5 truncate text-[0.75rem] text-ink-3">
        {review.order.gameName} · {review.order.type === "BOOST" ? "Boosting" : "Marketplace"} · {review.order.title}
      </p>
    </li>
  );
}
