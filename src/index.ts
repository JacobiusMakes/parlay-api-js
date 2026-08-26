/**
 * ParlayAPI JavaScript / TypeScript SDK.
 *
 * Zero-dependency fetch-based client for https://parlay-api.com, mirroring
 * the official Python SDK (pip install parlay-api). Works in Node.js 18+
 * (native fetch) and modern browsers.
 *
 * Quickstart (sandbox, no API key needed):
 *
 *   import { ParlayAPI } from "parlay-api";
 *
 *   const client = new ParlayAPI({ sandbox: true });
 *   const sports = await client.sports();
 *   const odds = await client.odds("basketball_nba", {
 *     regions: "us",
 *     markets: ["h2h", "spreads", "totals"],
 *   });
 *
 * With a key (free tier: 1,000 credits/month, no card):
 *
 *   const client = new ParlayAPI({ apiKey: "YOUR_KEY" });
 *   const props = await client.props("baseball_mlb", {
 *     markets: ["player_strikeouts", "player_total_bases"],
 *     bookmakers: ["draftkings", "pinnacle", "fanduel"],
 *   });
 *
 * Migrating from the-odds-api: pass `toaCompat: true` and the client calls
 * the /v4 the-odds-api compatible paths (identical paths and response
 * shapes). The default /v1 paths return the same shapes.
 */

declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;

export const VERSION = "0.4.0";

const DEFAULT_BASE_URL = "https://parlay-api.com";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = `parlay-api-js/${VERSION}`;

/* ------------------------------------------------------------------ */
/* Errors                                                             */
/* ------------------------------------------------------------------ */

/** Base error for all SDK failures. */
export class ParlayAPIError extends Error {
  /** HTTP status code, when the error came from an HTTP response. */
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ParlayAPIError";
    this.status = status;
  }
}

/** The API key is missing, malformed, or revoked (HTTP 401). */
export class InvalidAPIKeyError extends ParlayAPIError {
  constructor(message: string) {
    super(message, 401);
    this.name = "InvalidAPIKeyError";
  }
}

/** The account hit its monthly credit cap (HTTP 403). */
export class CreditLimitExceededError extends ParlayAPIError {
  constructor(message: string) {
    super(message, 403);
    this.name = "CreditLimitExceededError";
  }
}

/** The per-second rate limit fired (HTTP 429). */
export class RateLimitedError extends ParlayAPIError {
  constructor(message: string) {
    super(message, 429);
    this.name = "RateLimitedError";
  }
}

/** The requested feature requires a higher tier (HTTP 403). */
export class TierGatedError extends ParlayAPIError {
  constructor(message: string) {
    super(message, 403);
    this.name = "TierGatedError";
  }
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

/** Snapshot of API key usage state, parsed from x-requests-* headers. */
export interface Quota {
  requestsUsed: number | null;
  requestsRemaining: number | null;
  requestsLast: number | null;
}

export interface Sport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights?: boolean;
  [extra: string]: unknown;
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
  [extra: string]: unknown;
}

export interface Market {
  key: string;
  last_update?: string;
  outcomes: Outcome[];
  [extra: string]: unknown;
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update?: string;
  markets: Market[];
  [extra: string]: unknown;
}

/** One event with nested bookmakers, markets, and outcomes. */
export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string | null;
  away_team: string | null;
  bookmakers: Bookmaker[];
  [extra: string]: unknown;
}

export interface EventSummary {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string | null;
  away_team: string | null;
  [extra: string]: unknown;
}

/** One (book, player, market, line) prop row. */
export interface PropRow {
  sport_key?: string;
  event_id?: string;
  bookmaker?: string;
  player_name?: string;
  market?: string;
  line?: number | null;
  over_price?: number | null;
  under_price?: number | null;
  [extra: string]: unknown;
}

export type JsonRecord = Record<string, unknown>;

type ParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<string | number>;

type Params = Record<string, ParamValue>;

export interface ParlayAPIOptions {
  /**
   * Your ParlayAPI key. Optional: keyless endpoints (sports, sandbox,
   * status) work without one, so you can explore before signing up.
   * Falls back to the PARLAYAPI_KEY environment variable in Node.
   */
  apiKey?: string;
  /** Override for testing or self-hosted instances. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default 30000. */
  timeout?: number;
  /** Custom User-Agent header (Node only; browsers ignore it). */
  userAgent?: string;
  /**
   * Route data methods through the keyless /v1/sandbox mirror, which
   * serves realistic synthetic data and costs no credits. Great for
   * development and CI. Methods without a sandbox twin fall through to
   * the live path.
   */
  sandbox?: boolean;
  /**
   * the-odds-api compatibility mode: route sports/odds/events/scores and
   * historicalOdds through the /v4 paths that mirror the-odds-api's URL
   * scheme exactly. Response shapes are identical either way.
   */
  toaCompat?: boolean;
  /** Bring-your-own fetch (for tests or exotic runtimes). */
  fetch?: typeof fetch;
}

export interface OddsOptions {
  regions?: string;
  markets?: string | ReadonlyArray<string>;
  bookmakers?: string | ReadonlyArray<string>;
  oddsFormat?: "american" | "decimal";
  dateFormat?: "iso" | "unix";
  eventIds?: ReadonlyArray<string>;
  commenceTimeFrom?: string;
  commenceTimeTo?: string;
  /** Include live (in-play) events too. */
  includeLive?: boolean;
}

export interface PropsOptions {
  markets?: string | ReadonlyArray<string>;
  bookmakers?: string | ReadonlyArray<string>;
  player?: string;
  eventId?: string;
  oddsFormat?: "american" | "decimal";
  /** "midpoint" (default, zero-vig) or "effective" per-book payout odds. */
  dfsOdds?: "midpoint" | "effective";
  limit?: number;
  offset?: number;
}

export interface ArbitrageOptions {
  /** Minimum guaranteed profit in percent, e.g. 1.5 for 1.5%. */
  minProfit?: number;
  excludeExchanges?: boolean;
  markets?: string | ReadonlyArray<string>;
  limit?: number;
}

export interface EvOptions {
  /** Sharp book whose no-vig line anchors the fair price. Default pinnacle. */
  sharpBook?: string;
  /** Minimum edge in percent, e.g. 3 for 3%. */
  minEdge?: number;
  markets?: string | ReadonlyArray<string>;
  limit?: number;
}

export interface HistoricalOddsOptions {
  regions?: string;
  markets?: string | ReadonlyArray<string>;
  oddsFormat?: "american" | "decimal";
}

export interface ClosingOddsOptions {
  markets?: string | ReadonlyArray<string>;
  bookmakers?: string | ReadonlyArray<string>;
  season?: string | number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  player?: string;
  oddsFormat?: "american" | "decimal";
}

export interface PredictionMarketsOptions {
  /** Comma list or array of sources, e.g. "kalshi,polymarket". */
  sources?: string | ReadonlyArray<string>;
}

export interface PredictionMarketSearchOptions {
  sources?: string | ReadonlyArray<string>;
  limit?: number;
  minVolume?: number;
  sort?: string;
  includeClosed?: boolean;
}

export interface VerdictOptions {
  sport: string;
  side: string;
  market?: string;
  home?: string;
  away?: string;
  event?: string;
  team?: string;
  player?: string;
  line?: number;
  book?: string;
  price?: string | number;
  region?: string;
  books?: string | ReadonlyArray<string>;
  bankroll?: number;
  kelly?: number;
  sharpBook?: string;
}

export interface ParlayVerdictLeg {
  sport: string;
  market?: string;
  side: string;
  home?: string;
  away?: string;
  team?: string;
  player?: string;
  line?: number;
  [extra: string]: unknown;
}

export interface ParlayVerdictOptions {
  region?: string;
  books?: string | ReadonlyArray<string>;
  book?: string;
  stake?: number;
  bankroll?: number;
  kelly?: number;
  sharpBook?: string;
}

export interface BestBetsOptions {
  region?: string;
  books?: string | ReadonlyArray<string>;
  limit?: number;
  minEdge?: number;
  minBooks?: number;
  markets?: string | ReadonlyArray<string>;
}

export interface MiddlesOptions {
  /** Minimum window width in points/runs/goals. Default 1.0. */
  minGap?: number;
  markets?: string | ReadonlyArray<string>;
  includeProps?: boolean;
}

export type DevigMethod = "multiplicative" | "additive" | "power";

/* ------------------------------------------------------------------ */
/* Math helpers (no network)                                          */
/* ------------------------------------------------------------------ */

/** Convert American odds to implied probability. */
export function americanToImplied(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return -american / (-american + 100);
}

/** Convert American odds to decimal odds. */
export function americanToDecimal(american: number): number {
  if (american === 0) return 1;
  if (american > 0) return american / 100 + 1;
  return 100 / -american + 1;
}

/** Convert decimal odds to American odds (rounded to int). */
export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/** Convert implied probability to American odds (rounded). */
export function impliedToAmerican(prob: number): number {
  if (prob <= 0 || prob >= 1) {
    throw new ParlayAPIError(`prob must be in (0, 1), got ${prob}`);
  }
  if (prob < 0.5) return Math.round((1 / prob - 1) * 100);
  return Math.round((-100 * prob) / (1 - prob));
}

/**
 * Remove the vig from a paired Over/Under (or Home/Away) market.
 * Returns [fairOverProb, fairUnderProb] summing to 1.0.
 *
 * Methods:
 *   "multiplicative" (default): each leg divided by the probability sum.
 *   "additive": distributes the vig equally across both legs.
 *   "power": logarithmic redistribution, better for skewed markets.
 */
export function devig(
  overPrice: number,
  underPrice: number,
  method: DevigMethod = "multiplicative"
): [number, number] {
  const pOver = americanToImplied(overPrice);
  const pUnder = americanToImplied(underPrice);
  const total = pOver + pUnder;
  if (total <= 0) {
    throw new ParlayAPIError(`invalid market: ${overPrice}/${underPrice}`);
  }
  if (method === "multiplicative") {
    return [pOver / total, pUnder / total];
  }
  if (method === "additive") {
    const halfVig = (total - 1) / 2;
    return [pOver - halfVig, pUnder - halfVig];
  }
  if (method === "power") {
    let lo = 0.5;
    let hi = 2.0;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const s = Math.pow(pOver, mid) + Math.pow(pUnder, mid);
      if (s > 1) lo = mid;
      else hi = mid;
    }
    const k = (lo + hi) / 2;
    return [Math.pow(pOver, k), Math.pow(pUnder, k)];
  }
  throw new ParlayAPIError(`unknown devig method: ${String(method)}`);
}

/**
 * Percentage-point edge of a book price vs a fair probability.
 * Positive means the bet is +EV.
 */
export function edge(bookPrice: number, fairProb: number): number {
  return fairProb - americanToImplied(bookPrice);
}

/**
 * Fractional Kelly stake as a fraction of bankroll. Returns 0 when the
 * bet is -EV. Default fraction is quarter Kelly.
 */
export function kellyStake(
  probWin: number,
  americanOdds: number,
  fraction = 0.25
): number {
  const b = americanToDecimal(americanOdds) - 1;
  if (b <= 0) return 0;
  const fullKelly = (probWin * b - (1 - probWin)) / b;
  return Math.max(0, fullKelly * fraction);
}

/* ------------------------------------------------------------------ */
/* Client                                                             */
/* ------------------------------------------------------------------ */

export class ParlayAPI {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  userAgent: string;
  sandbox: boolean;
  toaCompat: boolean;

  private _fetch: typeof fetch;
  private _lastQuota: Quota | null = null;

  /**
   * Accepts an options object or a bare key string:
   *
   *   new ParlayAPI()                        keyless: explore first
   *   new ParlayAPI("KEY")                   same as the Python SDK
   *   new ParlayAPI({ apiKey: "KEY" })       options form
   *   new ParlayAPI({ sandbox: true })       keyless synthetic data
   */
  constructor(options: ParlayAPIOptions | string = {}) {
    const opts: ParlayAPIOptions =
      typeof options === "string" ? { apiKey: options } : options;
    const envKey =
      typeof process !== "undefined" && process && process.env
        ? process.env.PARLAYAPI_KEY
        : undefined;
    this.apiKey = opts.apiKey ?? envKey ?? "";
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
    this.sandbox = opts.sandbox ?? false;
    this.toaCompat = opts.toaCompat ?? false;
    this._fetch = opts.fetch ?? fetch;
  }

  /** The most recent x-requests-* headers parsed from a response. */
  get lastQuota(): Quota | null {
    return this._lastQuota;
  }

  /* ---------------- core HTTP plumbing ---------------- */

  private buildUrl(path: string, params?: Params): string {
    const search = new URLSearchParams();
    if (this.apiKey) search.set("apiKey", this.apiKey);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === null || value === undefined || value === "") continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        search.set(key, value.join(","));
      } else if (typeof value === "boolean") {
        search.set(key, value ? "true" : "false");
      } else {
        search.set(key, String(value));
      }
    }
    const qs = search.toString();
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`;
  }

  private async request<T>(
    path: string,
    params?: Params,
    method: "GET" | "POST" = "GET",
    jsonBody?: unknown
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    let response: Response;
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      // Browsers refuse to set User-Agent; Node honors it.
      try {
        headers["User-Agent"] = this.userAgent;
      } catch {
        /* ignore */
      }
      const init: RequestInit = { method, signal: controller.signal, headers };
      if (jsonBody !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(jsonBody);
      }
      response = await this._fetch(url, init);
    } catch (err) {
      throw new ParlayAPIError(`network error: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    this._lastQuota = {
      requestsUsed: headerInt(response, "x-requests-used"),
      requestsRemaining: headerInt(response, "x-requests-remaining"),
      requestsLast: headerInt(response, "x-requests-last"),
    };

    if (!response.ok) {
      const raw = await response.text();
      let message = raw;
      try {
        const detail: unknown = JSON.parse(raw);
        if (detail && typeof detail === "object") {
          const d = detail as JsonRecord;
          message = String(d.message ?? d.detail ?? raw);
        }
      } catch {
        /* not JSON */
      }
      throwForStatus(response.status, message);
    }
    return (await response.json()) as T;
  }

  /** Resolve a data path, honoring sandbox and toaCompat modes. */
  private sportPath(
    sportKey: string,
    suffix: string,
    opts: { sandbox?: boolean; v4?: boolean } = {}
  ): string {
    const tail = suffix ? `/${suffix}` : "";
    if (this.sandbox && opts.sandbox) {
      return `/v1/sandbox/sports/${sportKey}${tail}`;
    }
    if (this.toaCompat && opts.v4) {
      return `/v4/sports/${sportKey}${tail}`;
    }
    return `/v1/sports/${sportKey}${tail}`;
  }

  /* ---------------- core data (the-odds-api compatible) ---------------- */

  /**
   * List available sports and leagues. Keyless.
   * Each row has key, group, title, description, active.
   */
  sports(): Promise<Sport[]> {
    if (this.sandbox) return this.request("/v1/sandbox/sports");
    if (this.toaCompat) return this.request("/v4/sports");
    return this.request("/v1/sports");
  }

  /**
   * Game odds for a sport across books. Markets accepts core keys
   * (h2h, spreads, totals, outrights) as a comma string or array.
   */
  odds(sportKey: string, options: OddsOptions = {}): Promise<OddsEvent[]> {
    const params: Params = {
      regions: options.regions ?? "us",
      markets: options.markets ?? "h2h",
      oddsFormat: options.oddsFormat ?? "american",
      dateFormat: options.dateFormat,
      bookmakers: options.bookmakers,
      eventIds: options.eventIds,
      commenceTimeFrom: options.commenceTimeFrom,
      commenceTimeTo: options.commenceTimeTo,
      include_live: options.includeLive,
    };
    return this.request(
      this.sportPath(sportKey, "odds", { sandbox: true, v4: true }),
      params
    );
  }

  /** Upcoming events for a sport without odds. */
  events(
    sportKey: string,
    options: {
      dateFormat?: "iso" | "unix";
      commenceTimeFrom?: string;
      commenceTimeTo?: string;
    } = {}
  ): Promise<EventSummary[]> {
    return this.request(
      this.sportPath(sportKey, "events", { sandbox: true, v4: true }),
      {
        dateFormat: options.dateFormat,
        commenceTimeFrom: options.commenceTimeFrom,
        commenceTimeTo: options.commenceTimeTo,
      }
    );
  }

  /** Final and live scores. */
  scores(
    sportKey: string,
    options: { daysFrom?: number; dateFormat?: "iso" | "unix" } = {}
  ): Promise<JsonRecord[]> {
    return this.request(
      this.sportPath(sportKey, "scores", { sandbox: true, v4: true }),
      { daysFrom: options.daysFrom, dateFormat: options.dateFormat }
    );
  }

  /* ---------------- historical ---------------- */

  /**
   * Historical odds snapshot for an ISO-8601 date. Closing-line history
   * goes back to 2005 for game lines.
   */
  historicalOdds(
    sportKey: string,
    date: string,
    options: HistoricalOddsOptions = {}
  ): Promise<JsonRecord[] | JsonRecord> {
    const params: Params = {
      date,
      regions: options.regions ?? "us",
      markets: options.markets ?? "h2h",
      oddsFormat: options.oddsFormat ?? "american",
    };
    if (this.toaCompat) {
      return this.request(`/v4/historical/sports/${sportKey}/odds`, params);
    }
    return this.request(`/v1/historical/sports/${sportKey}/odds`, params);
  }

  /**
   * Historical closing odds (game lines from 2005, props since 2022).
   * Filter by season, date range, bookmakers, or player.
   */
  closingOdds(
    sportKey: string,
    options: ClosingOddsOptions = {}
  ): Promise<JsonRecord[] | JsonRecord> {
    return this.request(`/v1/historical/sports/${sportKey}/closing-odds`, {
      markets: options.markets,
      bookmakers: options.bookmakers,
      season: options.season,
      date: options.date,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      player: options.player,
      oddsFormat: options.oddsFormat,
    });
  }

  /* ---------------- ParlayAPI extensions ---------------- */

  /**
   * Player prop snapshots across sources. Each row carries one
   * (book, player, market, line) combination with over/under prices
   * when paired. DFS pick'em props ship with line set even when
   * prices are null.
   */
  async props(sportKey: string, options: PropsOptions = {}): Promise<PropRow[]> {
    const raw = await this.request<PropRow[] | { props?: PropRow[] }>(
      this.sportPath(sportKey, "props", { sandbox: true }),
      {
        markets: options.markets,
        bookmakers: options.bookmakers,
        player: options.player,
        eventId: options.eventId,
        oddsFormat: options.oddsFormat,
        dfsOdds: options.dfsOdds,
        limit: options.limit,
        offset: options.offset,
      }
    );
    // Some surfaces wrap the rows as { sport_key, count, props: [...] }.
    if (raw && !Array.isArray(raw) && Array.isArray(raw.props)) {
      return raw.props;
    }
    return raw as PropRow[];
  }

  /** Available prop market keys for a sport, with per-book coverage. */
  propMarkets(sportKey: string): Promise<JsonRecord[]> {
    return this.request(`/v1/sports/${sportKey}/props/markets`);
  }

  /** Futures and outright markets grouped by competition. */
  futures(sportKey: string): Promise<JsonRecord> {
    return this.request(this.sportPath(sportKey, "futures", { sandbox: true }));
  }

  /**
   * Prediction-market prices (Kalshi, Polymarket) mapped onto the same
   * sport keys as the sportsbook endpoints.
   */
  predictionMarkets(
    sportKey: string,
    options: PredictionMarketsOptions = {}
  ): Promise<JsonRecord | JsonRecord[]> {
    return this.request(`/v1/prediction-markets/${sportKey}`, {
      sources: options.sources,
    });
  }

  /** Free-text search across prediction-market event markets. */
  searchPredictionMarkets(
    query: string,
    options: PredictionMarketSearchOptions = {}
  ): Promise<JsonRecord | JsonRecord[]> {
    return this.request("/v1/prediction-markets/search", {
      q: query,
      sources: options.sources,
      limit: options.limit,
      min_volume: options.minVolume,
      sort: options.sort,
      include_closed: options.includeClosed,
    });
  }

  /* ---------------- value hunting ---------------- */

  /**
   * Guaranteed-profit arbitrage opportunities across books, including
   * 3-way (home/draw/away) soccer markets. minProfit is a percent.
   */
  arbitrage(
    sportKey: string,
    options: ArbitrageOptions = {}
  ): Promise<JsonRecord[] | JsonRecord> {
    const params: Params = { minProfit: options.minProfit ?? 0 };
    if (options.excludeExchanges) params.exclude_exchanges = true;
    if (options.markets) params.markets = options.markets;
    if (options.limit) params.limit = options.limit;
    return this.request(
      this.sportPath(sportKey, "arbitrage", { sandbox: true }),
      params
    );
  }

  /**
   * Positive-EV bets vs a sharp book's no-vig fair line (default
   * Pinnacle). minEdge is a percent, e.g. 3 for 3%.
   */
  ev(
    sportKey: string,
    options: EvOptions = {}
  ): Promise<JsonRecord[] | JsonRecord> {
    const params: Params = {
      sharpBook: options.sharpBook ?? "pinnacle",
      minEdge: options.minEdge ?? 2.0,
    };
    if (options.markets) params.markets = options.markets;
    if (options.limit) params.limit = options.limit;
    return this.request(this.sportPath(sportKey, "ev", { sandbox: true }), params);
  }

  /**
   * Consensus (average / best / worst) odds across all books, a sharp
   * baseline per (event, market, player, line).
   */
  consensus(
    sportKey: string,
    options: { markets?: string | ReadonlyArray<string> } = {}
  ): Promise<JsonRecord[] | JsonRecord> {
    return this.request(
      this.sportPath(sportKey, "consensus", { sandbox: true }),
      { markets: options.markets }
    );
  }

  /**
   * Cross-book middles: Over at a low line on one book, Under at a
   * higher line on another, with the window and per-$100 economics.
   */
  middles(
    sportKey: string,
    options: MiddlesOptions = {}
  ): Promise<JsonRecord> {
    return this.request(`/v1/sports/${sportKey}/middles`, {
      min_gap: options.minGap ?? 1.0,
      include_props: options.includeProps ?? true,
      markets: options.markets,
    });
  }

  /* ---------------- decision layer ---------------- */

  /**
   * Grade one bet in a single call: no-vig fair price, best bettable
   * book, your-price EV, optional Kelly stake, line movement, and a
   * BET / LEAN / FAIR / PASS call. Costs 5 credits.
   */
  verdict(options: VerdictOptions): Promise<JsonRecord> {
    return this.request("/v1/verdict", {
      sport: options.sport,
      side: options.side,
      market: options.market ?? "h2h",
      home: options.home,
      away: options.away,
      event: options.event,
      team: options.team,
      player: options.player,
      line: options.line,
      book: options.book,
      price: options.price,
      region: options.region,
      books: options.books,
      bankroll: options.bankroll,
      kelly: options.kelly ?? 0.5,
      sharpBook: options.sharpBook ?? "pinnacle",
    });
  }

  /**
   * Grade a 2 to 12 leg parlay in one call: combined no-vig fair price,
   * the single best book for the slip, EV, weakest leg, and same-game
   * correlation warnings. Costs 10 credits.
   */
  parlayVerdict(
    legs: ReadonlyArray<ParlayVerdictLeg>,
    options: ParlayVerdictOptions = {}
  ): Promise<JsonRecord> {
    const body: JsonRecord = { legs: [...legs] };
    if (options.region) body.region = options.region;
    if (options.books) {
      body.books = Array.isArray(options.books)
        ? options.books.join(",")
        : options.books;
    }
    if (options.book) body.book = options.book;
    if (options.stake !== undefined) body.stake = options.stake;
    if (options.bankroll !== undefined) body.bankroll = options.bankroll;
    if (options.kelly !== undefined) body.kelly = options.kelly;
    if (options.sharpBook) body.sharpBook = options.sharpBook;
    return this.request("/v1/parlay/verdict", undefined, "POST", body);
  }

  /**
   * The +EV bets worth making right now, ranked and scoped to books
   * you can bet at, plus edge alerts. Costs 10 credits.
   */
  bestBets(
    sportKey: string,
    options: BestBetsOptions = {}
  ): Promise<JsonRecord> {
    return this.request(`/v1/sports/${sportKey}/best-bets`, {
      region: options.region,
      books: options.books,
      limit: options.limit ?? 20,
      min_edge: options.minEdge ?? 2.0,
      min_books: options.minBooks ?? 4,
      markets: options.markets,
    });
  }

  /**
   * Remember which books/region you can bet at so verdict and bestBets
   * scope recommendations without repeating it every call. No credits.
   */
  setBettableBooks(options: {
    region?: string;
    books?: string | ReadonlyArray<string>;
  }): Promise<JsonRecord> {
    return this.request(
      "/v1/verdict/prefs",
      { region: options.region, books: options.books },
      "POST"
    );
  }

  /** Return your saved book/region preference. No credits. */
  bettableBooks(): Promise<JsonRecord> {
    return this.request("/v1/verdict/prefs");
  }

  /** Current API key usage: tier, credits used/remaining/total. */
  usage(): Promise<JsonRecord> {
    return this.request("/v1/usage");
  }

  /* ---------------- streaming (Business tier and above) ---------------- */

  /**
   * Build the WebSocket URL for a sport's live odds stream. Connect with
   * any standard WS client. On connect the server sends the full current
   * snapshot, then pushes frames as prices change.
   *
   * WebSocket and SSE streaming require Business tier or above.
   */
  websocketUrl(sportKey: string): string {
    const scheme = this.baseUrl.startsWith("https") ? "wss" : "ws";
    const host = this.baseUrl.split("://", 2)[1];
    const key = this.apiKey ? `?apiKey=${encodeURIComponent(this.apiKey)}` : "";
    return `${scheme}://${host}/ws/odds/${sportKey}${key}`;
  }

  /**
   * Async iterator over live odds updates via WebSocket. Requires
   * Business tier or above, and a runtime with a global WebSocket
   * (browsers, Node 22+, or pass one via options.webSocket).
   *
   *   for await (const frame of client.streamOdds("basketball_nba")) {
   *     console.log(frame);
   *   }
   */
  async *streamOdds(
    sportKey: string,
    options: {
      eventId?: string;
      webSocket?: new (url: string) => WebSocket;
    } = {}
  ): AsyncGenerator<JsonRecord, void, unknown> {
    const WS =
      options.webSocket ??
      (typeof globalThis !== "undefined" &&
      (globalThis as { WebSocket?: new (url: string) => WebSocket }).WebSocket
        ? (globalThis as unknown as { WebSocket: new (url: string) => WebSocket })
            .WebSocket
        : undefined);
    if (!WS) {
      throw new ParlayAPIError(
        "no global WebSocket found: use a browser, Node 22+, or pass options.webSocket"
      );
    }
    const ws = new WS(this.websocketUrl(sportKey));
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new ParlayAPIError("websocket connect failed"));
    });
    if (options.eventId) {
      ws.send(JSON.stringify({ type: "subscribe", event_id: options.eventId }));
    }
    const queue: JsonRecord[] = [];
    let notify: (() => void) | null = null;
    let done = false;
    ws.onmessage = (event: MessageEvent) => {
      const data =
        typeof event.data === "string" ? event.data : String(event.data);
      try {
        queue.push(JSON.parse(data) as JsonRecord);
      } catch {
        queue.push({ raw: data });
      }
      if (notify) {
        const n = notify;
        notify = null;
        n();
      }
    };
    const finish = () => {
      done = true;
      if (notify) {
        const n = notify;
        notify = null;
        n();
      }
    };
    ws.onclose = finish;
    ws.onerror = finish;
    try {
      while (!done || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
          continue;
        }
        while (queue.length > 0) {
          yield queue.shift() as JsonRecord;
        }
      }
    } finally {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }

  /* ---------------- math helpers as statics (Python SDK parity) ------- */

  static americanToImplied = americanToImplied;
  static americanToDecimal = americanToDecimal;
  static decimalToAmerican = decimalToAmerican;
  static impliedToAmerican = impliedToAmerican;
  static devig = devig;
  static edge = edge;
  static kellyStake = kellyStake;
}

/* ------------------------------------------------------------------ */
/* Internals                                                          */
/* ------------------------------------------------------------------ */

function headerInt(response: Response, name: string): number | null {
  const raw = response.headers.get(name);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function throwForStatus(status: number, message: string): never {
  const msg = message || `HTTP ${status}`;
  if (status === 401) throw new InvalidAPIKeyError(msg);
  if (status === 403) {
    const lower = msg.toLowerCase();
    if (lower.includes("credit") || lower.includes("limit")) {
      throw new CreditLimitExceededError(msg);
    }
    throw new TierGatedError(msg);
  }
  if (status === 429) throw new RateLimitedError(msg);
  throw new ParlayAPIError(`HTTP ${status}: ${msg}`, status);
}

/** Drop-in alias for the-odds-api migrations. */
export { ParlayAPI as OddsAPI };

export default ParlayAPI;
