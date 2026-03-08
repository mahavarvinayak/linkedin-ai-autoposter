"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Share2, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  Plus,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Welcome back, User</h1>
          <p className="text-muted-foreground">Here's an overview of your LinkedIn automation status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/history">View History</Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90">
            <Link href="/dashboard/create">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LinkedIn Connected</div>
            <p className="text-xs text-muted-foreground">Connected as Personal Profile</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Post</CardTitle>
            <Calendar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today, 09:00 AM</div>
            <p className="text-xs text-muted-foreground">Topic: AI Trends 2024</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posts This Month</CardTitle>
            <TrendingUp className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 / 30</div>
            <p className="text-xs text-muted-foreground">+3 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <Share2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2%</div>
            <p className="text-xs text-muted-foreground">Higher than average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>Your last 3 published posts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Published: The Future of Remote Work...</p>
                    <p className="text-sm text-muted-foreground">Yesterday at 9:00 AM • Personal Profile</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Connected Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center font-bold text-primary">P</div>
                <div>
                  <p className="text-sm font-medium">Personal Profile</p>
                  <p className="text-xs text-green-500">Connected</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center font-bold text-accent">T</div>
                <div>
                  <p className="text-sm font-medium">TechInsights Co.</p>
                  <p className="text-xs text-muted-foreground">Admin Access</p>
                </div>
              </div>
              <Badge variant="outline">Admin</Badge>
            </div>
            <Button variant="outline" className="w-full text-xs h-8">
              <Plus className="w-3 h-3 mr-2" /> Connect New Page
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-accent shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg">Pro-tip: Multi-channel support is coming soon!</h3>
              <p className="text-muted-foreground">We're working on Twitter and Instagram auto-posting. Stay tuned for updates in the next release.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}