export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07111F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                <circle cx="20" cy="20" r="16" stroke="#5B8CFF" strokeWidth="3" fill="none"/>
                <path d="M20 4 A16 16 0 0 1 36 20" stroke="#5B8CFF" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <path d="M34 16 L36 20 L31 19" stroke="#5B8CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="20" cy="20" r="3" fill="#5B8CFF"/>
              </svg>
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">CYCLO</span>
              <p className="text-[10px] text-[#5B8CFF] -mt-1 font-medium">by ACREDYTA</p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
