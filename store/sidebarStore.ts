import { create } from 'zustand'

interface SidebarState {
  open: boolean
  openSidebar: () => void
  closeSidebar: () => void
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  open: false,
  openSidebar:  () => set({ open: true }),
  closeSidebar: () => set({ open: false }),
}))
