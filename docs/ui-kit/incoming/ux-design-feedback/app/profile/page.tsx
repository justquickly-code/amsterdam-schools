"use client"

import { useState } from "react"
import Link from "next/link"
import {
  User,
  Mail,
  MapPin,
  GraduationCap,
  Users,
  Settings,
  ChevronRight,
  LogOut,
  Bell,
  HelpCircle,
  FileText,
  Share2,
  Heart,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomNav } from "@/components/bottom-nav"
import { JourneyProgress } from "@/components/journey-progress"
import { cn } from "@/lib/utils"

interface ProfileStats {
  schoolsViewed: number
  favorites: number
  openDaysPlanned: number
  notesWritten: number
}

const stats: ProfileStats = {
  schoolsViewed: 12,
  favorites: 3,
  openDaysPlanned: 2,
  notesWritten: 5,
}

const menuItems = [
  {
    icon: Bell,
    label: "Meldingen",
    description: "Beheer je notificaties",
    href: "#notifications",
  },
  {
    icon: Users,
    label: "Vrienden",
    description: "Bekijk en nodig vrienden uit",
    href: "#friends",
    badge: "2 nieuw",
  },
  {
    icon: Share2,
    label: "Delen met familie",
    description: "Deel je lijst met ouders",
    href: "#family",
  },
  {
    icon: FileText,
    label: "Mijn notities",
    description: "Bekijk al je aantekeningen",
    href: "#notes",
  },
  {
    icon: HelpCircle,
    label: "Help & FAQ",
    description: "Veelgestelde vragen",
    href: "#help",
  },
  {
    icon: Settings,
    label: "Instellingen",
    description: "Account en privacy",
    href: "#settings",
  },
]

export default function ProfilePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)

  // Guest state
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen pb-24 bg-background">
        <div className="px-4 py-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <User className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
            Welkom bij Scholenwijzer
          </h1>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Maak een account om je favorieten op te slaan, notities te maken en te delen met vrienden.
          </p>

          <div className="space-y-3 max-w-sm mx-auto">
            <Button className="w-full" size="lg" onClick={() => setIsLoggedIn(true)}>
              <Mail className="w-5 h-5 mr-2" />
              Doorgaan met e-mail
            </Button>
            <p className="text-xs text-muted-foreground">
              We sturen je een linkje - geen wachtwoord nodig
            </p>
          </div>

          <div className="mt-12 p-4 bg-card rounded-2xl text-left max-w-sm mx-auto">
            <h3 className="font-semibold text-foreground mb-3">Wat kun je doen?</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">Favoriete scholen opslaan</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <span className="text-muted-foreground">Open dagen bijhouden</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-chart-3/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-chart-3" />
                </div>
                <span className="text-muted-foreground">Vergelijken met vrienden</span>
              </li>
            </ul>
          </div>
        </div>

        <BottomNav activeTab="profile" favoritesCount={0} />
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-24 bg-background">
      {/* Header with profile */}
      <header className="bg-gradient-to-br from-primary/10 via-background to-accent/10 pt-8 pb-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
            ES
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground">Emma Smit</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              1071 AB, Amsterdam
            </p>
            <Badge variant="secondary" className="mt-1 gap-1">
              <GraduationCap className="w-3 h-3" />
              HAVO/VWO advies
            </Badge>
          </div>
        </div>
      </header>

      {/* Journey Progress */}
      <div className="px-4 py-4 -mt-2">
        <JourneyProgress
          currentStep={2}
          schoolsDiscovered={stats.schoolsViewed}
          shortlistCount={stats.favorites}
        />
      </div>

      {/* Stats grid */}
      <section className="px-4 py-2">
        <div className="grid grid-cols-4 gap-3">
          {[
            { value: stats.schoolsViewed, label: "Bekeken", color: "text-foreground" },
            { value: stats.favorites, label: "Favorieten", color: "text-primary" },
            { value: stats.openDaysPlanned, label: "Gepland", color: "text-accent" },
            { value: stats.notesWritten, label: "Notities", color: "text-chart-3" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-3 text-center shadow-sm"
            >
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-4 py-4">
        <div className="flex gap-3">
          <Link
            href="/favorites"
            className="flex-1 bg-primary/10 rounded-2xl p-4 flex flex-col items-center gap-2"
          >
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-foreground">Mijn Lijst</span>
          </Link>
          <Link
            href="/calendar"
            className="flex-1 bg-accent/10 rounded-2xl p-4 flex flex-col items-center gap-2"
          >
            <Calendar className="w-6 h-6 text-accent" />
            <span className="text-sm font-medium text-foreground">Open Dagen</span>
          </Link>
        </div>
      </section>

      {/* Menu items */}
      <section className="px-4">
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Logout */}
      <section className="px-4 py-6">
        <button
          onClick={() => setIsLoggedIn(false)}
          className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Uitloggen</span>
        </button>
      </section>

      <BottomNav activeTab="profile" favoritesCount={stats.favorites} />
    </main>
  )
}
