import React, { useRef, useState } from 'react'
import { CreditCard, Camera, Check, X, RotateCw, Sparkles, ArrowRight } from 'lucide-react'
import { optimizeImageFile } from '../utils/imageOptimizer'
import { warpPerspective, getDefaultCorners } from '../utils/perspective'
import { applyDocumentFilter, FILTER_TYPES } from '../utils/imageFilters'

export function IdCardComposer({ onCompleteIdCard, onClose }) {
  const [frontImage, setFrontImage] = useState(null)
  const [backImage, setBackImage] = useState(null)
  const [activeStep, setActiveStep] = useState('front') // 'front' | 'back' | 'review'
  const [isProcessing, setIsProcessing] = useState(false)

  const cameraInputRef = useRef(null)

  const handleCapture = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    try {
      setIsProcessing(true)
      const opt = await optimizeImageFile(file, 1600)
      if (activeStep === 'front') {
        setFrontImage(opt.dataUrl)
        setActiveStep('back')
      } else if (activeStep === 'back') {
        setBackImage(opt.dataUrl)
        setActiveStep('review')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
      e.target.value = ''
    }
  }

  const handleCompose = async () => {
    if (!frontImage || !backImage) return

    // Compose both on a standard A4 canvas (1754 x 2480 @ 150 DPI)
    const a4W = 1600
    const a4H = Math.round(1600 * 1.414) // A4 ratio ~2262px

    const canvas = document.createElement('canvas')
    canvas.width = a4W
    canvas.height = a4H
    const ctx = canvas.getContext('2d')

    // Clean white page
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, a4W, a4H)

    // Load images
    const load = (src) =>
      new Promise((res) => {
        const img = new Image()
        img.onload = () => res(img)
        img.src = src
      })

    const [imgFront, imgBack] = await Promise.all([load(frontImage), load(backImage)])

    // Calculate dimensions for standard ID Card (approx 85.6mm x 53.98mm)
    const cardW = Math.round(a4W * 0.72)
    const cardH = Math.round(cardW * (54 / 85.6))

    const marginX = (a4W - cardW) / 2
    const frontY = Math.round(a4H * 0.16)
    const backY = Math.round(a4H * 0.54)

    // Draw Title
    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('DOCUMENTO DE IDENTIDAD (ANVERSO / REVERSO)', a4W / 2, 70)

    // Draw Front
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.08)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetY = 6
    ctx.drawImage(imgFront, marginX, frontY, cardW, cardH)
    ctx.restore()

    // Draw Back
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.08)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetY = 6
    ctx.drawImage(imgBack, marginX, backY, cardW, cardH)
    ctx.restore()

    const composedDataUrl = canvas.toDataURL('image/jpeg', 0.94)

    onCompleteIdCard({
      id: `idcard_${Date.now()}`,
      originalUrl: composedDataUrl,
      previewUrl: composedDataUrl,
      processedUrl: composedDataUrl,
      width: a4W,
      height: a4H,
      corners: getDefaultCorners(a4W, a4H),
      filter: FILTER_TYPES.COLOR_DOC,
      filterOptions: { brightness: 0, contrast: 0, sharpness: 0 },
      title: 'Cédula de Identidad'
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Modo Cédula / Tarjeta ID</h3>
              <p className="text-[11px] text-slate-500">
                Une el Frente y el Reverso en una sola hoja A4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Visual Indicator */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Step 1: Front */}
          <div
            onClick={() => {
              setActiveStep('front')
              cameraInputRef.current?.click()
            }}
            className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition ${
              frontImage
                ? 'border-emerald-500 bg-emerald-50/50'
                : activeStep === 'front'
                ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">
              Paso 1: Frente (Anverso)
            </span>
            {frontImage ? (
              <div className="aspect-[85/54] bg-white rounded-lg overflow-hidden border border-emerald-300 shadow-xs">
                <img src={frontImage} alt="Frente" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="py-4 text-blue-600 font-bold text-xs flex flex-col items-center justify-center gap-1">
                <Camera className="w-5 h-5" />
                <span>Tomar Frente</span>
              </div>
            )}
          </div>

          {/* Step 2: Back */}
          <div
            onClick={() => {
              setActiveStep('back')
              cameraInputRef.current?.click()
            }}
            className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition ${
              backImage
                ? 'border-emerald-500 bg-emerald-50/50'
                : activeStep === 'back'
                ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">
              Paso 2: Reverso (Atrás)
            </span>
            {backImage ? (
              <div className="aspect-[85/54] bg-white rounded-lg overflow-hidden border border-emerald-300 shadow-xs">
                <img src={backImage} alt="Reverso" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="py-4 text-blue-600 font-bold text-xs flex flex-col items-center justify-center gap-1">
                <Camera className="w-5 h-5" />
                <span>Tomar Reverso</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {frontImage && backImage ? (
            <button
              onClick={handleCompose}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-98 transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Unir en Hoja A4 y Abrir Escáner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => cameraInputRef.current?.click()}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md active:scale-98 transition"
            >
              <Camera className="w-4 h-4" />
              <span>
                {activeStep === 'front' ? 'Tomar Foto del Frente' : 'Tomar Foto del Reverso'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
