"use client";

import { Lock, Minus, Plus, Zap } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FieldError, SubmitButton } from "@/components/forms";
import { ImageUploader } from "@/components/image-uploader";
import type { ActionState } from "@/lib/action";
import { CATEGORIES, CATEGORY_ORDER, type ListingCategoryKey } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ATTRIBUTE_HINTS, DELIVERY_PRESETS, MAX_ATTRIBUTES, splitStockItems } from "./constants";

export type ListingFormGame = {
  id: string;
  name: string;
  categories: string[];
  servers: string[];
  platforms: string[];
  currencyName: string | null;
};

export type ListingFormInitial = {
  id?: string;
  gameId?: string;
  category?: string;
  title?: string;
  description?: string;
  price?: number;
  deliveryMethod?: "INSTANT" | "MANUAL";
  deliveryTime?: number;
  stock?: number;
  minQuantity?: number;
  unitLabel?: string | null;
  server?: string | null;
  platform?: string | null;
  attributes?: Record<string, string>;
  images?: string[];
};

type Row = { id: number; k: string; v: string };

export function ListingForm({
  action,
  games,
  initial = {},
  undelivered = 0,
  approvalRequired,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  games: ListingFormGame[];
  initial?: ListingFormInitial;
  undelivered?: number;
  approvalRequired: boolean;
}) {
  const editing = !!initial.id;
  const [state, formAction] = useActionState(action, null);
  const [gameId, setGameId] = useState(initial.gameId ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [method, setMethod] = useState<"INSTANT" | "MANUAL">(initial.deliveryMethod ?? "MANUAL");
  const [stockText, setStockText] = useState("");
  const [rows, setRows] = useState<Row[]>(() => {
    const entries = Object.entries(initial.attributes ?? {});
    return (entries.length ? entries : [["", ""]]).map(([k, v], i) => ({ id: i, k, v }));
  });

  const game = games.find((g) => g.id === gameId);
  const categories = useMemo(() => (game ? CATEGORY_ORDER.filter((c) => game.categories.includes(c)) : []), [game]);
  const activeCategory = categories.includes(category as ListingCategoryKey) ? category : "";
  const hints = ATTRIBUTE_HINTS[activeCategory] ?? ATTRIBUTE_HINTS.ACCOUNT;
  const newItems = splitStockItems(stockText).length;

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      setStockText("");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const invalid = (name: string) => (state?.fieldErrors?.[name] ? true : undefined);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {/* What */}
      <section className="panel-flat p-5 sm:p-6" aria-labelledby="lf-what">
        <h2 id="lf-what" className="t-display text-2xl text-ink uppercase">
          Game & category
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="gameId" className="label">
              Game
            </label>
            <select
              id="gameId"
              name="gameId"
              className="field"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              aria-invalid={invalid("gameId")}
              required
            >
              <option value="">Choose a game</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <FieldError state={state} name="gameId" />
          </div>
          <div>
            <label htmlFor="category" className="label">
              Category
            </label>
            <select
              id="category"
              name="category"
              className="field"
              value={activeCategory}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!game}
              aria-invalid={invalid("category")}
              required
            >
              <option value="">{game ? "Choose a category" : "Choose a game first"}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c].label}
                </option>
              ))}
            </select>
            <FieldError state={state} name="category" />
          </div>
          {game?.servers.length ? (
            <div key={`srv-${game.id}`}>
              <label htmlFor="server" className="label">
                Server / region
              </label>
              <select id="server" name="server" className="field" defaultValue={initial.gameId === game.id ? (initial.server ?? "") : ""}>
                <option value="">Any or not specific</option>
                {game.servers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FieldError state={state} name="server" />
            </div>
          ) : (
            <input type="hidden" name="server" value="" />
          )}
          {game?.platforms.length ? (
            <div key={`plt-${game.id}`}>
              <label htmlFor="platform" className="label">
                Platform
              </label>
              <select id="platform" name="platform" className="field" defaultValue={initial.gameId === game.id ? (initial.platform ?? "") : ""}>
                <option value="">Any or not specific</option>
                {game.platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <FieldError state={state} name="platform" />
            </div>
          ) : (
            <input type="hidden" name="platform" value="" />
          )}
        </div>
      </section>

      {/* Details */}
      <section className="panel-flat p-5 sm:p-6" aria-labelledby="lf-details">
        <h2 id="lf-details" className="t-display text-2xl text-ink uppercase">
          Details
        </h2>
        <div className="mt-4 space-y-5">
          <div>
            <label htmlFor="title" className="label">
              Title
            </label>
            <input
              id="title"
              name="title"
              className="field"
              defaultValue={initial.title}
              maxLength={140}
              placeholder="EUW Diamond IV · 84 champions · 37 skins · email change ready"
              aria-invalid={invalid("title")}
              required
            />
            <FieldError state={state} name="title" />
          </div>
          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="field min-h-44"
              defaultValue={initial.description}
              maxLength={5000}
              placeholder="What exactly the buyer gets, how you deliver it, and anything they need to do after delivery."
              aria-invalid={invalid("description")}
              required
            />
            <FieldError state={state} name="description" />
          </div>

          <div>
            <span className="label">Key details</span>
            <p className="-mt-0.5 mb-2.5 text-[0.8125rem] text-ink-3">Shown on your listing card and page, e.g. rank, level or amount.</p>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={row.id} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] gap-2">
                  <input
                    name="attrKey"
                    className="field"
                    aria-label={`Detail ${i + 1} name`}
                    placeholder={hints[i]?.[0] ?? "Name"}
                    maxLength={30}
                    value={row.k}
                    onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, k: e.target.value } : r)))}
                  />
                  <input
                    name="attrValue"
                    className="field"
                    aria-label={`Detail ${i + 1} value`}
                    placeholder={hints[i]?.[1] ?? "Value"}
                    maxLength={80}
                    value={row.v}
                    onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, v: e.target.value } : r)))}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost px-3"
                    aria-label={`Remove detail ${i + 1}`}
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== row.id) : [{ id: Date.now(), k: "", v: "" }]))}
                  >
                    <Minus className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            {rows.length < MAX_ATTRIBUTES ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-2.5"
                onClick={() => setRows((rs) => [...rs, { id: Date.now(), k: "", v: "" }])}
              >
                <Plus className="size-4" /> Add detail
              </button>
            ) : null}
            <FieldError state={state} name="attributes" />
          </div>

          <div>
            <span className="label">Images</span>
            <ImageUploader name="images" initial={initial.images ?? []} max={8} folder="listings" />
          </div>
        </div>
      </section>

      {/* Price & delivery */}
      <section className="panel-flat p-5 sm:p-6" aria-labelledby="lf-price">
        <h2 id="lf-price" className="t-display text-2xl text-ink uppercase">
          Price & delivery
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="label">
              Price{method === "MANUAL" ? " per unit" : ""}
            </label>
            <input
              id="price"
              name="price"
              className="field tnum"
              inputMode="decimal"
              defaultValue={initial.price !== undefined ? (initial.price / 100).toFixed(2) : ""}
              placeholder="19.99"
              aria-invalid={invalid("price")}
              required
            />
            <FieldError state={state} name="price" />
          </div>
          <div>
            <label htmlFor="unitLabel" className="label">
              Unit (optional)
            </label>
            <input
              id="unitLabel"
              name="unitLabel"
              className="field"
              defaultValue={initial.unitLabel ?? ""}
              maxLength={40}
              placeholder={game?.currencyName ? `1,000 ${game.currencyName}` : "1 account"}
            />
            <p className="mt-1.5 text-[0.8125rem] text-ink-3">What one unit is, shown as “per …” next to the price.</p>
            <FieldError state={state} name="unitLabel" />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="label">Delivery</legend>
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            {(
              [
                { id: "INSTANT", title: "Instant delivery", text: "Pre-load logins or codes. Each buyer gets one the moment they pay.", Icon: Zap },
                { id: "MANUAL", title: "Manual delivery", text: "You deliver from the order page within the time you set.", Icon: Lock },
              ] as const
            ).map((opt) => {
              const active = method === opt.id;
              return (
                <label
                  key={opt.id}
                  data-active={active}
                  className={cn(
                    "cursor-frame block cursor-pointer rounded-[12px] border p-4 transition-colors [--cursor:var(--color-p1)]",
                    active ? "border-p2 bg-p2/10" : "border-cab-4 bg-cab-3 hover:border-cab-5",
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value={opt.id}
                    checked={active}
                    onChange={() => setMethod(opt.id)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <opt.Icon className={cn("size-4", active ? "text-phosphor" : "text-ink-3")} /> {opt.title}
                  </span>
                  <span className="mt-1 block text-[0.8125rem] leading-snug text-ink-2">{opt.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {method === "MANUAL" ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="deliveryTime" className="label">
                Delivery time
              </label>
              <select id="deliveryTime" name="deliveryTime" className="field" defaultValue={String(initial.deliveryTime ?? 60)}>
                {DELIVERY_PRESETS.map((p) => (
                  <option key={p.minutes} value={p.minutes}>
                    Within {p.label}
                  </option>
                ))}
              </select>
              <FieldError state={state} name="deliveryTime" />
            </div>
            <div>
              <label htmlFor="stock" className="label">
                Stock
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                min={0}
                step={1}
                className="field tnum"
                defaultValue={initial.stock ?? 1}
                aria-invalid={invalid("stock")}
              />
              <FieldError state={state} name="stock" />
            </div>
            <div>
              <label htmlFor="minQuantity" className="label">
                Minimum order
              </label>
              <input
                id="minQuantity"
                name="minQuantity"
                type="number"
                min={1}
                step={1}
                className="field tnum"
                defaultValue={initial.minQuantity ?? 1}
                aria-invalid={invalid("minQuantity")}
              />
              <FieldError state={state} name="minQuantity" />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <input type="hidden" name="deliveryTime" value="5" />
            <input type="hidden" name="stock" value="0" />
            <input type="hidden" name="minQuantity" value="1" />
            <label htmlFor="stockItems" className="label">
              {editing ? "Add stock" : "Stock to deliver"}
            </label>
            {editing ? (
              <p className="mb-2 text-[0.8125rem] text-ink-2">
                <span className="text-ink tnum">{undelivered}</span> item{undelivered === 1 ? "" : "s"} in stock. Anything you add below is appended.
              </p>
            ) : null}
            <textarea
              id="stockItems"
              name="stockItems"
              className="field min-h-40 font-mono text-[0.8125rem]"
              value={stockText}
              onChange={(e) => setStockText(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={"Login: account_one\nPassword: ••••••••\n---\nLogin: account_two\nPassword: ••••••••"}
              aria-invalid={invalid("stockItems")}
            />
            <p className="mt-1.5 text-[0.8125rem] text-ink-3">
              Separate items with a line containing only <code className="text-ink-2">---</code>. Items are encrypted and only shown to the buyer
              who receives them.{newItems ? ` ${newItems} item${newItems === 1 ? "" : "s"} ready to add.` : ""}
            </p>
            <FieldError state={state} name="stockItems" />
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton className="btn-coin btn-lg" pendingText="Saving…">
          {editing ? "Save changes" : approvalRequired ? "Submit for review" : "Publish listing"}
        </SubmitButton>
        {approvalRequired ? (
          <p className="max-w-[52ch] text-[0.8125rem] text-ink-3">
            {editing
              ? "Changes to the game, category, title, description, details or images go back to staff review before they're live. Price and stock updates apply straight away."
              : "Staff review new listings before they go live. You'll get a notification when it's approved."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
