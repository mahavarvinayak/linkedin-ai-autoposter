"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Wand2, 
  Send, 
  Clock, 
  Eye, 
  Info,
  Hash,
  Sparkles,
  Loader2
} from "lucide-react"
import { generateLinkedInPost } from "@/ai/flows/generate-linkedin-post-flow"
import { useToast } from "@/hooks/use-toast"

export default function CreatePostPage() {
  const [topic, setTopic] = useState("")
  const [caption, setCaption] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [targetType, setTargetType] = useState("personal")
  const { toast } = useToast()

  const handleGenerateAI = async () => {
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for the AI to write about.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateLinkedInPost({ topic })
      setCaption(result.caption)
      setHashtags(result.hashtags)
      toast({
        title: "Success!",
        description: "AI has generated your post content.",
      })
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Something went wrong while generating the post.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Create New Post</h1>
        <p className="text-muted-foreground">Craft your perfect LinkedIn post manually or using AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-accent" />
                AI Assistant
              </CardTitle>
              <CardDescription>Enter a topic and let LinkFlow AI do the magic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Post Topic or Category</Label>
                <div className="flex gap-2">
                  <Input 
                    id="topic" 
                    placeholder="e.g. AI trends in SaaS, Remote work culture..." 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <Button 
                    onClick={handleGenerateAI} 
                    disabled={isGenerating || !topic}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="target">Publish to</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger id="target">
                    <SelectValue placeholder="Select target account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Profile (John Doe)</SelectItem>
                    <SelectItem value="company-1">TechInsights Co. (Company Page)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Textarea 
                  id="caption" 
                  rows={10} 
                  placeholder="Write your post content here..." 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{caption.length} / 1500 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="hashtags" 
                    placeholder="#AI #Technology #Innovation" 
                    className="pl-9"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              <Button className="bg-primary hover:bg-primary/90">
                <Send className="w-4 h-4 mr-2" />
                Publish Now
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Preview
            </h2>
            <Card className="max-w-md bg-white text-gray-900 border-none shadow-xl overflow-hidden rounded-xl">
              <div className="p-4 flex gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg">JD</div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">John Doe</h4>
                  <p className="text-xs text-gray-500">AI Specialist • 1st</p>
                  <p className="text-[10px] text-gray-400">Just now • 🌐</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {caption || "Start writing your post or use the AI generator to see the preview here..."}
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  {hashtags}
                </p>
              </div>
              {/* LinkedIn Interaction Mockup */}
              <div className="border-t border-gray-100 px-4 py-2 flex justify-between items-center bg-gray-50/50">
                <div className="flex gap-4">
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1 hover:text-blue-600 cursor-pointer">👍 Like</span>
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1 hover:text-blue-600 cursor-pointer">💬 Comment</span>
                </div>
                <span className="text-xs text-gray-500 font-semibold flex items-center gap-1 hover:text-blue-600 cursor-pointer">🔄 Repost</span>
              </div>
            </Card>

            <Card className="mt-8 bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Optimization Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Readability</span>
                      <span className="font-bold text-primary">High</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[85%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Hashtag Relevance</span>
                      <span className="font-bold text-accent">Good</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div className="bg-accent h-full w-[70%]"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}