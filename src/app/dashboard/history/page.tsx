"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MoreVertical
} from "lucide-react"

const MOCK_HISTORY = [
  { id: 1, title: "The Rise of Gemini in Software Dev", date: "Oct 22, 2024", time: "09:01 AM", target: "Personal", status: "published", engagements: 124 },
  { id: 2, title: "5 Tips for SaaS Scaling", date: "Oct 21, 2024", time: "09:00 AM", target: "Company", status: "published", engagements: 85 },
  { id: 3, title: "Understanding React 19 Features", date: "Oct 20, 2024", time: "09:00 AM", target: "Personal", status: "published", engagements: 210 },
  { id: 4, title: "NextJS 15 vs The World", date: "Oct 19, 2024", time: "09:02 AM", target: "Personal", status: "failed", engagements: 0 },
  { id: 5, title: "Building a Better LinkFlow", date: "Oct 18, 2024", time: "09:00 AM", target: "Company", status: "published", engagements: 42 },
]

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Post History</h1>
        <p className="text-muted-foreground">Monitor and manage all your past LinkedIn activity.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search posts..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button variant="outline" size="sm">
            Download CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/30">
                  <th className="px-6 py-4 text-left font-semibold">Post Title & Insight</th>
                  <th className="px-6 py-4 text-left font-semibold">Date & Time</th>
                  <th className="px-6 py-4 text-left font-semibold">Target</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MOCK_HISTORY.map((post) => (
                  <tr key={post.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold truncate max-w-[300px]">{post.title}</p>
                      <p className="text-xs text-muted-foreground">AI Generated: True</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{post.date}</p>
                      <p className="text-xs text-muted-foreground">{post.time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-secondary/50">{post.target}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {post.status === 'published' ? (
                        <div className="flex items-center gap-2 text-green-500 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Published
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-destructive font-medium">
                          <XCircle className="w-4 h-4" /> Failed
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button variant="ghost" className="text-primary hover:text-primary/80">Load More Posts</Button>
      </div>
    </div>
  )
}