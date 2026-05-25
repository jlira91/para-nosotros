export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ListType = 'restaurants' | 'movies' | 'series' | 'bucket' | 'gifts' | 'shopping' | 'custom'
export type ItemStatus = 'pending' | 'done' | 'skipped'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  couple_id: string | null
  created_at: string
}

export interface Couple {
  id: string
  user1_id: string
  user2_id: string | null
  couple_name: string | null
  created_at: string
}

export interface CoupleInvite {
  id: string
  code: string
  inviter_id: string
  used_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

export interface Folder {
  id: string
  couple_id: string
  name: string
  color: string
  icon: string
  created_by: string | null
  created_at: string
}

export interface Document {
  id: string
  couple_id: string
  folder_id: string | null
  name: string
  description: string | null
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

export interface List {
  id: string
  couple_id: string
  name: string
  type: ListType
  icon: string | null
  color: string
  created_by: string | null
  created_at: string
  item_count?: number
}

export interface ListItem {
  id: string
  list_id: string
  couple_id: string
  title: string
  notes: string | null
  url: string | null
  rating: number | null
  status: ItemStatus
  added_by: string | null
  completed_at: string | null
  created_at: string
}

export interface Birthday {
  id: string
  couple_id: string
  name: string
  birth_date: string
  relation: string | null
  notes: string | null
  added_by: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  couple_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  color: string
  location: string | null
  recurring: string | null
  created_by: string | null
  created_at: string
}

export interface Memory {
  id: string
  couple_id: string
  title: string
  content: string | null
  image_path: string | null
  mood: string | null
  created_by: string | null
  created_at: string
}

export type NoteCategory = 'general' | 'ideas' | 'importante' | 'recetas' | 'viajes' | 'pendiente'

export interface Note {
  id: string
  couple_id: string
  title: string
  content: string | null
  category: NoteCategory
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      couples: { Row: Couple; Insert: Partial<Couple>; Update: Partial<Couple> }
      couple_invites: { Row: CoupleInvite; Insert: Partial<CoupleInvite>; Update: Partial<CoupleInvite> }
      folders: { Row: Folder; Insert: Partial<Folder>; Update: Partial<Folder> }
      documents: { Row: Document; Insert: Partial<Document>; Update: Partial<Document> }
      lists: { Row: List; Insert: Partial<List>; Update: Partial<List> }
      list_items: { Row: ListItem; Insert: Partial<ListItem>; Update: Partial<ListItem> }
      birthdays: { Row: Birthday; Insert: Partial<Birthday>; Update: Partial<Birthday> }
      events: { Row: CalendarEvent; Insert: Partial<CalendarEvent>; Update: Partial<CalendarEvent> }
      memories: { Row: Memory; Insert: Partial<Memory>; Update: Partial<Memory> }
      notes: { Row: Note; Insert: Partial<Note>; Update: Partial<Note> }
    }
  }
}
