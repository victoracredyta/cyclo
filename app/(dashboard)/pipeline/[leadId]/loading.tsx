export default function LoadingLead() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-2 bg-muted rounded" />
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-32 bg-muted rounded-md" />
          <div className="h-8 w-24 bg-muted rounded-md" />
        </div>
      </div>

      {/* Stage bar */}
      <div className="px-5 py-3 border-b border-border flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-9 flex-1 bg-muted rounded-md" />
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[320px_1fr] gap-0 h-[calc(100vh-7rem)]">
        {/* Left detail panel */}
        <div className="border-r border-border p-5 space-y-4">
          <div className="h-5 w-24 bg-muted rounded" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Right tabs panel */}
        <div className="p-5 space-y-4">
          <div className="flex gap-3 border-b border-border pb-2">
            {['Histórico', 'Notas', 'Atividades', 'E-mails', 'Arquivos'].map(t => (
              <div key={t} className="h-6 w-20 bg-muted rounded" />
            ))}
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3 py-3">
              <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
