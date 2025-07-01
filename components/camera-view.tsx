"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, AlertCircle } from "lucide-react"

interface CameraViewProps {
  isActive: boolean
  currentDetection: {
    object: string
    confidence: number
    timestamp: number
  } | null
  onPredict?: (imageData: ImageData) => void
  isModelLoaded?: boolean
}

export function CameraView({ isActive, currentDetection, onPredict, isModelLoaded }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const predictionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isActive) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isActive])

  // Автоматическое предсказание
  useEffect(() => {
    if (isActive && isModelLoaded && onPredict && videoRef.current) {
      predictionIntervalRef.current = setInterval(() => {
        captureAndPredict()
      }, 1000) // Предсказание каждую секунду
    } else {
      if (predictionIntervalRef.current) {
        clearInterval(predictionIntervalRef.current)
        predictionIntervalRef.current = null
      }
    }

    return () => {
      if (predictionIntervalRef.current) {
        clearInterval(predictionIntervalRef.current)
      }
    }
  }, [isActive, isModelLoaded, onPredict])

  const captureAndPredict = useCallback(() => {
    if (!videoRef.current || !onPredict) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 64
    canvas.height = 64

    // Рисуем текущий кадр видео на canvas
    ctx.drawImage(videoRef.current, 0, 0, 64, 64)

    // Получаем ImageData
    const imageData = ctx.getImageData(0, 0, 64, 64)

    // Отправляем на предсказание
    onPredict(imageData)
  }, [onPredict])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "environment",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setHasPermission(true)
        setError(null)
      }
    } catch (err) {
      console.error("Ошибка доступа к камере:", err)
      setHasPermission(false)
      setError("Не удалось получить доступ к камере. Проверьте разрешения.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current)
      predictionIntervalRef.current = null
    }
  }

  // Отрисовка детекции на canvas
  useEffect(() => {
    if (currentDetection && canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const video = videoRef.current

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const boxWidth = 200
        const boxHeight = 150

        // Цвет рамки зависит от уверенности
        const confidence = currentDetection.confidence
        const color = confidence > 0.8 ? "#10B981" : confidence > 0.6 ? "#F59E0B" : "#EF4444"

        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.strokeRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight)

        // Текст с результатом
        ctx.fillStyle = color
        ctx.font = "bold 16px Arial"
        const text = `${getObjectName(currentDetection.object)} (${(currentDetection.confidence * 100).toFixed(1)}%)`
        const textWidth = ctx.measureText(text).width

        // Фон для текста
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(centerX - textWidth / 2 - 10, centerY - boxHeight / 2 - 35, textWidth + 20, 25)

        // Текст
        ctx.fillStyle = color
        ctx.fillText(text, centerX - textWidth / 2, centerY - boxHeight / 2 - 15)
      }
    }
  }, [currentDetection])

  const getObjectName = (object: string) => {
    switch (object) {
      case "book":
        return "Книга"
      case "cube":
        return "Кубик"
      case "phone":
        return "Телефон"
      default:
        return object
    }
  }

  if (hasPermission === false || error) {
    return (
      <Alert className="bg-red-500/10 border-red-500/20">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          {error || "Доступ к камере запрещен. Разрешите использование камеры в настройках браузера."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="relative">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        {!isActive ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">
                {!isModelLoaded
                  ? "Сначала обучите модель на вкладке 'Обучение'"
                  : "Нажмите 'Запустить' для начала распознавания"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 w-full h-full" />

            {/* Индикатор активности */}
            <div className="absolute top-4 right-4">
              <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white text-sm">LIVE</span>
              </div>
            </div>

            {/* Текущее распознавание */}
            {currentDetection && (
              <div className="absolute bottom-4 left-4 right-4">
                <Card className="bg-black/70 backdrop-blur-sm border-green-500/30">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-400 font-semibold text-lg">{getObjectName(currentDetection.object)}</p>
                        <p className="text-gray-300 text-sm">
                          Уверенность: {(currentDetection.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">
                          {new Date(currentDetection.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
