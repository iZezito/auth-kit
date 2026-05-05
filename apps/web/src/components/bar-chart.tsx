import { Bar, BarChart, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"


const chartConfig = {
  acertos: {
    label: "Acertos",
    color: "hsl(var(--chart-1))",
  },
  erros: {
    label: "Erros",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

interface BarChartAcertosProps {
  data: { area: string; acertos: number; erros: number }[]
  title: string
  description?: string
}

export function BarChartAcertos({ data, title, description }: BarChartAcertosProps) {
  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data}>
            <XAxis
              dataKey="area"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <Bar
              dataKey="acertos"
              stackId="a"
              fill="hsl(var(--chart-1))"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="erros"
              stackId="a"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
              cursor={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
