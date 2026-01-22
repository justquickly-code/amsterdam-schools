"use client"

import React from "react"

import { useState } from "react"
import Image from "next/image"
import { Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HeroSectionProps {
  onSearch: () => void
}

export function HeroSection({ onSearch }: HeroSectionProps) {
  const [postcode, setPostcode] = useState("")
  const [advice, setAdvice] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (postcode) {
      onSearch()
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Hero Image */}
      <div className="absolute inset-0 h-[420px] md:h-[480px]">
        <Image
          src="/images/hero-bg.jpg"
          alt="Students discovering schools"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/20 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-12 pb-8">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-card">
            Scholenwijzer
          </h1>
          <p className="text-card/80 text-sm">Amsterdam</p>
        </div>

        {/* Main Heading */}
        <div className="mb-8 max-w-sm">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-card leading-tight text-balance">
            Ontdek jouw nieuwe school
          </h2>
          <p className="mt-3 text-card/90 text-base leading-relaxed">
            Welke middelbare school past bij jou? Begin je zoektocht hier.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div className="bg-card rounded-2xl p-4 shadow-lg space-y-3">
            <div>
              <label htmlFor="postcode" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Postcode
              </label>
              <Input
                id="postcode"
                type="text"
                placeholder="bijv. 1012 AB"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="mt-1 border-0 bg-muted/50 h-12 text-base placeholder:text-muted-foreground/60"
              />
            </div>
            
            <div>
              <label htmlFor="advice" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Schooladvies
              </label>
              <Select value={advice} onValueChange={setAdvice}>
                <SelectTrigger className="mt-1 border-0 bg-muted/50 h-12 text-base">
                  <SelectValue placeholder="Kies je advies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vmbo-b">VMBO Basis</SelectItem>
                  <SelectItem value="vmbo-k">VMBO Kader</SelectItem>
                  <SelectItem value="vmbo-gt">VMBO GT / MAVO</SelectItem>
                  <SelectItem value="havo">HAVO</SelectItem>
                  <SelectItem value="havo-vwo">HAVO / VWO</SelectItem>
                  <SelectItem value="vwo">VWO</SelectItem>
                  <SelectItem value="gymnasium">Gymnasium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              size="lg"
              className="w-full h-12 text-base font-medium rounded-xl"
            >
              <Search className="w-4 h-4 mr-2" />
              Zoek scholen
            </Button>
          </div>
        </form>
      </div>

      {/* Spacer for gradient */}
      <div className="h-8" />
    </section>
  )
}
