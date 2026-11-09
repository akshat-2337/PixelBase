import { useId, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartDatum } from '../lib/analytics'
import { ChartNoAxesColumn } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle: string
  data: ChartDatum[]
  axis: string
  className?: string
  horizontal?: boolean
  highlight?: boolean
  badge?: ReactNode
}
export function ChartCard({
  title,
  subtitle,
  data,
  axis,
  className = '',
  horizontal = false,
  highlight = false,
  badge,
}: ChartCardProps) {
  const id = useId()
  const hasData = data.some((item) => item.count > 0)
  return (
    <section className={`panel chart-panel ${className}`} aria-labelledby={id}>
      <div className="panel-heading">
        <div>
          <h2 id={id}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {badge}
      </div>
      {hasData ? (
        <div
          className={`chart-area ${horizontal ? 'horizontal-chart' : ''}`}
          role="img"
          aria-label={`${title}. Exact counts available in the data table below.`}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={data}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 18, right: 12, left: horizontal ? 0 : 0, bottom: 22 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--line)"
                strokeDasharray="3 5"
                vertical={false}
                horizontal={!horizontal}
              />
              <XAxis
                type={horizontal ? 'number' : 'category'}
                dataKey={horizontal ? undefined : 'label'}
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                minTickGap={8}
                label={{
                  value: horizontal ? 'Photos' : axis,
                  position: 'bottom',
                  offset: 5,
                  fill: 'var(--muted)',
                  fontSize: 10,
                }}
              />
              <YAxis
                type={horizontal ? 'category' : 'number'}
                dataKey={horizontal ? 'label' : undefined}
                width={horizontal ? 145 : 42}
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tickFormatter={
                  horizontal
                    ? (value: string) => (value.length > 22 ? value.slice(0, 21) + '…' : value)
                    : undefined
                }
                label={
                  horizontal
                    ? undefined
                    : {
                        value: 'Photos',
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--muted)',
                        fontSize: 10,
                      }
                }
              />
              <Tooltip
                cursor={{ fill: 'var(--hover)' }}
                contentStyle={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                  boxShadow: '0 8px 24px #0003',
                }}
                itemStyle={{ color: 'var(--text)' }}
                formatter={(value) => [Number(value).toLocaleString(), 'Photos']}
              />
              <Bar
                dataKey="count"
                maxBarSize={horizontal ? 24 : 35}
                radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell
                    key={item.label}
                    fill={highlight && !item.prime ? 'var(--bar-muted)' : 'var(--accent)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty">
          <ChartNoAxesColumn size={26} />
          <p>No recorded {axis.toLowerCase()} in this selection</p>
        </div>
      )}
      <details className="chart-details">
        <summary>View data</summary>
        <div className="data-table-wrap">
          <table>
            <caption className="sr-only">{title} counts</caption>
            <thead>
              <tr>
                <th>{axis}</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{item.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
