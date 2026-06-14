export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas selection:bg-primary selection:text-white">
      {children}
    </div>
  )
}
