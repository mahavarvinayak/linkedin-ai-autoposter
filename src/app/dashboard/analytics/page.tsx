
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from "recharts"
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Share2, 
  ThumbsUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap
} from "lucide-react"

const MOCK_DAILY_DATA = [
  { day: "Mon", reach: 1200, engagement: 85 },
  { day: "Tue", reach: 1500, engagement: 110 },
  { day: "Wed", reach: 1100, engagement: 65 },
  { day: "Thu", reach: 2400, engagement: 195 },
  { day: "Fri", reach: 1800, engagement: 140 },
  { day: "Sat", reach: 900, engagement: 45 },
  { day: "Sun", reach: 1300, engagement: 95 },
]

const MOCK_TOP_POSTS = [
  { name: "Future of AI", value: 450, color: "hsl(var(--primary))" },
  { name: "SaaS Scaling", value: 380, color: "hsl(var(--accent))" },
  { name: "Remote Work", value: 310, color: "hsl(var(--primary) / 0.7)" },
  { name: "Dev Productivity", value: 280, color: "hsl(var(--accent) / 0.7)" },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Detailed insights into your LinkedIn performance.</p>
        </div>
        <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Last 7 Days</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10,240</div>
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12.5% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Zap className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">834</div>
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+8.2% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.4%</div>
            <div className="flex items-center gap-1 text-xs text-destructive mt-1">
              <ArrowDownRight className="w-3 h-3" />
              <span>-0.4% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Followers</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+42</div>
            <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+15% from last week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Performance Trend</CardTitle>
            <CardDescription>Reach vs. Engagement over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_DAILY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="reach" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3} 
                  dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Posts Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>Based on total interactions</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_TOP_POSTS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 }} 
                />
                <Tooltip 
                  cursor={{ fill: "hsl(var(--secondary) / 0.5)" }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {MOCK_TOP_POSTS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Report Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Today's Performance Report
          </CardTitle>
          <CardDescription>Snapshot of your LinkedIn growth today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Today's Reach</p>
              <p className="text-3xl font-extrabold text-primary">3,250</p>
              <p className="text-xs text-green-500 font-medium">+18% vs yesterday</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Engagement</p>
              <p className="text-3xl font-extrabold">184</p>
              <p className="text-xs text-green-500 font-medium">+5% vs yesterday</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Top Content</p>
              <p className="text-xl font-bold truncate">AI Automation Strategy</p>
              <p className="text-xs text-muted-foreground italic">Published 4h ago</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Engagement Rate</p>
              <p className="text-3xl font-extrabold text-accent">5.6%</p>
              <p className="text-xs text-muted-foreground font-medium">High performance zone</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
