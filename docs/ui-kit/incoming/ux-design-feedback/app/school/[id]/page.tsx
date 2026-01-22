"use client"

import { useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MapPin, 
  Users, 
  Star, 
  Calendar,
  ChevronRight,
  MessageSquare,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const schoolsData: Record<string, {
  id: string
  name: string
  images: string[]
  distance: string
  students: number
  rating: number
  tags: string[]
  openDays: { date: string; time: string }[]
  address: string
  highlights: string[]
  description: string
}> = {
  "1": {
    id: "1",
    name: "Het Amsterdams Lyceum",
    images: ["/images/school-1.jpg", "/images/classroom.jpg", "/images/gym.jpg", "/images/cafeteria.jpg"],
    distance: "1.2 km",
    students: 1250,
    rating: 8.4,
    tags: ["Creatief", "Internationaal", "VWO", "HAVO"],
    openDays: [
      { date: "15 januari 2026", time: "19:00 - 21:00" },
      { date: "22 januari 2026", time: "10:00 - 12:00" },
    ],
    address: "Valeriusplein 15, 1075 BG Amsterdam",
    highlights: [
      "Tweetalig onderwijs (TTO)",
      "Sterk in kunst & cultuur",
      "Actieve leerlingenraad"
    ],
    description: "Het Amsterdams Lyceum is een brede scholengemeenschap met havo en vwo in een prachtig monumentaal gebouw. We bieden tweetalig onderwijs en hebben een sterke focus op creativiteit en internationale oriëntatie."
  },
  "2": {
    id: "2",
    name: "Montessori Lyceum",
    images: ["/images/school-2.jpg", "/images/classroom.jpg", "/images/cafeteria.jpg"],
    distance: "2.1 km",
    students: 890,
    rating: 8.1,
    tags: ["Zelfstandig", "Kleinschalig", "VWO", "HAVO", "VMBO-T"],
    openDays: [
      { date: "22 januari 2026", time: "18:30 - 20:30" },
    ],
    address: "Polderweg 3, 1093 KL Amsterdam",
    highlights: [
      "Montessori-onderwijs",
      "Veel keuzevrijheid",
      "Persoonlijke begeleiding"
    ],
    description: "Op het Montessori Lyceum leer je zelfstandig werken en je eigen leerpad te kiezen. We geloven in de kracht van elk individu en bieden ruimte om jezelf te ontwikkelen."
  },
  "3": {
    id: "3",
    name: "Barlaeus Gymnasium",
    images: ["/images/school-3.jpg", "/images/classroom.jpg", "/images/gym.jpg"],
    distance: "0.8 km",
    students: 1100,
    rating: 8.7,
    tags: ["Academisch", "Klassiek", "Gymnasium"],
    openDays: [
      { date: "18 januari 2026", time: "10:00 - 13:00" },
      { date: "25 januari 2026", time: "19:00 - 21:00" },
    ],
    address: "Weteringschans 60, 1017 SG Amsterdam",
    highlights: [
      "Klassieke talen (Grieks & Latijn)",
      "Hoog academisch niveau",
      "Rijke geschiedenis sinds 1885"
    ],
    description: "Het Barlaeus Gymnasium staat bekend om zijn hoogwaardige academische onderwijs met klassieke talen. We bereiden leerlingen voor op universitaire studies en bieden een rijke culturele vorming."
  },
  "4": {
    id: "4",
    name: "IJburg College",
    images: ["/images/school-4.jpg", "/images/gym.jpg", "/images/cafeteria.jpg"],
    distance: "3.5 km",
    students: 1450,
    rating: 7.9,
    tags: ["Sportief", "Modern", "Breed aanbod"],
    openDays: [
      { date: "20 januari 2026", time: "19:00 - 21:00" },
    ],
    address: "Pampuslaan 2, 1087 HP Amsterdam",
    highlights: [
      "Nieuw en modern gebouw",
      "Sterk in sport",
      "Brede scholengemeenschap"
    ],
    description: "IJburg College is een moderne school op IJburg met uitstekende sportfaciliteiten. We bieden alle niveaus van vmbo tot vwo in een inspirerende omgeving."
  }
}

export default function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [notes, setNotes] = useState("")

  const school = schoolsData[id] || schoolsData["1"]

  return (
    <main className="min-h-screen bg-background pb-8">
      {/* Image Carousel */}
      <div className="relative">
        <div className="relative aspect-[4/3] md:aspect-[16/9]">
          <Image
            src={school.images[currentImageIndex] || "/placeholder.svg"}
            alt={`${school.name} - afbeelding ${currentImageIndex + 1}`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-foreground/20" />
        </div>

        {/* Navigation */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link
            href="/"
            className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isFavorite 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card/90 backdrop-blur-sm text-foreground"
              )}
            >
              <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </button>
            <button className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Image dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {school.images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentImageIndex ? "bg-card w-4" : "bg-card/60"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-10">
        {/* Header Card */}
        <div className="bg-card rounded-2xl p-5 shadow-lg mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="font-serif text-2xl font-bold text-foreground leading-tight">
              {school.name}
            </h1>
            <div className="flex items-center gap-1 text-lg font-semibold text-foreground shrink-0">
              <Star className="w-5 h-5 fill-chart-3 text-chart-3" />
              {school.rating}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {school.distance}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {school.students.toLocaleString("nl-NL")} leerlingen
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {school.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-3">
            Waarom deze school?
          </h2>
          <ul className="space-y-2">
            {school.highlights.map((highlight, index) => (
              <li key={index} className="flex items-center gap-3 text-foreground">
                <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>

        {/* Description */}
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-3">
            Over deze school
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {school.description}
          </p>
        </div>

        {/* Open Days */}
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-3">
            Open dagen
          </h2>
          <div className="space-y-3">
            {school.openDays.map((openDay, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{openDay.date}</p>
                    <p className="text-sm text-muted-foreground">{openDay.time}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-full bg-transparent">
                  Toevoegen
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-3">
            Locatie
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">{school.address}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mijn notities
          </h2>
          <Textarea
            placeholder="Schrijf op wat je opviel tijdens je bezoek..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] border-0 bg-muted/50 resize-none"
          />
        </div>

        {/* Website Link */}
        <Button variant="outline" className="w-full h-12 rounded-xl bg-transparent" asChild>
          <a href="#" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Bezoek schoolwebsite
          </a>
        </Button>
      </div>
    </main>
  )
}
