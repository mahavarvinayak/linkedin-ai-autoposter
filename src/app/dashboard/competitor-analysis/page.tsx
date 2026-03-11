"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/firebase"
import { Sparkles, Loader2, Copy, Send } from "lucide-react"

export default function CompetitorAnalysisPage() {
  const { user } = useUser()
  const { toast } = useToast()
  
  const [competitorStyleText, setCompetitorStyleText] = useState("")
  const [topic, setTopic] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const [generatedCaption, setGeneratedCaption] = useState("")
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([])

  const handleAnalyze = async () => {
    if (!competitorStyleText.trim() || !topic.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both the competitor's posts and your new topic.",
        variant: "destructive"
      })
      return
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be signed in to use this feature.",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    setGeneratedCaption("")
    setGeneratedHashtags([])

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/analyzeCompetitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          competitorContent: competitorStyleText,
          topic: topic
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze and generate post")
      }

      setGeneratedCaption(data.caption)
      setGeneratedHashtags(data.hashtags || [])

      toast({
        title: "Success!",
        description: "Your competitor-styled post is ready.",
      })
    } catch (error: any) {
      toast({
        title: "Error Generating Post",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = () => {
    const fullText = `${generatedCaption}\n\n${generatedHashtags.join(" ")}`
    navigator.clipboard.writeText(fullText)
    toast({
      title: "Copied!",
      description: "Post copied to clipboard.",
    })
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          Competitor Analyzer
        </h1>
        <p className="text-muted-foreground mt-2">
          Paste 2-3 recent posts from a competitor. Our AI will analyze their unique writing tone, sentence pacing, and formatting style to construct an entirely new, non-plagiarized post on your chosen topic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Competitor's Content</CardTitle>
              <CardDescription>Paste the text of the posts you want the AI to mimic.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="E.g. Paste a viral post from your favorite creator here..." 
                className="min-h-[250px] resize-y"
                value={competitorStyleText}
                onChange={(e) => setCompetitorStyleText(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Your New Topic</CardTitle>
              <CardDescription>What should your new original post be about?</CardDescription>
            </CardHeader>
            <CardContent>
              <Input 
                placeholder="E.g. The impact of remote work on junior developers" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-accent hover:bg-accent/90" 
                onClick={handleAnalyze} 
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {isAnalyzing ? "Analyzing Style & Ghostwriting..." : "Analyze & Generate Post"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col border-primary/20 bg-secondary/10">
            <CardHeader>
              <CardTitle>Generated Post</CardTitle>
              <CardDescription>Your ready-to-publish content will appear here.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              {generatedCaption ? (
                <div className="space-y-4 flex-grow flex flex-col">
                  <div className="bg-background rounded-md border p-4 flex-grow whitespace-pre-wrap font-sans text-sm">
                    {generatedCaption}
                    
                    {generatedHashtags.length > 0 && (
                      <div className="mt-4 pt-4 border-t text-primary font-medium">
                        {generatedHashtags.join(" ")}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 border-2 border-dashed rounded-lg opacity-50">
                  <Sparkles className="w-12 h-12 mb-4 text-primary/40" />
                  <p className="text-center">Awaiting competitor analysis.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
