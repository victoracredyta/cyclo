'use client'

import { create } from 'zustand'

interface OnboardingState {
  step: number
  data: {
    agencyName: string
    logoUrl: string
    primaryColor: string
    secondaryColor: string
    tagline: string
    teamInvites: Array<{ email: string; permission: string }>
    firstClient: { name: string; sector: string; mrr: string; email: string; services: string[] } | null
  }
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setData: (partial: Partial<OnboardingState['data']>) => void
  reset: () => void
}

const initialData = {
  agencyName: '',
  logoUrl: '',
  primaryColor: '#5B8CFF',
  secondaryColor: '#12B981',
  tagline: '',
  teamInvites: [],
  firstClient: null,
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  data: initialData,
  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 6) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  setData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
  reset: () => set({ step: 1, data: initialData }),
}))
