'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { ArrowDownToLine, ArrowUpFromLine, Bolt, Building2, CircleDollarSign, Factory, Leaf, ShieldCheck } from 'lucide-react';

type Row = Record<string, string | number | null> & {
  source_row_id: string; country: string;
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
  household_business_price_difference_usd_per_kwh: number | null;
  household_business_price_difference_pct: number | null;
  trade_status: 'Net importer' | 'Net exporter' | 'Balanced';
};

const numericColumns = new Set([
  'total_energy_consumption_exajoules','household_price_usd_per_kwh','business_price_usd_per_kwh',
  'electricity_generation_solar_pct','electricity_generation_wind_pct','electricity_generation_oil_and_other_fossil_pct',
  'electricity_generation_gas_pct','electricity_generation_coal_pct','electricity_generation_hydro_pct','electricity_generation_other_pct',
  'primary_energy_consumption_solar_pct','primary_energy_consumption_wind_pct','primary_energy_consumption_oil_pct',
  'primary_energy_consumption_gas_pct','primary_energy_consumption_coal_pct','primary_energy_consumption_hydro_pct','primary_energy_consumption_other_pct',
  'total_energy_domestic_production_ej','total_energy_gross_imports_ej','total_energy_gross_exports_ej','total_energy_net_imports_ej',
]);

function parseCsv(csv: string): Row[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    const row = Object.fromEntries(headers.map((key, index) => [key, numericColumns.has(key) ? (values[index] === '' ? null : Number(values[index])) : values[index]])) as Row;
    row.electricity_fossil_pct = Number(row.electricity_generation_oil_and_other_fossil_pct) + Number(row.electricity_generation_gas_pct) + Number(row.electricity_generation_coal_pct);
    row.electricity_non_fossil_pct = 100 - row.electricity_fossil_pct;
    row.primary_energy_fossil_pct = Number(row.primary_energy_consumption_oil_pct) + Number(row.primary_energy_consumption_gas_pct) + Number(row.primary_energy_consumption_coal_pct);
    row.primary_energy_non_fossil_pct = 100 - row.primary_energy_fossil_pct;
    row.household_business_price_difference_usd_per_kwh = row.household_price_usd_per_kwh == null || row.business_price_usd_per_kwh == null ? null : row.household_price_usd_per_kwh - row.business_price_usd_per_kwh;
    row.household_business_price_difference_pct = row.household_business_price_difference_usd_per_kwh == null || !row.business_price_usd_per_kwh ? null : row.household_business_price_difference_usd_per_kwh / row.business_price_usd_per_kwh;
    row.negative_gross_exports_ej = -row.total_energy_gross_exports_ej;
    row.trade_status = row.total_energy_net_imports_ej > 0 ? 'Net importer' : row.total_energy_net_imports_ej < 0 ? 'Net exporter' : 'Balanced';
    return row;
  });
}

const COLORS = { solar:'#f2c94c', wind:'#82c9e7', oil:'#6b7477', gas:'#ed9b52', coal:'#343b3d', hydro:'#245c85', other:'#63a978', household:'#286f9b', business:'#e28a43', production:'#163f52', imports:'#2b8c86', exports:'#c9514a' };
const money = (value: number | null) => value == null ? 'n.a.' : `$${value.toFixed(3)}`;
const pct = (value: number | undefined) => value == null ? 'n.a.' : `${value.toFixed(1)}%`;

function ChartHeader({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><p className="chart-note">{note}</p></div>;
}

function MixLegend() {
  const items = [['Solar',COLORS.solar],['Wind',COLORS.wind],['Oil / fossil',COLORS.oil],['Gas',COLORS.gas],['Coal',COLORS.coal],['Hydro',COLORS.hydro],['Other / non-fossil',COLORS.other]];
  return <div className="source-legend">{items.map(([label,color]) => <span key={label}><i style={{background:color}} />{label}</span>)}</div>;
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch('/energy-data-chart-ready.csv').then((r) => r.text()).then((csv) => setRows(parseCsv(csv))); }, []);

  const insights = useMemo(() => {
    if (!rows.length) return null;
    const priced = rows.filter((r) => r.household_price_usd_per_kwh != null);
    const business = rows.filter((r) => r.business_price_usd_per_kwh != null);
    return {
      consumer:[...rows].sort((a,b)=>b.total_energy_consumption_exajoules-a.total_energy_consumption_exajoules)[0],
      highPrice:[...priced].sort((a,b)=>b.household_price_usd_per_kwh!-a.household_price_usd_per_kwh!)[0],
      lowPrice:[...priced].sort((a,b)=>a.household_price_usd_per_kwh!-b.household_price_usd_per_kwh!)[0],
      highBusiness:[...business].sort((a,b)=>b.business_price_usd_per_kwh!-a.business_price_usd_per_kwh!)[0],
      importer:[...rows].sort((a,b)=>b.total_energy_net_imports_ej-a.total_energy_net_imports_ej)[0],
      exporter:[...rows].sort((a,b)=>a.total_energy_net_imports_ej-b.total_energy_net_imports_ej)[0],
      fossil:[...rows].sort((a,b)=>b.electricity_fossil_pct-a.electricity_fossil_pct)[0],
      nonFossil:[...rows].sort((a,b)=>b.electricity_non_fossil_pct-a.electricity_non_fossil_pct)[0],
    };
  }, [rows]);

  const consumption = [...rows].sort((a,b)=>b.total_energy_consumption_exajoules-a.total_energy_consumption_exajoules);
  const prices = [...rows].sort((a,b)=>(b.household_price_usd_per_kwh ?? -1)-(a.household_price_usd_per_kwh ?? -1));
  const electricMix = [...rows].sort((a,b)=>b.electricity_fossil_pct-a.electricity_fossil_pct);
  const primaryMix = [...rows].sort((a,b)=>b.primary_energy_fossil_pct-a.primary_energy_fossil_pct);
  const flows = [...rows].sort((a,b)=>b.total_energy_domestic_production_ej-a.total_energy_domestic_production_ej);
  const scatter = rows.filter((r)=>r.household_price_usd_per_kwh != null).map((r)=>({ country:r.country, consumption:r.total_energy_consumption_exajoules, price:r.household_price_usd_per_kwh }));

  const cards = insights ? [
    ['Largest consumer',insights.consumer.country,`${insights.consumer.total_energy_consumption_exajoules.toFixed(0)} EJ`,Bolt],
    ['Highest household price',insights.highPrice.country,`${money(insights.highPrice.household_price_usd_per_kwh)}/kWh`,CircleDollarSign],
    ['Lowest household price',insights.lowPrice.country,`${money(insights.lowPrice.household_price_usd_per_kwh)}/kWh`,CircleDollarSign],
    ['Highest business price',insights.highBusiness.country,`${money(insights.highBusiness.business_price_usd_per_kwh)}/kWh`,Building2],
    ['Largest net importer',insights.importer.country,`+${insights.importer.total_energy_net_imports_ej.toFixed(1)} EJ`,ArrowDownToLine],
    ['Largest net exporter',insights.exporter.country,`${Math.abs(insights.exporter.total_energy_net_imports_ej).toFixed(1)} EJ`,ArrowUpFromLine],
    ['Highest fossil share',insights.fossil.country,pct(insights.fossil.electricity_fossil_pct),Factory],
    ['Highest non-fossil share',insights.nonFossil.country,pct(insights.nonFossil.electricity_non_fossil_pct),Leaf],
  ] as const : [];

  return <main>
    <header className="topbar">
      <a className="brand" href="#overview"><span className="brand-mark">E</span><span>Global Energy Atlas</span></a>
      <nav aria-label="Dashboard sections"><a href="#overview">Overview</a><a href="#prices">Prices</a><a href="#mix">Energy mix</a><a href="#flows">Trade flows</a></nav>
      <span className="scope-pill">15 markets</span>
    </header>

    <section className="hero" id="overview"><div><p className="eyebrow">Executive intelligence · 2023–2025</p><h1>How the world’s largest energy markets compare</h1><p className="lede">Consumption, prices, power mix and international flows—brought together in one decision-ready view.</p></div><div className="periods"><div><span>2024</span>Consumption &amp; mix</div><div><span>Dec 2025</span>Electricity prices</div><div><span>2023</span>Production &amp; trade</div></div></section>

    <section className="kpi-grid">{cards.map(([label,value,detail,Icon])=><article className="kpi-card" key={label}><div className="kpi-icon"><Icon size={16} strokeWidth={1.8}/></div><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>)}</section>

    <div className="dashboard-stack">
      <section className="chart-card" id="prices">
        <ChartHeader eyebrow="Scale versus cost" title="Energy use and household electricity price" note="Consumption 2024 · Prices Dec 2025" />
        <div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={consumption} margin={{top:16,right:28,bottom:58,left:4}}><CartesianGrid vertical={false} stroke="#dbe4e7" strokeDasharray="3 5"/><XAxis dataKey="country" angle={-38} textAnchor="end" interval={0} height={74} tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><YAxis yAxisId="left" tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><YAxis yAxisId="right" orientation="right" domain={[0,.5]} tickFormatter={(v)=>`$${v.toFixed(1)}`} tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip formatter={(value,name)=>[name==='Consumption'?`${Number(value).toFixed(2)} EJ`:`$${Number(value).toFixed(3)}/kWh`,name]}/><Bar yAxisId="left" dataKey="total_energy_consumption_exajoules" name="Consumption" fill={COLORS.production} radius={[4,4,0,0]} maxBarSize={34}/><Line yAxisId="right" dataKey="household_price_usd_per_kwh" name="Household price" stroke={COLORS.business} strokeWidth={2.5} dot={{fill:COLORS.business,r:3,strokeWidth:0}} connectNulls={false}/></ComposedChart></ResponsiveContainer></div>
        <div className="inline-legend"><span><i style={{background:COLORS.production}}/>Consumption (EJ)</span><span><i style={{background:COLORS.business}}/>Household price (USD/kWh)</span></div>
      </section>

      <section className="chart-card">
        <ChartHeader eyebrow="Price benchmark" title="Household versus business electricity prices" note="USD per kWh · Dec 2025" />
        <div className="chart-wrap price-bars"><ResponsiveContainer width="100%" height="100%"><BarChart data={prices} layout="vertical" margin={{top:8,right:22,bottom:18,left:78}}><CartesianGrid horizontal={false} stroke="#dbe4e7" strokeDasharray="3 5"/><XAxis type="number" tickFormatter={(v)=>`$${v.toFixed(1)}`} tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="country" width={94} tick={{fill:'#31464b',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip formatter={(v)=>`${money(v == null ? null : Number(v))}/kWh`}/><Bar dataKey="household_price_usd_per_kwh" name="Household" fill={COLORS.household} radius={[0,4,4,0]} maxBarSize={10}/><Bar dataKey="business_price_usd_per_kwh" name="Business" fill={COLORS.business} radius={[0,4,4,0]} maxBarSize={10}/></BarChart></ResponsiveContainer></div>
        <div className="inline-legend"><span><i style={{background:COLORS.household}}/>Household</span><span><i style={{background:COLORS.business}}/>Business</span><em>Iran: n.a.</em></div>
      </section>

      <section id="mix">
        <div className="chapter-heading"><p className="eyebrow">Composition</p><h2>What powers each economy</h2><p>Both views use the same source colors and rank countries by fossil share.</p></div>
        <div className="analysis-grid">
          <section className="chart-card compact"><ChartHeader eyebrow="Electricity generation" title="Power mix" note="Share of generation · 2024"/><MixLegend/><div className="chart-wrap mix-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={electricMix} layout="vertical" stackOffset="expand" margin={{top:6,right:18,bottom:10,left:75}}><XAxis type="number" tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} tick={{fill:'#607074',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="country" width={92} tick={{fill:'#31464b',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v)=>`${Number(v).toFixed(2)}%`}/><Bar stackId="mix" dataKey="electricity_generation_solar_pct" name="Solar" fill={COLORS.solar}/><Bar stackId="mix" dataKey="electricity_generation_wind_pct" name="Wind" fill={COLORS.wind}/><Bar stackId="mix" dataKey="electricity_generation_oil_and_other_fossil_pct" name="Oil & other fossil" fill={COLORS.oil}/><Bar stackId="mix" dataKey="electricity_generation_gas_pct" name="Gas" fill={COLORS.gas}/><Bar stackId="mix" dataKey="electricity_generation_coal_pct" name="Coal" fill={COLORS.coal}/><Bar stackId="mix" dataKey="electricity_generation_hydro_pct" name="Hydro" fill={COLORS.hydro}/><Bar stackId="mix" dataKey="electricity_generation_other_pct" name="Other / non-fossil" fill={COLORS.other}/></BarChart></ResponsiveContainer></div></section>
          <section className="chart-card compact"><ChartHeader eyebrow="Primary energy" title="Consumption mix" note="Share of consumption · 2024"/><MixLegend/><div className="chart-wrap mix-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={primaryMix} layout="vertical" stackOffset="expand" margin={{top:6,right:18,bottom:10,left:75}}><XAxis type="number" tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} tick={{fill:'#607074',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="country" width={92} tick={{fill:'#31464b',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v)=>`${Number(v).toFixed(2)}%`}/><Bar stackId="mix" dataKey="primary_energy_consumption_solar_pct" name="Solar" fill={COLORS.solar}/><Bar stackId="mix" dataKey="primary_energy_consumption_wind_pct" name="Wind" fill={COLORS.wind}/><Bar stackId="mix" dataKey="primary_energy_consumption_oil_pct" name="Oil" fill={COLORS.oil}/><Bar stackId="mix" dataKey="primary_energy_consumption_gas_pct" name="Gas" fill={COLORS.gas}/><Bar stackId="mix" dataKey="primary_energy_consumption_coal_pct" name="Coal" fill={COLORS.coal}/><Bar stackId="mix" dataKey="primary_energy_consumption_hydro_pct" name="Hydro" fill={COLORS.hydro}/><Bar stackId="mix" dataKey="primary_energy_consumption_other_pct" name="Other / non-fossil" fill={COLORS.other}/></BarChart></ResponsiveContainer></div></section>
        </div>
      </section>

      <section className="chart-card" id="flows"><ChartHeader eyebrow="Supply position" title="Energy production and international flows" note="Exajoules · 2023"/><div className="chart-wrap flow-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={flows} layout="vertical" margin={{top:8,right:22,bottom:18,left:78}}><CartesianGrid horizontal={false} stroke="#dbe4e7" strokeDasharray="3 5"/><XAxis type="number" tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="country" width={94} tick={{fill:'#31464b',fontSize:11}} axisLine={false} tickLine={false}/><ReferenceLine x={0} stroke="#173138" strokeWidth={1.5}/><Tooltip formatter={(v,name)=>[`${Math.abs(Number(v)).toFixed(2)} EJ`,name]}/><Bar dataKey="total_energy_domestic_production_ej" name="Domestic production" fill={COLORS.production} radius={[0,4,4,0]} maxBarSize={9}/><Bar dataKey="total_energy_gross_imports_ej" name="Gross imports" fill={COLORS.imports} radius={[0,4,4,0]} maxBarSize={9}/><Bar dataKey="negative_gross_exports_ej" name="Gross exports" fill={COLORS.exports} radius={[4,0,0,4]} maxBarSize={9}/></BarChart></ResponsiveContainer></div><div className="inline-legend"><span><i style={{background:COLORS.production}}/>Domestic production</span><span><i style={{background:COLORS.imports}}/>Imports</span><span><i style={{background:COLORS.exports}}/>Exports (shown negative)</span></div></section>

      <section className="chart-card"><ChartHeader eyebrow="Relationship" title="Price and consumption" note="Household price vs total energy use"/><div className="chart-wrap scatter-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:32,right:60,bottom:32,left:12}}><CartesianGrid stroke="#dbe4e7" strokeDasharray="3 5"/><XAxis type="number" dataKey="consumption" name="Consumption" unit=" EJ" tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><YAxis type="number" dataKey="price" name="Household price" unit=" USD/kWh" domain={[0,.5]} tickFormatter={(v)=>`$${v.toFixed(1)}`} tick={{fill:'#607074',fontSize:11}} axisLine={false} tickLine={false}/><ZAxis range={[56,56]}/><Tooltip cursor={{strokeDasharray:'3 4'}} formatter={(v,name)=>name==='Consumption'?`${Number(v).toFixed(2)} EJ`:`$${Number(v).toFixed(3)}/kWh`}/><Scatter data={scatter} fill={COLORS.household}><LabelList dataKey="country" position="top" fontSize={10} fill="#31464b"/></Scatter></ScatterChart></ResponsiveContainer></div></section>

      <footer><div><span className="footer-mark"><ShieldCheck size={15}/></span><strong>Data integrity preserved</strong></div><p>15 unique source records · Missing prices remain unavailable · Percent measures use a 0–100 source scale · “Non-fossil” includes other sources that may contain nuclear.</p><a href="/energy-data-chart-ready.csv" download>Download source CSV</a></footer>
    </div>
  </main>;
}
