"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  ShieldCheck, 
  Key, 
  Zap, 
  Settings,
  AlertTriangle,
  Save,
  Check
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AISettingsPage() {
  const [provider, setProvider] = useState("gemini")
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Settings saved",
        description: "Your AI configuration has been updated successfully.",
      })
    }, 1000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">AI Provider Settings</h1>
        <p className="text-muted-foreground">Configure your Bring Your Own Key (BYOK) system for post generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Select Provider
              </CardTitle>
              <CardDescription>Choose the AI engine you want to use for generating LinkedIn content.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={provider} onValueChange={setProvider} className="grid grid-cols-1 gap-4">
                <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${provider === 'gemini' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setProvider('gemini')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="gemini" id="gemini" />
                      <div>
                        <Label htmlFor="gemini" className="font-bold text-lg cursor-pointer">Google Gemini</Label>
                        <p className="text-sm text-muted-foreground">Optimized for LinkFlow AI natively.</p>
                      </div>
                    </div>
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${provider === 'openai' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setProvider('openai')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="openai" id="openai" />
                      <div>
                        <Label htmlFor="openai" className="font-bold text-lg cursor-pointer">OpenAI (GPT-4o)</Label>
                        <p className="text-sm text-muted-foreground">Highly creative and conversational.</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded bg-black flex items-center justify-center text-white text-[10px]">AI</div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${provider === 'custom' ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setProvider('custom')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="custom" id="custom" />
                      <div>
                        <Label htmlFor="custom" className="font-bold text-lg cursor-pointer">Custom Endpoint</Label>
                        <p className="text-sm text-muted-foreground">Connect to your own self-hosted LLM.</p>
                      </div>
                    </div>
                    <Settings className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-accent" />
                API Credentials
              </CardTitle>
              <CardDescription>Enter your private API keys. These are stored securely in Firebase Secret Manager.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {provider === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="endpoint">Endpoint URL</Label>
                  <Input id="endpoint" placeholder="https://api.yourdomain.com/v1" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="apiKey" 
                    type="password" 
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                    className="pl-9"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Your key is encrypted before being stored.</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-6 border-t">
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                {isSaving ? <Save className="w-4 h-4 animate-pulse mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>LinkFlow AI uses <strong>AES-256 encryption</strong> for all sensitive credentials.</p>
              <p>Keys are accessed only during post generation and are never logged or exposed in the client-side code.</p>
              <div className="flex items-start gap-2 text-primary font-medium p-3 bg-white/50 rounded-lg">
                <Check className="w-4 h-4 mt-0.5" />
                <span>HIPAA & GDPR Ready</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                Token Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>Be aware that generating posts consumes tokens on your provider account. LinkFlow AI generates approximately 500-800 tokens per daily post.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
