export interface School {
  id: string
  name: string
  image: string
  distance: string
  students: number
  rating: number
  tags: string[]
  openDay: string
  openDayTime?: string
  friendsCount: number
  address?: string
  description?: string
}

export const mockSchools: School[] = [
  {
    id: "1",
    name: "Het Amsterdams Lyceum",
    image: "/images/school-1.jpg",
    distance: "1.2 km",
    students: 1250,
    rating: 8.4,
    tags: ["Creatief", "Internationaal"],
    openDay: "15 januari",
    openDayTime: "10:00 - 14:00",
    friendsCount: 3,
    address: "Valeriusplein 15, Amsterdam",
    description: "Een dynamische school waar creativiteit en internationale oriëntatie centraal staan.",
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
    openDayTime: "09:00 - 13:00",
    friendsCount: 1,
    address: "Weteringschans 180, Amsterdam",
    description: "Leer op jouw eigen tempo in een ondersteunende omgeving.",
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
    openDayTime: "11:00 - 15:00",
    friendsCount: 5,
    address: "Weteringschans 60, Amsterdam",
    description: "Een toonaangevend gymnasium met een rijke traditie en moderne aanpak.",
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
    openDayTime: "10:00 - 14:00",
    friendsCount: 2,
    address: "Pampuslaan 2, Amsterdam-IJburg",
    description: "Een moderne school met veel aandacht voor sport en beweging.",
  },
]

export interface OpenDay {
  schoolId: string
  schoolName: string
  schoolImage: string
  date: string
  time: string
  registered: boolean
  address: string
}

export const mockOpenDays: OpenDay[] = mockSchools.map((school) => ({
  schoolId: school.id,
  schoolName: school.name,
  schoolImage: school.image,
  date: school.openDay,
  time: school.openDayTime || "10:00 - 14:00",
  registered: false,
  address: school.address || "",
}))
