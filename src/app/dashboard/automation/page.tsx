
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  Globe, 
  Clock, 
  Target, 
  Layers,
  Calendar,
  Save,
  Play,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function AutomationPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: userData, isLoading: isDocLoading } = useDoc(userDocRef);

  const [isSaving, setIsSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [postingTime, setPostingTime] = useState("09:00")
  const [targetAccountType, setTargetAccountType] = useState("personal")
  const [postCategory, setPostCategory] = useState("Artificial Intelligence")

  useEffect(() => {
    if (userData) {
      setEnabled(userData.automationEnabled ?? false)
      setPostingTime(userData.postingTime ?? "09:00")
      setTargetAccountType(userData.targetAccountType ?? "personal")
    }
  }, [userData])

  const handleSave = () => {
    if (!userDocRef) return;
    
    setIsSaving(true)
    updateDocumentNonBlocking(userDocRef, {
      automationEnabled: enabled,
      postingTime: postingTime,
      targetAccountType: targetAccountType,
    })
    
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Automation updated",
        description: `Daily posting is now ${enabled ? 'active' : 'paused'}.`,
      })
    }, 500)
  }

  if (isDocLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Automation Settings</h1>
          <p className="text-muted-foreground">Configure your daily autopilot publishing rules.</p>
        </div>
        <div className="flex items-center gap-3 p-2 bg-secondary/50 rounded-full pr-4">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className={`text-sm font-bold ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>
            {enabled ? 'Auto-Post ON' : 'Auto-Post OFF'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Schedule Configuration
              </CardTitle>
              <CardDescription>Determine when your AI-generated posts should go live.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Posting Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekdays">Weekdays Only</SelectItem>
                    <SelectItem value="mwf">Mon, Wed, Fri</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Daily Time (Local)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="time" 
                    value={postingTime} 
                    onChange={(e) => setPostingTime(e.target.value)}
                    className="w-32" 
                  />
                  <span className="text-xs text-muted-foreground italic">Optimal for LinkedIn engagement (08:00 - 10:00 AM)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Targeting & Personalization
              </CardTitle>
              <CardDescription>Where should the AI publish its insights?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Primary Target Account</Label>
                <Select value={targetAccountType} onValueChange={setTargetAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Profile</SelectItem>
                    <SelectItem value="company">Connected Company Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Category / Topic</Label>
                <Input 
                  placeholder="e.g. Artificial Intelligence, B2B SaaS, Modern Work" 
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">The AI uses this to maintain consistent brand voice.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t p-6 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Config
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-accent" />
                Test Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Trigger a manual run of the automation engine now to verify your AI settings and LinkedIn connection.</p>
              <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-white transition-all">
                Run Simulation (Mock Post)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {[
                  { date: "Tomorrow", time: postingTime, topic: postCategory },
                  { date: "In 2 days", time: postingTime, topic: postCategory },
                  { date: "In 3 days", time: postingTime, topic: postCategory },
                ].map((run, i) => (
                  <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-secondary/20 transition-colors">
                    <div>
                      <p className="text-sm font-bold">{run.date}</p>
                      <p className="text-xs text-muted-foreground">{run.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{run.topic}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
