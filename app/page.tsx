'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import world from 'world-atlas/countries-110m.json';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology, Objects } from 'topojson-specification';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bolt,
  Building2,
  CircleDollarSign,
  Factory,
  Globe2,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Row = Record<string, string | number | null> & {
  source_row_id: string;
  country: string;
  total_energy_consumption_exajoules: number;
  household_price_usd_per_kwh: number | null;
  business_price_usd_per_kwh: number | null;
  total_energy_domestic_production_ej: number;
  total_energy_gross_imports_ej: number;
  total_energy_gross_exports_ej: number;
  total_energy_net_imports_ej: number;
  negative_gross_exports_ej: number;
  electricity_fossil_pct: number;
  electricity_non_fossil_pct: number;
  primary_energy_fossil_pct: number;
  primary_energy_non_fossil_pct: number;
  trade_status: 'Net importer' | 'Net exporter' | 'Balanced';
};

const numericColumns = new Set([
  'total_energy_consumption_exajoules',
  'household_price_usd_per_kwh',
  'business_price_usd_per_kwh',
  'electricity_generation_solar_pct',
  'electricity_generation_wind_pct',
  'electricity_generation_oil_and_other_fossil_pct',
  'electricity_generation_gas_pct',
  'electricity_generation_coal_pct',
  'electricity_generation_hydro_pct',
  'electricity_generation_other_pct',
  'primary_energy_consumption_solar_pct',
  'primary_energy_consumption_wind_pct',
  'primary_energy_consumption_oil_pct',
  'primary_energy_consumption_gas_pct',
  'primary_energy_consumption_coal_pct',
  'primary_energy_consumption_hydro_pct',
  'primary_energy_consumption_other_pct',
  'total_energy_domestic_production_ej',
  'total_energy_gross_imports_ej',
  'total_energy_gross_exports_ej',
  'total_energy_net_imports_ej',
]);

function parseCsv(csv: string): Row[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    const row = Object.fromEntries(
      headers.map((key, index) => [
        key,
        numericColumns.has(key)
          ? values[index] === ''
            ? null
            : Number(values[index])
          : values[index],
      ]),
    ) as Row;
    row.electricity_fossil_pct =
      Number(row.electricity_generation_oil_and_other_fossil_pct) +
      Number(row.electricity_generation_gas_pct) +
      Number(row.electricity_generation_coal_pct);
    row.electricity_non_fossil_pct = 100 - row.electricity_fossil_pct;
    row.primary_energy_fossil_pct =
      Number(row.primary_energy_consumption_oil_pct) +
      Number(row.primary_energy_consumption_gas_pct) +
      Number(row.primary_energy_consumption_coal_pct);
    row.primary_energy_non_fossil_pct = 100 - row.primary_energy_fossil_pct;
    row.negative_gross_exports_ej = -row.total_energy_gross_exports_ej;
    row.trade_status =
      row.total_energy_net_imports_ej > 0
        ? 'Net importer'
        : row.total_energy_net_imports_ej < 0
          ? 'Net exporter'
          : 'Balanced';
    return row;
  });
}

const COLORS = {
  solar: '#f2c94c',
  wind: '#82c9e7',
  oil: '#6b7477',
  gas: '#ed9b52',
  coal: '#343b3d',
  hydro: '#245c85',
  other: '#63a978',
  household: '#286f9b',
  business: '#e28a43',
  production: '#163f52',
  imports: '#2b8c86',
  exports: '#c9514a',
};
const FLAGS: Record<string, string> = {
  China: '🇨🇳',
  'United States': '🇺🇸',
  India: '🇮🇳',
  Russia: '🇷🇺',
  Japan: '🇯🇵',
  Iran: '🇮🇷',
  Canada: '🇨🇦',
  'South Korea': '🇰🇷',
  'Saudi Arabia': '🇸🇦',
  Indonesia: '🇮🇩',
  Brazil: '🇧🇷',
  Germany: '🇩🇪',
  France: '🇫🇷',
  Mexico: '🇲🇽',
  'United Kingdom': '🇬🇧',
};
const COUNTRY_IDS: Record<string, string> = {
  '156': 'China',
  '840': 'United States',
  '356': 'India',
  '643': 'Russia',
  '392': 'Japan',
  '364': 'Iran',
  '124': 'Canada',
  '410': 'South Korea',
  '682': 'Saudi Arabia',
  '360': 'Indonesia',
  '076': 'Brazil',
  '276': 'Germany',
  '250': 'France',
  '484': 'Mexico',
  '826': 'United Kingdom',
};
const money = (value: number | null) =>
  value == null ? 'n.a.' : `$${value.toFixed(3)}`;
const pct = (value: number | undefined) =>
  value == null ? 'n.a.' : `${value.toFixed(1)}%`;
const flag = (country: string) => FLAGS[country] ?? '🌐';

function ChartHeader({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <p className="chart-note">{note}</p>
    </div>
  );
}

function MixLegend() {
  const items = [
    ['Solar', COLORS.solar],
    ['Wind', COLORS.wind],
    ['Oil / fossil', COLORS.oil],
    ['Gas', COLORS.gas],
    ['Coal', COLORS.coal],
    ['Hydro', COLORS.hydro],
    ['Other / non-fossil', COLORS.other],
  ];
  return (
    <div className="source-legend">
      {items.map(([label, color]) => (
        <span key={label}>
          <i style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

const metricConfig = {
  consumption: {
    label: 'Energy consumption',
    field: 'total_energy_consumption_exajoules',
    unit: 'EJ',
    decimals: 2,
  },
  household: {
    label: 'Household electricity price',
    field: 'household_price_usd_per_kwh',
    unit: 'USD/kWh',
    decimals: 3,
  },
  fossil: {
    label: 'Electricity fossil share',
    field: 'electricity_fossil_pct',
    unit: '%',
    decimals: 1,
  },
  trade: {
    label: 'Net energy imports',
    field: 'total_energy_net_imports_ej',
    unit: 'EJ',
    decimals: 2,
  },
} as const;
type MetricKey = keyof typeof metricConfig;

function ComparisonPanel({ rows }: { rows: Row[] }) {
  const [countryA, setCountryA] = useState('Mexico');
  const [countryB, setCountryB] = useState('United States');
  const [metric, setMetric] = useState<MetricKey>('consumption');
  const a = rows.find((r) => r.country === countryA);
  const b = rows.find((r) => r.country === countryB);
  const config = metricConfig[metric];
  const value = (row?: Row) =>
    row ? (row[config.field] as number | null) : null;
  const av = value(a);
  const bv = value(b);
  const scale = Math.max(Math.abs(av ?? 0), Math.abs(bv ?? 0), 0.001);
  const format = (v: number | null) =>
    v == null ? 'n.a.' : `${v.toFixed(config.decimals)} ${config.unit}`;
  return (
    <section
      className="explorer-panel"
      aria-label="Country comparison controls"
    >
      <div className="explorer-heading">
        <div>
          <p className="eyebrow">Explore the data</p>
          <h2>Compare two markets</h2>
        </div>
        <p>
          Choose countries and a metric. Every value stays linked to its source
          row.
        </p>
      </div>
      <div className="control-grid">
        <label>
          <span>Country A</span>
          <Select value={countryA} onValueChange={(v) => v && setCountryA(v)}>
            <SelectTrigger className="dashboard-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.country} value={r.country}>
                  {flag(r.country)} {r.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label>
          <span>Country B</span>
          <Select value={countryB} onValueChange={(v) => v && setCountryB(v)}>
            <SelectTrigger className="dashboard-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.country} value={r.country}>
                  {flag(r.country)} {r.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label>
          <span>Metric</span>
          <Select
            value={metric}
            onValueChange={(v) => v && setMetric(v as MetricKey)}
          >
            <SelectTrigger className="dashboard-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(metricConfig).map(([key, item]) => (
                <SelectItem key={key} value={key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="comparison-result">
        {[
          { row: a, value: av, color: '#176b69' },
          { row: b, value: bv, color: '#ed9b52' },
        ].map((item) => (
          <div className="comparison-row" key={item.color}>
            <span className="compare-country">
              {item.row ? flag(item.row.country) : ''} {item.row?.country}
            </span>
            <div className="comparison-track">
              <i
                style={{
                  width: `${Math.max(4, (Math.abs(item.value ?? 0) / scale) * 100)}%`,
                  background: item.color,
                }}
              />
            </div>
            <strong>{format(item.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsumptionMap({ rows }: { rows: Row[] }) {
  const topology = world as unknown as Topology<Objects<Geometry>>;
  const countries = feature(
    topology,
    topology.objects.countries,
  ) as unknown as FeatureCollection<Geometry>;
  const projection = geoNaturalEarth1().fitSize([960, 500], countries);
  const path = geoPath(projection);
  const byCountry = new Map(rows.map((r) => [r.country, r]));
  const max = Math.max(
    ...rows.map((r) => r.total_energy_consumption_exajoules),
    1,
  );
  const fill = (v: number) =>
    `rgba(23,107,105,${0.28 + Math.sqrt(v / max) * 0.72})`;
  return (
    <section className="chart-card map-card">
      <ChartHeader
        eyebrow="Geographic view"
        title="Energy consumption across markets"
        note="Total energy consumption · EJ · 2024"
      />
      <div className="map-layout">
        <div className="map-wrap">
          <svg
            viewBox="0 0 960 500"
            role="img"
            aria-label="World map showing total energy consumption for 15 countries"
          >
            {countries.features.map((f, index) => {
              const id = String(f.id).padStart(3, '0');
              const name = COUNTRY_IDS[id];
              const row = name ? byCountry.get(name) : undefined;
              return (
                <path
                  key={`${id}-${index}`}
                  d={path(f) ?? ''}
                  fill={
                    row
                      ? fill(row.total_energy_consumption_exajoules)
                      : '#dfe8e5'
                  }
                  stroke="#f7faf8"
                  strokeWidth={0.8}
                  className={row ? 'mapped-country' : ''}
                >
                  <title>
                    {row
                      ? `${flag(row.country)} ${row.country}: ${row.total_energy_consumption_exajoules.toFixed(2)} EJ`
                      : 'Country not in dataset'}
                  </title>
                </path>
              );
            })}
          </svg>
          <div className="map-scale">
            <span>Lower</span>
            <i />
            <span>Higher consumption</span>
          </div>
        </div>
        <ol className="map-ranking">
          {[...rows]
            .sort(
              (a, b) =>
                b.total_energy_consumption_exajoules -
                a.total_energy_consumption_exajoules,
            )
            .slice(0, 6)
            .map((r, i) => (
              <li key={r.country}>
                <span>{i + 1}</span>
                <b>
                  {flag(r.country)} {r.country}
                </b>
                <em>{r.total_energy_consumption_exajoules.toFixed(2)} EJ</em>
              </li>
            ))}
        </ol>
      </div>
    </section>
  );
}

function MexicoProfile({ row, allRows }: { row?: Row; allRows: Row[] }) {
  if (!row) return <div className="empty-state">Mexico data is loading…</div>;
  const rank =
    [...allRows]
      .sort(
        (a, b) =>
          b.total_energy_consumption_exajoules -
          a.total_energy_consumption_exajoules,
      )
      .findIndex((r) => r.country === 'Mexico') + 1;
  const powerMix = [
    {
      name: 'Solar',
      value: Number(row.electricity_generation_solar_pct),
      fill: COLORS.solar,
    },
    {
      name: 'Wind',
      value: Number(row.electricity_generation_wind_pct),
      fill: COLORS.wind,
    },
    {
      name: 'Oil & fossil',
      value: Number(row.electricity_generation_oil_and_other_fossil_pct),
      fill: COLORS.oil,
    },
    {
      name: 'Gas',
      value: Number(row.electricity_generation_gas_pct),
      fill: COLORS.gas,
    },
    {
      name: 'Coal',
      value: Number(row.electricity_generation_coal_pct),
      fill: COLORS.coal,
    },
    {
      name: 'Hydro',
      value: Number(row.electricity_generation_hydro_pct),
      fill: COLORS.hydro,
    },
    {
      name: 'Other',
      value: Number(row.electricity_generation_other_pct),
      fill: COLORS.other,
    },
  ];
  return (
    <section className="mexico-view">
      <div className="country-title">
        <span>🇲🇽</span>
        <div>
          <p className="eyebrow">Country profile · Mexico</p>
          <h2>Mexico energy snapshot</h2>
          <p>
            A focused view of scale, affordability, generation mix and trade
            position.
          </p>
        </div>
      </div>
      <div className="mexico-kpis">
        <article>
          <small>Consumption rank</small>
          <strong>#{rank} of 15</strong>
          <span>
            {row.total_energy_consumption_exajoules.toFixed(2)} EJ · 2024
          </span>
        </article>
        <article>
          <small>Household price</small>
          <strong>{money(row.household_price_usd_per_kwh)}</strong>
          <span>per kWh · Dec 2025</span>
        </article>
        <article>
          <small>Business price</small>
          <strong>{money(row.business_price_usd_per_kwh)}</strong>
          <span>per kWh · Dec 2025</span>
        </article>
        <article>
          <small>Trade position</small>
          <strong>{row.trade_status}</strong>
          <span>{row.total_energy_net_imports_ej.toFixed(2)} EJ · 2023</span>
        </article>
      </div>
      <div className="mexico-grid">
        <section className="chart-card compact">
          <ChartHeader
            eyebrow="Electricity generation"
            title="Mexico power mix"
            note="2024"
          />
          <MixLegend />
          <div className="mexico-mix-bar">
            {powerMix.map((item) => (
              <i
                key={item.name}
                style={{ width: `${item.value}%`, background: item.fill }}
                title={`${item.name}: ${item.value.toFixed(2)}%`}
              />
            ))}
          </div>
          <div className="mexico-mix-list">
            {powerMix.map((item) => (
              <span key={item.name}>
                <i style={{ background: item.fill }} />
                {item.name}
                <b>{item.value.toFixed(1)}%</b>
              </span>
            ))}
          </div>
        </section>
        <section className="chart-card compact">
          <ChartHeader
            eyebrow="Production & trade"
            title="Mexico energy flows"
            note="EJ · 2023"
          />
          <div className="chart-wrap mexico-flow">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={[
                  {
                    name: 'Mexico',
                    production: row.total_energy_domestic_production_ej,
                    imports: row.total_energy_gross_imports_ej,
                    exports: row.total_energy_gross_exports_ej,
                  },
                ]}
                margin={{ top: 18, right: 12, bottom: 8, left: 6 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#dbe4e7"
                  strokeDasharray="3 5"
                />
                <XAxis dataKey="name" hide />
                <YAxis
                  tick={{ fill: '#607074', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)} EJ`} />
                <Bar
                  dataKey="production"
                  name="Domestic production"
                  fill={COLORS.production}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="imports"
                  name="Gross imports"
                  fill={COLORS.imports}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="exports"
                  name="Gross exports"
                  fill={COLORS.exports}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="inline-legend">
            <span>
              <i style={{ background: COLORS.production }} />
              Production
            </span>
            <span>
              <i style={{ background: COLORS.imports }} />
              Imports
            </span>
            <span>
              <i style={{ background: COLORS.exports }} />
              Exports
            </span>
          </div>
        </section>
      </div>
      <p className="source-trace">
        Source link: <code>{row.source_row_id}</code>
      </p>
    </section>
  );
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    fetch('/energy-data-chart-ready.csv')
      .then((r) => r.text())
      .then((csv) => setRows(parseCsv(csv)));
  }, []);
  const insights = useMemo(() => {
    if (!rows.length) return null;
    const priced = rows.filter((r) => r.household_price_usd_per_kwh != null);
    const business = rows.filter((r) => r.business_price_usd_per_kwh != null);
    return {
      consumer: [...rows].sort(
        (a, b) =>
          b.total_energy_consumption_exajoules -
          a.total_energy_consumption_exajoules,
      )[0],
      highPrice: [...priced].sort(
        (a, b) =>
          b.household_price_usd_per_kwh! - a.household_price_usd_per_kwh!,
      )[0],
      lowPrice: [...priced].sort(
        (a, b) =>
          a.household_price_usd_per_kwh! - b.household_price_usd_per_kwh!,
      )[0],
      highBusiness: [...business].sort(
        (a, b) => b.business_price_usd_per_kwh! - a.business_price_usd_per_kwh!,
      )[0],
      importer: [...rows].sort(
        (a, b) => b.total_energy_net_imports_ej - a.total_energy_net_imports_ej,
      )[0],
      exporter: [...rows].sort(
        (a, b) => a.total_energy_net_imports_ej - b.total_energy_net_imports_ej,
      )[0],
      fossil: [...rows].sort(
        (a, b) => b.electricity_fossil_pct - a.electricity_fossil_pct,
      )[0],
      nonFossil: [...rows].sort(
        (a, b) => b.electricity_non_fossil_pct - a.electricity_non_fossil_pct,
      )[0],
    };
  }, [rows]);
  const consumption = [...rows].sort(
    (a, b) =>
      b.total_energy_consumption_exajoules -
      a.total_energy_consumption_exajoules,
  );
  const prices = [...rows].sort(
    (a, b) =>
      (b.household_price_usd_per_kwh ?? -1) -
      (a.household_price_usd_per_kwh ?? -1),
  );
  const electricMix = [...rows].sort(
    (a, b) => b.electricity_fossil_pct - a.electricity_fossil_pct,
  );
  const primaryMix = [...rows].sort(
    (a, b) => b.primary_energy_fossil_pct - a.primary_energy_fossil_pct,
  );
  const flows = [...rows].sort(
    (a, b) =>
      b.total_energy_domestic_production_ej -
      a.total_energy_domestic_production_ej,
  );
  const scatter = rows
    .filter((r) => r.household_price_usd_per_kwh != null)
    .map((r) => ({
      country: r.country,
      consumption: r.total_energy_consumption_exajoules,
      price: r.household_price_usd_per_kwh,
    }));
  const cards = insights
    ? ([
        [
          'Largest consumer',
          insights.consumer.country,
          `${insights.consumer.total_energy_consumption_exajoules.toFixed(0)} EJ`,
          Bolt,
        ],
        [
          'Highest household price',
          insights.highPrice.country,
          `${money(insights.highPrice.household_price_usd_per_kwh)}/kWh`,
          CircleDollarSign,
        ],
        [
          'Lowest household price',
          insights.lowPrice.country,
          `${money(insights.lowPrice.household_price_usd_per_kwh)}/kWh`,
          CircleDollarSign,
        ],
        [
          'Highest business price',
          insights.highBusiness.country,
          `${money(insights.highBusiness.business_price_usd_per_kwh)}/kWh`,
          Building2,
        ],
        [
          'Largest net importer',
          insights.importer.country,
          `+${insights.importer.total_energy_net_imports_ej.toFixed(1)} EJ`,
          ArrowDownToLine,
        ],
        [
          'Largest net exporter',
          insights.exporter.country,
          `${Math.abs(insights.exporter.total_energy_net_imports_ej).toFixed(1)} EJ`,
          ArrowUpFromLine,
        ],
        [
          'Highest fossil share',
          insights.fossil.country,
          pct(insights.fossil.electricity_fossil_pct),
          Factory,
        ],
        [
          'Highest non-fossil share',
          insights.nonFossil.country,
          pct(insights.nonFossil.electricity_non_fossil_pct),
          Leaf,
        ],
      ] as const)
    : [];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#overview">
          <span className="brand-mark">E</span>
          <span>Global Energy Atlas</span>
        </a>
        <nav aria-label="Dashboard sections">
          <a href="#overview">Overview</a>
          <a href="#map">Map</a>
          <a href="#mix">Energy mix</a>
          <a href="#methods">Methods</a>
        </nav>
        <span className="scope-pill">15 markets</span>
      </header>
      <section className="hero" id="overview">
        <div>
          <p className="eyebrow">Executive intelligence · 2023–2025</p>
          <h1>How the world’s largest energy markets compare</h1>
          <p className="lede">
            A decision tool for energy strategists, policy teams and market
            analysts comparing consumption, prices, power mix and international
            flows.
          </p>
          <div className="problem-statement">
            <Globe2 size={18} />
            <p>
              <strong>The problem:</strong> energy measures are often reported
              in separate periods and units, making cross-market comparison slow
              and error-prone. This dashboard aligns them in one traceable view.
            </p>
          </div>
        </div>
        <div className="periods">
          <div>
            <span>2024</span>Consumption &amp; mix
          </div>
          <div>
            <span>Dec 2025</span>Electricity prices
          </div>
          <div>
            <span>2023</span>Production &amp; trade
          </div>
        </div>
      </section>

      <Tabs defaultValue="global" className="dashboard-tabs">
        <TabsList variant="line" className="view-tabs">
          <TabsTrigger value="global">
            <BarChart3 />
            Global dashboard
          </TabsTrigger>
          <TabsTrigger value="mexico">🇲🇽 Mexico profile</TabsTrigger>
        </TabsList>
        <TabsContent value="global">
          <section className="kpi-grid">
            {cards.map(([label, value, detail, Icon]) => (
              <article className="kpi-card" key={label}>
                <div className="kpi-icon">
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <p>{label}</p>
                <strong>
                  {flag(value)} {value}
                </strong>
                <span>{detail}</span>
              </article>
            ))}
          </section>
          <div className="dashboard-stack">
            <ComparisonPanel rows={rows} />
            <div id="map">
              <ConsumptionMap rows={rows} />
            </div>
            <section className="chart-card" id="prices">
              <ChartHeader
                eyebrow="Scale versus cost"
                title="Energy use and household electricity price"
                note="Consumption 2024 · Prices Dec 2025"
              />
              <div className="chart-wrap tall">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <ComposedChart
                    data={consumption}
                    margin={{ top: 16, right: 28, bottom: 58, left: 4 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#dbe4e7"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="country"
                      angle={-38}
                      textAnchor="end"
                      interval={0}
                      height={74}
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 0.5]}
                      tickFormatter={(v) => `$${v.toFixed(1)}`}
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v, n) => [
                        n === 'Consumption'
                          ? `${Number(v).toFixed(2)} EJ`
                          : `$${Number(v).toFixed(3)}/kWh`,
                        n,
                      ]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="total_energy_consumption_exajoules"
                      name="Consumption"
                      fill={COLORS.production}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={34}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="household_price_usd_per_kwh"
                      name="Household price"
                      stroke={COLORS.business}
                      strokeWidth={2.5}
                      dot={{ fill: COLORS.business, r: 3, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="inline-legend">
                <span>
                  <i style={{ background: COLORS.production }} />
                  Consumption (EJ)
                </span>
                <span>
                  <i style={{ background: COLORS.business }} />
                  Household price (USD/kWh)
                </span>
              </div>
            </section>
            <section className="chart-card">
              <ChartHeader
                eyebrow="Price benchmark"
                title="Household versus business electricity prices"
                note="USD per kWh · Dec 2025"
              />
              <div className="chart-wrap price-bars">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={prices}
                    layout="vertical"
                    margin={{ top: 8, right: 22, bottom: 18, left: 78 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke="#dbe4e7"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `$${v.toFixed(1)}`}
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="country"
                      width={94}
                      tick={{ fill: '#31464b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) =>
                        `${money(v == null ? null : Number(v))}/kWh`
                      }
                    />
                    <Bar
                      dataKey="household_price_usd_per_kwh"
                      name="Household"
                      fill={COLORS.household}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={10}
                    />
                    <Bar
                      dataKey="business_price_usd_per_kwh"
                      name="Business"
                      fill={COLORS.business}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="inline-legend">
                <span>
                  <i style={{ background: COLORS.household }} />
                  Household
                </span>
                <span>
                  <i style={{ background: COLORS.business }} />
                  Business
                </span>
                <em>Iran: n.a.</em>
              </div>
            </section>
            <section id="mix">
              <div className="chapter-heading">
                <p className="eyebrow">Composition</p>
                <h2>What powers each economy</h2>
                <p>
                  Both views use the same source colors and rank countries by
                  fossil share.
                </p>
              </div>
              <div className="analysis-grid">
                <section className="chart-card compact">
                  <ChartHeader
                    eyebrow="Electricity generation"
                    title="Power mix"
                    note="Share of generation · 2024"
                  />
                  <MixLegend />
                  <div className="chart-wrap mix-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                    >
                      <BarChart
                        data={electricMix}
                        layout="vertical"
                        stackOffset="expand"
                        margin={{ top: 6, right: 18, bottom: 10, left: 75 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `${Math.round(v * 100)}%`}
                          domain={[0, 1]}
                          tick={{ fill: '#607074', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="country"
                          width={92}
                          tick={{ fill: '#31464b', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => `${Number(v).toFixed(2)}%`}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_solar_pct"
                          name="Solar"
                          fill={COLORS.solar}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_wind_pct"
                          name="Wind"
                          fill={COLORS.wind}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_oil_and_other_fossil_pct"
                          name="Oil & other fossil"
                          fill={COLORS.oil}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_gas_pct"
                          name="Gas"
                          fill={COLORS.gas}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_coal_pct"
                          name="Coal"
                          fill={COLORS.coal}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_hydro_pct"
                          name="Hydro"
                          fill={COLORS.hydro}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="electricity_generation_other_pct"
                          name="Other / non-fossil"
                          fill={COLORS.other}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="chart-card compact">
                  <ChartHeader
                    eyebrow="Primary energy"
                    title="Consumption mix"
                    note="Share of consumption · 2024"
                  />
                  <MixLegend />
                  <div className="chart-wrap mix-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                    >
                      <BarChart
                        data={primaryMix}
                        layout="vertical"
                        stackOffset="expand"
                        margin={{ top: 6, right: 18, bottom: 10, left: 75 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `${Math.round(v * 100)}%`}
                          domain={[0, 1]}
                          tick={{ fill: '#607074', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="country"
                          width={92}
                          tick={{ fill: '#31464b', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => `${Number(v).toFixed(2)}%`}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_solar_pct"
                          name="Solar"
                          fill={COLORS.solar}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_wind_pct"
                          name="Wind"
                          fill={COLORS.wind}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_oil_pct"
                          name="Oil"
                          fill={COLORS.oil}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_gas_pct"
                          name="Gas"
                          fill={COLORS.gas}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_coal_pct"
                          name="Coal"
                          fill={COLORS.coal}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_hydro_pct"
                          name="Hydro"
                          fill={COLORS.hydro}
                        />
                        <Bar
                          stackId="mix"
                          dataKey="primary_energy_consumption_other_pct"
                          name="Other / non-fossil"
                          fill={COLORS.other}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            </section>
            <section className="chart-card" id="flows">
              <ChartHeader
                eyebrow="Supply position"
                title="Energy production and international flows"
                note="Exajoules · 2023"
              />
              <div className="chart-wrap flow-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={flows}
                    layout="vertical"
                    margin={{ top: 8, right: 22, bottom: 18, left: 78 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke="#dbe4e7"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="country"
                      width={94}
                      tick={{ fill: '#31464b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine x={0} stroke="#173138" strokeWidth={1.5} />
                    <Tooltip
                      formatter={(v, n) => [
                        `${Math.abs(Number(v)).toFixed(2)} EJ`,
                        n,
                      ]}
                    />
                    <Bar
                      dataKey="total_energy_domestic_production_ej"
                      name="Domestic production"
                      fill={COLORS.production}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={9}
                    />
                    <Bar
                      dataKey="total_energy_gross_imports_ej"
                      name="Gross imports"
                      fill={COLORS.imports}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={9}
                    />
                    <Bar
                      dataKey="negative_gross_exports_ej"
                      name="Gross exports"
                      fill={COLORS.exports}
                      radius={[4, 0, 0, 4]}
                      maxBarSize={9}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="inline-legend">
                <span>
                  <i style={{ background: COLORS.production }} />
                  Domestic production
                </span>
                <span>
                  <i style={{ background: COLORS.imports }} />
                  Imports
                </span>
                <span>
                  <i style={{ background: COLORS.exports }} />
                  Exports (shown negative)
                </span>
              </div>
            </section>
            <section className="chart-card">
              <ChartHeader
                eyebrow="Relationship"
                title="Price and consumption"
                note="Household price vs total energy use"
              />
              <div className="chart-wrap scatter-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <ScatterChart
                    margin={{ top: 32, right: 60, bottom: 32, left: 12 }}
                  >
                    <CartesianGrid stroke="#dbe4e7" strokeDasharray="3 5" />
                    <XAxis
                      type="number"
                      dataKey="consumption"
                      name="Consumption"
                      unit=" EJ"
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="price"
                      name="Household price"
                      unit=" USD/kWh"
                      domain={[0, 0.5]}
                      tickFormatter={(v) => `$${v.toFixed(1)}`}
                      tick={{ fill: '#607074', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ZAxis range={[56, 56]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 4' }}
                      formatter={(v, n) =>
                        n === 'Consumption'
                          ? `${Number(v).toFixed(2)} EJ`
                          : `$${Number(v).toFixed(3)}/kWh`
                      }
                    />
                    <Scatter data={scatter} fill={COLORS.household}>
                      <LabelList
                        dataKey="country"
                        position="top"
                        fontSize={10}
                        fill="#31464b"
                      />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="mexico">
          <div className="dashboard-stack">
            <MexicoProfile
              row={rows.find((r) => r.country === 'Mexico')}
              allRows={rows}
            />
          </div>
        </TabsContent>
      </Tabs>

      <section className="methodology" id="methods">
        <div className="method-title">
          <p className="eyebrow">Data notes</p>
          <h2>How to read—and not overread—this dashboard</h2>
          <p>
            Transparency about provenance, timing and limitations is part of the
            analysis.
          </p>
        </div>
        <div className="method-grid">
          <article>
            <span>01</span>
            <h3>Collection &amp; lineage</h3>
            <p>
              The dashboard reads the provided chart-ready CSV without altering
              it. Each record retains <code>source_row_id</code>, a permanent
              pointer to the corresponding row in the original{' '}
              <code>energy-data.csv</code>. Calculated fields are produced in
              the browser from those source values.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Sources, dates &amp; units</h3>
            <p>
              Source: the supplied 15-country energy dataset. Consumption and
              both energy mixes report 2024; household and business prices
              report December 2025; production and trade report 2023. Prices are
              USD/kWh, total-energy measures are exajoules, and shares use a
              0–100 percent scale.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Definitions</h3>
            <p>
              Fossil share is oil (or oil and other fossil), gas and coal
              combined. Non-fossil is 100 minus fossil share; it is
              intentionally not labeled “renewable” because Other may include
              nuclear. Net imports equal gross imports minus gross exports;
              negative values indicate a net exporter.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Missing data &amp; uncertainty</h3>
            <p>
              Iran’s household and business prices are unavailable and remain
              blank—not zero. Published percentages may carry rounding noise.
              Different reporting years mean charts should not be read as a
              single-period causal model.
            </p>
          </article>
          <article>
            <span>05</span>
            <h3>Bias &amp; limitations</h3>
            <p>
              The 15 selected countries emphasize large energy markets and are
              not globally exhaustive. National averages can hide regional,
              sectoral and tariff variation. Currency treatment, tax inclusion
              and national accounting methods may differ; the source file does
              not document those methodological details.
            </p>
          </article>
          <article>
            <span>06</span>
            <h3>Appropriate use</h3>
            <p>
              Use this dashboard for directional benchmarking, hypothesis
              formation and executive discussion. Confirm source-country
              definitions and newer releases before making investment,
              regulatory or operational decisions.
            </p>
          </article>
        </div>
        <div className="method-footer">
          <div>
            <span className="footer-mark">
              <ShieldCheck size={15} />
            </span>
            <strong>15 unique source records · Source preserved</strong>
          </div>
          <a href="/energy-data-chart-ready.csv" download>
            Download source CSV
          </a>
        </div>
      </section>
    </main>
  );
}
