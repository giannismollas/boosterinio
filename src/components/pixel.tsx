import type { SVGProps } from "react";

/**
 * Renders a pixel map (array of equal-length strings) as crisp SVG rects,
 * merging horizontal runs. Characters missing from `palette` (and ".") are empty.
 */
export function PixelArt({
  map,
  palette,
  title,
  ...props
}: { map: readonly string[]; palette: Record<string, string>; title?: string } & SVGProps<SVGSVGElement>) {
  const h = map.length;
  const w = map[0]?.length ?? 0;
  const rects: React.ReactNode[] = [];
  map.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill) {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < w && row[x + len] === ch) len++;
      rects.push(<rect key={`${x}.${y}`} x={x} y={y} width={len} height={1} fill={fill} />);
      x += len;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {rects}
    </svg>
  );
}

/** Select-screen cursor: a chunky pixel triangle pointing right. */
export function PixelCursor({ color = "currentColor", ...props }: { color?: string } & SVGProps<SVGSVGElement>) {
  return (
    <PixelArt
      map={["x....", "xxx..", "xxxxx", "xxx..", "x...."]}
      palette={{ x: color }}
      {...props}
    />
  );
}

/** The coin door's slot plate, drawn on the INSERT COIN button. */
export function PixelCoinSlot(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelArt
      map={[
        "ooooooooo",
        "ommmmmmmo",
        "ommmkhmmo",
        "ommmkhmmo",
        "ommmkhmmo",
        "ommmkhmmo",
        "ommmkhmmo",
        "ommmmmmmo",
        "ooooooooo",
      ]}
      palette={{ o: "#1d1600", m: "#5c4a00", k: "#0b0800", h: "#fff3b0" }}
      {...props}
    />
  );
}

/**
 * A round arcade push-button cap on a 12×12 grid: dark rim, colored dome,
 * a highlight up-left and shade down-right. `pressed` drops the highlight
 * and lights the cap (it is lit while selected).
 */
export function PixelCap({
  base,
  light,
  dark,
  pressed = false,
  ...props
}: { base: string; light: string; dark: string; pressed?: boolean } & SVGProps<SVGSVGElement>) {
  const size = 12;
  const c = (size - 1) / 2;
  const rows: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > 5.9) row += ".";
      else if (d > 4.9) row += "o";
      else if (!pressed && x + y < 7 && d < 4.2) row += "h";
      else if (x + y > 15) row += pressed ? "b" : "s";
      else row += "b";
    }
    rows.push(row);
  }
  return <PixelArt map={rows} palette={{ o: "#0b0a09", b: base, h: light, s: dark }} {...props} />;
}

/** Shield used for escrow / protection messaging. */
export function PixelShield(props: SVGProps<SVGSVGElement>) {
  return (
    <PixelArt
      map={[
        ".oooooooo.",
        "occcccccco",
        "occckcccco",
        "occkkkccco",
        "ockkkkkcco",
        "occkkkccco",
        ".occkccco.",
        "..occcco..",
        "...occo...",
        "....oo....",
      ]}
      palette={{ o: "#0b0a09", c: "#5cf2d6", k: "#0f4a42" }}
      {...props}
    />
  );
}
