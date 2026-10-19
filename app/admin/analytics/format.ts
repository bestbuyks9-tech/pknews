// Albanian formats written out by hand: some browsers ship without "sq" locale data and fall back to English.
const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];

// Categorical slots in fixed order (validated palette); an entity keeps its colour whatever its rank.
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

export const num = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const dayLabel = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1].slice(0, 3)}`; };

export const dateTime = (iso: string | number) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Belgrade" })
    .formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.day} ${MONTHS[Number(parts.month) - 1]}, ora ${parts.hour}:${parts.minute}`;
};

/** Bytes as MB/GB with one decimal. */
export const bytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1).replace(".", ",")} GB` : `${(b / 1e6).toFixed(1).replace(".", ",")} MB`);

/** Decimal with Albanian comma, for plan units like GB or hours. */
export const dec = (n: number) => (n >= 100 ? num(n) : n.toFixed(n >= 10 ? 1 : 2).replace(".", ","));
