
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Linkedin, 
  Shield, 
  Bell,
  Save,
  LogOut,
  ChevronRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/firebase"

export default function SettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Profile updated",
        description: "Your settings have been saved successfully.",
      })
    }, 1000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">General Settings</h1>
        <p className="text-muted-foreground">Manage your personal profile and application preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b">
                <Avatar className="w-20 h-20 border-2 border-primary/20">
                  <AvatarImage src={user?.photoURL || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={user?.displayName || ""} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="email" defaultValue={user?.email || ""} className="pl-9" readOnly />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-6 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                {isSaving ? <Save className="w-4 h-4 animate-pulse mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Profile
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-600" />
                LinkedIn Connection
              </CardTitle>
              <CardDescription>Manage your authenticated LinkedIn accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white">
                    <Linkedin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Authenticated Account</p>
                    <p className="text-xs text-muted-foreground">{user?.displayName || "Connected"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive">Disconnect</Button>
              </div>

              <div className="p-4 rounded-lg border border-dashed border-primary/30 flex flex-col items-center justify-center py-8 text-center bg-primary/5">
                <Linkedin className="w-8 h-8 text-primary/50 mb-2" />
                <p className="text-sm font-medium">Connect another account</p>
                <p className="text-xs text-muted-foreground mb-4">Manage multiple profiles or company pages.</p>
                <Button variant="outline" size="sm">Add LinkedIn Account</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Post success alerts</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Weekly summary</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>System status</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <Shield className="w-4 h-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Permanently delete your account and all associated LinkedIn automation data.</p>
              <Button variant="destructive" className="w-full text-xs h-8">Delete Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
