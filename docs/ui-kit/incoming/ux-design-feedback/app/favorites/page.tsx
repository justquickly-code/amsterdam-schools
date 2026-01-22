"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Share2, Trash2, GripVertical, MapPin, Star, Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { JourneyProgress } from "@/components/journey-progress"
import { mockSchools } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState(mockSchools.slice(0, 3))
  const [shareMode, setShareMode] = useState(false)

  const removeFromFavorites = (id: string) => {
    setFavorites((prev) => prev.filter((s) => s.id !== id))
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Mijn schoolkeuze lijst",
        text: `Bekijk mijn favoriete scholen: ${favorites.map((s) => s.name).join(", ")}`,
        url: window.location.href,
      })
    } else {
      setShareMode(true)
    }
  }

  return (
    <main className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Mijn Lijst</h1>
              <p className="text-sm text-muted-foreground">
                {favorites.length} {favorites.length === 1 ? "school" : "scholen"} opgeslagen
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Deel
            </Button>
          </div>
        </div>
      </header>

      {/* Journey Progress */}
      <div className="px-4 py-4">
        <JourneyProgress
          currentStep={2}
          schoolsDiscovered={mockSchools.length}
          shortlistCount={favorites.length}
        />
      </div>

      {/* Empty state */}
      {favorites.length === 0 && (
        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
            Nog geen favorieten
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
            Tik op het hartje bij een school om deze aan je lijst toe te voegen.
          </p>
          <Button asChild>
            <Link href="/">Ontdek scholen</Link>
          </Button>
        </div>
      )}

      {/* Favorites list */}
      {favorites.length > 0 && (
        <section className="px-4 py-2">
          <div className="space-y-3">
            {favorites.map((school, index) => (
              <div
                key={school.id}
                className="bg-card rounded-2xl overflow-hidden shadow-sm"
              >
                <Link href={`/school/${school.id}`} className="flex gap-4 p-3">
                  {/* Drag handle placeholder */}
                  <div className="flex items-center text-muted-foreground/50">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Rank badge */}
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 && "bg-chart-3 text-foreground",
                        index === 1 && "bg-muted text-foreground",
                        index === 2 && "bg-primary/20 text-primary",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* School image */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                    <Image
                      src={school.image || "/placeholder.svg"}
                      alt={school.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* School info */}
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {school.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {school.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-chart-3 text-chart-3" />
                        {school.rating}
                      </span>
                    </div>
                    {school.friendsCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-accent mt-1">
                        <Users className="w-3 h-3" />
                        {school.friendsCount} vrienden
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex border-t border-border">
                  <button
                    onClick={() => removeFromFavorites(school.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Verwijder
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Compare CTA */}
          <div className="mt-6 p-4 bg-accent/10 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Vergelijk met vrienden</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Nodig vrienden uit om jullie lijsten te vergelijken en samen te kiezen.
                </p>
                <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                  <Share2 className="w-4 h-4" />
                  Nodig vrienden uit
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <BottomNav activeTab="favorites" favoritesCount={favorites.length} />
    </main>
  )
}
