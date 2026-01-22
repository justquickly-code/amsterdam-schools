"use client"

import { useState } from "react"
import { HeroSection } from "@/components/hero-section"
import { SchoolCard } from "@/components/school-card"
import { JourneyProgress } from "@/components/journey-progress"
import { BottomNav } from "@/components/bottom-nav"

const mockSchools = [
  {
    id: "1",
    name: "Het Amsterdams Lyceum",
    image: "/images/school-1.jpg",
    distance: "1.2 km",
    students: 1250,
    rating: 8.4,
    tags: ["Creatief", "Internationaal"],
    openDay: "15 januari",
    friendsCount: 3,
  },
  {
    id: "2",
    name: "Montessori Lyceum",
    image: "/images/school-2.jpg",
    distance: "2.1 km",
    students: 890,
    rating: 8.1,
    tags: ["Zelfstandig", "Kleinschalig"],
    openDay: "22 januari",
    friendsCount: 1,
  },
  {
    id: "3",
    name: "Barlaeus Gymnasium",
    image: "/images/school-3.jpg",
    distance: "0.8 km",
    students: 1100,
    rating: 8.7,
    tags: ["Academisch", "Klassiek"],
    openDay: "18 januari",
    friendsCount: 5,
  },
  {
    id: "4",
    name: "IJburg College",
    image: "/images/school-4.jpg",
    distance: "3.5 km",
    students: 1450,
    rating: 7.9,
    tags: ["Sportief", "Modern"],
    openDay: "20 januari",
    friendsCount: 2,
  },
]

export default function HomePage() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [searchStarted, setSearchStarted] = useState(false)

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const handleSearch = () => {
    setSearchStarted(true)
  }

  return (
    <main className="min-h-screen pb-24">
      <HeroSection onSearch={handleSearch} />
      
      {searchStarted && (
        <div className="px-4 py-6">
          <JourneyProgress 
            currentStep={1} 
            schoolsDiscovered={mockSchools.length}
            shortlistCount={favorites.length}
          />
        </div>
      )}

      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            {searchStarted ? "Scholen bij jou in de buurt" : "Populaire scholen in Amsterdam"}
          </h2>
        </div>
        
        <div className="grid gap-4">
          {mockSchools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              isFavorite={favorites.includes(school.id)}
              onToggleFavorite={() => toggleFavorite(school.id)}
            />
          ))}
        </div>
      </section>

      <BottomNav activeTab="discover" favoritesCount={favorites.length} />
    </main>
  )
}
