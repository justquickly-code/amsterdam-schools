"use client"

import * as React from "react"
import { Search, School, Calendar, MapPin, Heart, Star, Plus, Inbox } from "lucide-react"
import {
  AppHeader,
  BottomNav,
  SchoolCard,
  InfoCard,
  StickerChip,
  Callout,
  ListRow,
  ListGroup,
  Chip,
  ChipGroup,
  SearchInput,
  SelectDropdown,
  SKButton,
  EmptyState,
  Toast,
  ToastContainer,
  ProgressCard,
} from "@/components/schoolkeuze"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

export default function UIKitShowcase() {
  const [activeNav, setActiveNav] = React.useState("dashboard")
  const [searchValue, setSearchValue] = React.useState("")
  const [selectValue, setSelectValue] = React.useState("")
  const [showToast, setShowToast] = React.useState(true)
  const searchParams = useSearchParams()

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Toast Demo */}
      {showToast && (
        <ToastContainer>
          <Toast
            variant="success"
            title="School added!"
            description="Berlage Lyceum is now in your shortlist."
            onClose={() => setShowToast(false)}
          />
        </ToastContainer>
      )}

      {/* App Header */}
      <AppHeader showNotification hasUnreadNotification />

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* Page Title */}
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          {"Hanna's Dashboard"}
        </h1>

        {/* Progress Card */}
        <section className="mb-6">
          <ProgressCard
            progress={100}
            totalSteps={7}
            completedSteps={7}
            message="You're all set. Nice work!"
            recentActivity="Overview done, Visit marked"
          />
        </section>

        {/* Info Card - Important Dates */}
        <section className="mb-6">
          <InfoCard title="Next important dates">
            <ListGroup dividers>
              <ListRow
                title="Explore (Nov–Feb)"
                value="17 Nov–13 Feb"
              />
              <ListRow
                title="Provisional advice (January)"
                value="1 Jan–31 Jan"
              />
            </ListGroup>
          </InfoCard>
        </section>

        {/* Info Card - Upcoming Open Days */}
        <section className="mb-6">
          <InfoCard title="Upcoming open days • Shortlist">
            <ListGroup dividers>
              <ListRow title="Berlage Lyceum" value="21/01/2026" showArrow />
              <ListRow title="Barlaeus Gymnasium" value="23/01/2026" showArrow />
              <ListRow title="Barlaeus Gymnasium" value="24/01/2026" showArrow />
            </ListGroup>
          </InfoCard>
        </section>

        {/* Divider */}
        <div className="my-8 border-t border-border" />

        {/* UI Kit Components Showcase */}
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          UI Kit Components
        </h2>

        {/* Sticker Chips */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Sticker Chips</h3>
          <ChipGroup>
            <StickerChip variant="visited" />
            <StickerChip variant="planned" />
            <StickerChip variant="favourite" />
          </ChipGroup>
        </section>

        {/* General Chips */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Chips</h3>
          <ChipGroup>
            <Chip variant="default">Default</Chip>
            <Chip variant="primary">Primary</Chip>
            <Chip variant="info">Info</Chip>
            <Chip variant="progress">Progress</Chip>
            <Chip variant="outline">Outline</Chip>
            <Chip variant="default" removable onRemove={() => {}}>Removable</Chip>
          </ChipGroup>
        </section>

        {/* Buttons */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Buttons</h3>
          <div className="flex flex-col gap-3">
            <SKButton variant="primary" fullWidth>Primary Button</SKButton>
            <SKButton variant="secondary" fullWidth>Secondary Button</SKButton>
            <SKButton variant="tertiary" fullWidth>Tertiary Button</SKButton>
            <SKButton variant="outline" fullWidth>Outline Button</SKButton>
            <SKButton variant="info" fullWidth>Info Button</SKButton>
            <div className="flex gap-3">
              <SKButton variant="primary" size="icon">
                <Plus />
              </SKButton>
              <SKButton variant="secondary" size="icon">
                <Heart />
              </SKButton>
              <SKButton variant="outline" size="icon">
                <Star />
              </SKButton>
            </div>
          </div>
        </section>

        {/* Search Input */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Search Input</h3>
          <SearchInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder="Search schools..."
          />
        </section>

        {/* Select Dropdown */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Select Dropdown</h3>
          <SelectDropdown
            label="School type"
            value={selectValue}
            onChange={setSelectValue}
            placeholder="Choose a school type"
            options={[
              { value: "gymnasium", label: "Gymnasium" },
              { value: "vwo", label: "VWO" },
              { value: "havo", label: "HAVO" },
              { value: "vmbo", label: "VMBO" },
            ]}
          />
        </section>

        {/* Callouts */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Callouts</h3>
          <div className="flex flex-col gap-3">
            <Callout variant="info" title="Tip">
              Start exploring schools early to find the best fit.
            </Callout>
            <Callout variant="success" title="Great progress!">
              {"You've completed all the required steps."}
            </Callout>
            <Callout variant="warning" title="Deadline approaching">
              Submit your application before February 1st.
            </Callout>
            <Callout variant="error" title="Action required">
              Please complete your profile information.
            </Callout>
          </div>
        </section>

        {/* School Cards */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">School Cards</h3>
          <div className="flex flex-col gap-3">
            <SchoolCard
              title="Berlage Lyceum"
              subtitle="Amsterdam-Zuid"
              stickers={["visited", "favourite"]}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                <span>2.3 km</span>
                <span>•</span>
                <School className="size-4" />
                <span>Gymnasium, VWO</span>
              </div>
            </SchoolCard>
            <SchoolCard
              title="Barlaeus Gymnasium"
              subtitle="Amsterdam-Centrum"
              stickers={["planned"]}
              onClick={() => {}}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <span>Open day: 23 Jan 2026</span>
              </div>
            </SchoolCard>
          </div>
        </section>

        {/* List Rows */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">List Rows</h3>
          <div className="rounded-2xl border border-border bg-card p-4">
            <ListGroup dividers>
              <ListRow
                icon={<School className="size-5" />}
                title="Browse schools"
                subtitle="Find schools near you"
                showArrow
                onClick={() => {}}
              />
              <ListRow
                icon={<Calendar className="size-5" />}
                title="Open days"
                subtitle="3 upcoming events"
                stickers={["planned"]}
                showArrow
                onClick={() => {}}
              />
              <ListRow
                icon={<Star className="size-5" />}
                title="Shortlist"
                subtitle="5 schools saved"
                showArrow
                onClick={() => {}}
              />
            </ListGroup>
          </div>
        </section>

        {/* Empty State */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Empty State</h3>
          <EmptyState
            icon={<Inbox className="size-8" />}
            title="No schools yet"
            description="Start exploring schools to add them to your shortlist."
            action={
              <SKButton variant="primary" size="sm">
                <Search className="size-4" />
                Explore schools
              </SKButton>
            }
          />
        </section>

        {/* Toast Examples */}
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Toast Variants</h3>
          <div className="flex flex-col gap-3">
            <Toast variant="default" title="Notification" description="This is a default toast message." />
            <Toast variant="success" title="Success!" description="Your changes have been saved." />
            <Toast variant="info" title="Did you know?" description="You can filter schools by type." />
            <Toast variant="warning" title="Warning" description="Your session will expire soon." />
            <Toast variant="error" title="Error" description="Something went wrong. Please try again." />
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeId={activeNav} onNavigate={setActiveNav} />
    </div>
  )
}
