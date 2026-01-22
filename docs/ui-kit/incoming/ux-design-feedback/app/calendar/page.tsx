"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Calendar,
  Clock,
  MapPin,
  Bell,
  BellOff,
  ChevronRight,
  CalendarPlus,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomNav } from "@/components/bottom-nav"
import { JourneyProgress } from "@/components/journey-progress"
import { mockSchools } from "@/lib/data"
import { cn } from "@/lib/utils"

interface OpenDayEvent {
  schoolId: string
  schoolName: string
  schoolImage: string
  date: string
  dateObj: Date
  time: string
  address: string
  registered: boolean
  reminded: boolean
}

const openDays: OpenDayEvent[] = [
  {
    schoolId: "3",
    schoolName: "Barlaeus Gymnasium",
    schoolImage: "/images/school-3.jpg",
    date: "Zaterdag 18 januari",
    dateObj: new Date(2025, 0, 18),
    time: "11:00 - 15:00",
    address: "Weteringschans 60, Amsterdam",
    registered: true,
    reminded: true,
  },
  {
    schoolId: "1",
    schoolName: "Het Amsterdams Lyceum",
    schoolImage: "/images/school-1.jpg",
    date: "Woensdag 15 januari",
    dateObj: new Date(2025, 0, 15),
    time: "10:00 - 14:00",
    address: "Valeriusplein 15, Amsterdam",
    registered: false,
    reminded: false,
  },
  {
    schoolId: "4",
    schoolName: "IJburg College",
    schoolImage: "/images/school-4.jpg",
    date: "Maandag 20 januari",
    dateObj: new Date(2025, 0, 20),
    time: "10:00 - 14:00",
    address: "Pampuslaan 2, Amsterdam-IJburg",
    registered: false,
    reminded: false,
  },
  {
    schoolId: "2",
    schoolName: "Montessori Lyceum",
    schoolImage: "/images/school-2.jpg",
    date: "Woensdag 22 januari",
    dateObj: new Date(2025, 0, 22),
    time: "09:00 - 13:00",
    address: "Weteringschans 180, Amsterdam",
    registered: false,
    reminded: false,
  },
]

export default function CalendarPage() {
  const [events, setEvents] = useState(openDays)
  const registeredCount = events.filter((e) => e.registered).length

  const toggleRegistration = (schoolId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.schoolId === schoolId ? { ...e, registered: !e.registered } : e
      )
    )
  }

  const toggleReminder = (schoolId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.schoolId === schoolId ? { ...e, reminded: !e.reminded } : e
      )
    )
  }

  const sortedEvents = [...events].sort(
    (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
  )

  return (
    <main className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Open Dagen</h1>
              <p className="text-sm text-muted-foreground">
                {registeredCount} {registeredCount === 1 ? "bezoek" : "bezoeken"} gepland
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </header>

      {/* Journey Progress */}
      <div className="px-4 py-4">
        <JourneyProgress
          currentStep={3}
          schoolsDiscovered={mockSchools.length}
          shortlistCount={3}
        />
      </div>

      {/* Calendar view hint */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-chart-3/20 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Januari 2025</h3>
              <p className="text-sm text-muted-foreground">
                {events.length} open dagen beschikbaar
              </p>
            </div>
          </div>

          {/* Mini calendar week view */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
              <div key={day} className="text-muted-foreground py-1">
                {day}
              </div>
            ))}
            {[13, 14, 15, 16, 17, 18, 19].map((day) => {
              const hasEvent = [15, 18].includes(day)
              const isRegistered = day === 18
              return (
                <div
                  key={day}
                  className={cn(
                    "py-2 rounded-lg relative",
                    hasEvent && "font-semibold",
                    isRegistered && "bg-primary text-primary-foreground",
                    hasEvent && !isRegistered && "bg-accent/20 text-accent"
                  )}
                >
                  {day}
                  {hasEvent && !isRegistered && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                  )}
                </div>
              )
            })}
            {[20, 21, 22, 23, 24, 25, 26].map((day) => {
              const hasEvent = [20, 22].includes(day)
              return (
                <div
                  key={day}
                  className={cn(
                    "py-2 rounded-lg relative",
                    hasEvent && "bg-accent/20 text-accent font-semibold"
                  )}
                >
                  {day}
                  {hasEvent && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Events list */}
      <section className="px-4">
        <h2 className="font-semibold text-foreground mb-3">Aankomende open dagen</h2>
        <div className="space-y-3">
          {sortedEvents.map((event) => (
            <div
              key={event.schoolId}
              className={cn(
                "bg-card rounded-2xl overflow-hidden shadow-sm",
                event.registered && "ring-2 ring-primary"
              )}
            >
              <Link
                href={`/school/${event.schoolId}`}
                className="flex gap-4 p-4"
              >
                {/* School image */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={event.schoolImage || "/placeholder.svg"}
                    alt={event.schoolName}
                    fill
                    className="object-cover"
                  />
                  {event.registered && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>

                {/* Event info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">
                      {event.schoolName}
                    </h3>
                    {event.registered && (
                      <Badge className="bg-primary/10 text-primary border-0 shrink-0">
                        Aangemeld
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{event.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>

              {/* Actions */}
              <div className="flex border-t border-border">
                <button
                  onClick={() => toggleRegistration(event.schoolId)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                    event.registered
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {event.registered ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Aangemeld
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4" />
                      Meld aan
                    </>
                  )}
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={() => toggleReminder(event.schoolId)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
                    event.reminded
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {event.reminded ? (
                    <>
                      <Bell className="w-4 h-4 fill-current" />
                      Herinnering aan
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4" />
                      Herinner mij
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tips section */}
      <section className="px-4 py-6">
        <div className="bg-secondary/50 rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-2">Tips voor je bezoek</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Stel vragen aan huidige leerlingen
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Loop rond en bekijk de sfeer
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Vraag naar extra activiteiten en clubs
            </li>
          </ul>
        </div>
      </section>

      <BottomNav activeTab="calendar" favoritesCount={3} />
    </main>
  )
}
