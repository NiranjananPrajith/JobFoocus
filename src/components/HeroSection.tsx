'use client'

import { useEffect, useRef, useCallback } from 'react'
import Button from '@/components/design/Button'

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const posRef = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }
    posRef.current.x += (mouseRef.current.x - posRef.current.x) * 0.06
    posRef.current.y += (mouseRef.current.y - posRef.current.y) * 0.06

    ctx.clearRect(0, 0, w, h)

    const px = posRef.current.x
    const py = posRef.current.y
    const radius = Math.min(w * 0.5, 420)

    ctx.save()
    ctx.filter = 'blur(70px)'
    const grad = ctx.createRadialGradient(px, py, 0, px, py, radius)
    grad.addColorStop(0, 'rgba(250, 82, 15, 0.50)')
    grad.addColorStop(0.4, 'rgba(255, 140, 0, 0.30)')
    grad.addColorStop(0.7, 'rgba(255, 217, 0, 0.12)')
    grad.addColorStop(1, 'rgba(255, 248, 224, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.offsetParent?.getBoundingClientRect()
      const offsetX = rect ? rect.left : 0
      const offsetY = rect ? rect.top : 0
      mouseRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    canvas.addEventListener('mouseleave', handleMouseLeave)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return (
    <section className="relative overflow-hidden w-full">
      {/* Sunset gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, var(--sunshine-700) 0%, var(--sunshine-900) 50%, var(--primary) 100%)',
        }}
      />
      {/* Canvas bubble overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] w-full h-full pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text side */}
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.10em] mb-5"
              style={{ color: 'var(--ink-tint)' }}
            >
              Privacy-first AI for your job search
            </p>
            <h1
              className="text-[48px] md:text-[64px] xl:text-[76px] font-normal leading-[1.05] mb-6"
              style={{
                fontFamily: 'PP Editorial Old, Times New Roman, serif',
                letterSpacing: '-1.5px',
                color: 'var(--ink)',
              }}
            >
              Tailor your applications.
              <br />
              Protect your privacy.
              <br />
              Land the interview.
            </h1>
            <p
              className="text-[18px] leading-[1.60] max-w-[520px] mb-8"
              style={{ color: 'var(--ink-tint)' }}
            >
              Job Foocus uses privacy-first AI to automatically match your resume to any job description, drafts strategic follow-ups, and tracks your progress—all from a single dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="dark" className="px-6 py-3 text-[15px]">
                Start Customizing for Free
              </Button>
              <Button variant="secondary" className="px-6 py-3 text-[15px]">
                Install Extension{' '}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </Button>
            </div>
            <p className="text-[13px] mt-4" style={{ color: 'var(--ink-tint)' }}>
              No credit card required. Up to 5 resumes/mo free.
            </p>
          </div>

          {/* SVG split-screen mockup */}
          <div className="hidden lg:block">
            <div
              className="rounded-xl overflow-hidden shadow-[rgba(0,0,0,0.10)_0px_20px_40px_-8px]"
              style={{
                backgroundColor: 'var(--canvas)',
                border: '1px solid var(--hairline-soft)',
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-1.5 px-4 py-2.5 border-b"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--hairline-soft)' }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-[11px] ml-2" style={{ color: 'var(--steel)' }}>
                  JobFoocus — Resume Optimizer
                </span>
              </div>

              {/* Split content */}
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--hairline-soft)' }}>
                {/* Before */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--steel)' }}>Original</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--hairline)' }} />
                    <div className="h-2 rounded w-1/2" style={{ backgroundColor: 'var(--hairline-soft)' }} />
                    <div className="h-2 rounded w-full" style={{ backgroundColor: 'var(--hairline)' }} />
                    <div className="h-2 rounded w-5/6" style={{ backgroundColor: 'var(--hairline)' }} />
                    <div className="h-2 rounded w-2/3" style={{ backgroundColor: 'var(--hairline-soft)' }} />
                    <div className="h-2 rounded w-4/5" style={{ backgroundColor: 'var(--hairline)' }} />
                    <div className="h-2 rounded w-3/5" style={{ backgroundColor: 'var(--hairline-soft)' }} />
                    <div className="h-2 rounded w-full" style={{ backgroundColor: 'var(--hairline)' }} />
                  </div>
                </div>

                {/* After */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--steel)' }}>Tailored</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--cream-deeper)' }} />
                    <div className="h-2 rounded w-1/2" style={{ backgroundColor: 'var(--cream)' }} />
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <div className="h-2 rounded flex-1" style={{ backgroundColor: 'var(--cream-deeper)' }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <div className="h-2 rounded flex-1" style={{ backgroundColor: 'var(--cream-deeper)' }} />
                    </div>
                    <div className="h-2 rounded w-5/6" style={{ backgroundColor: 'var(--cream)' }} />
                    <div className="h-2 rounded w-4/5" style={{ backgroundColor: 'var(--cream)' }} />
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <div className="h-2 rounded flex-1" style={{ backgroundColor: 'var(--cream-deeper)' }} />
                    </div>
                    <div className="h-2 rounded w-full" style={{ backgroundColor: 'var(--cream)' }} />
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div
                className="px-4 py-2.5 border-t flex items-center justify-between"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--hairline-soft)' }}
              >
                <span className="text-[10px]" style={{ color: 'var(--steel)' }}>Keywords matched: <strong className="text-primary">12/14</strong></span>
                <span className="text-[10px] font-medium text-white px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--primary)' }}>
                  ATS Score: 94
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
