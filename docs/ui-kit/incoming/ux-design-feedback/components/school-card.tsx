"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, MapPin, Users, Star, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface School {
  id: string
  name: string
  image: string
  distance: string
  students: number
  rating: number
  tags: string[]
  openDay: string
  friendsCount: number
}

interface SchoolCardProps {
  school: School
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function SchoolCard({ school, isFavorite, onToggleFavorite }: SchoolCardProps) {
  return (
    <Link 
      href={`/school/${school.id}`}
      className="block bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[16/10]">
        <Image
          src={school.image || "/placeholder.svg"}
          alt={school.name}
          fill
          className="object-cover"
        />
        
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all",
            isFavorite 
              ? "bg-primary text-primary-foreground" 
              : "bg-card/90 backdrop-blur-sm text-foreground hover:bg-card"
          )}
          aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>

        {/* Friends badge */}
        {school.friendsCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <Users className="w-3 h-3" />
            {school.friendsCount} {school.friendsCount === 1 ? "vriend" : "vrienden"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-serif font-semibold text-lg text-foreground leading-tight">
            {school.name}
          </h3>
          <div className="flex items-center gap-1 text-sm font-medium text-foreground shrink-0">
            <Star className="w-4 h-4 fill-chart-3 text-chart-3" />
            {school.rating}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {school.distance}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {school.students.toLocaleString("nl-NL")} leerlingen
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {school.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Open Day */}
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <Calendar className="w-4 h-4" />
          Open dag: {school.openDay}
        </div>
      </div>
    </Link>
  )
}
