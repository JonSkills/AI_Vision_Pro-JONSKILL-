"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, AlertCircle, CheckCircle } from "lucide-react"

interface CameraViewProps {
  onPredict?: (imageData: ImageData) => void
  isModelLoaded: boolean
  currentDetection: {
    object: string
    confidence: number
    timestamp: number
  } | null
}

export function CameraView({ onPredict, isModelLoaded, currentDetection }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Проверяем, что мы на клиенте
  useEffect(() => {
    setIsClient(true)
  }, [])

  const startCamera = async () => {
    if (!isClient) return

    try {
      setError(null)

      // Проверяем поддержку getUserMedia
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Ваш браузер не поддерживает доступ к камере")
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "environment", // Задняя камера на мобильных
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
        setStream(mediaStream)
        setIsStreaming(true)
      }
    } catch (err) {
      console.error("Ошибка доступа к камере:", err)
      let errorMessage = "Не удалось получить доступ к камере"

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage = "Доступ к камере запрещен. Разрешите доступ в настройках браузера."
        } else if (err.name === "NotFoundError") {
          errorMessage = "Камера не найдена. Подключите камеру и попробуйте снова."
        } else if (err.name === "NotSupportedError") {
          errorMessage = "Ваш браузер не поддерживает доступ к камере."
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !onPredict) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Устанавливаем размер canvas равным размеру видео
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Рисуем текущий кадр видео на canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Получаем ImageData для модели
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Отправляем на предсказание
    onPredict(imageData)
  }, [onPredict])

  // Автоматическое предсказание каждую секунду
  useEffect(() => {
    if (!isStreaming || !isModelLoaded) return

    const interval = setInterval(captureFrame, 1000)
    return () => clearInterval(interval)
  }, [isStreaming, isModelLoaded, captureFrame])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return "text-green-400"
    if (confidence > 0.6) return "text-yellow-400"
    return "text-red-400"
  }

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence > 0.8) return "default"
    if (confidence > 0.6) return "secondary"
    return "destructive"
  }

  const getObjectDisplayName = (object: string) => {
    const names: { [key: string]: string } = {
      book: "Книга",
      cube: "Кубик",
      phone: "Телефон",
    }
    return names[object] || object
  }

  if (!isClient) {
    return (
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Загрузка камеры...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Камера
          </div>
          <div className="flex items-center gap-2">
            {isModelLoaded ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Модель готова
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                <AlertCircle className="h-3 w-3 mr-1" />
                Модель не обучена
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Видео поток */}
        <div className="relative">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            {isStreaming ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Оверлей с результатами распознавания */}
                {currentDetection && isModelLoaded && (
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {getObjectDisplayName(currentDetection.object)}
                          </p>
                          <p className="text-gray-300 text-sm">
                            Обнаружено {new Date(currentDetection.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant={getConfidenceBadgeVariant(currentDetection.confidence)} className="text-sm">
                          {(currentDetection.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Индикатор записи */}
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-sm font-medium">LIVE</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                {error ? (
                  <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 font-semibold mb-2">Ошибка камеры</p>
                    <p className="text-gray-400 text-sm max-w-md">{error}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Нажмите "Включить камеру" для начала</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Управление камерой */}
        <div className="flex gap-2">
          {!isStreaming ? (
            <Button onClick={startCamera} className="flex-1 bg-green-600 hover:bg-green-700">
              <Camera className="h-4 w-4 mr-2" />
              Включить камеру
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="destructive" className="flex-1">
              <CameraOff className="h-4 w-4 mr-2" />
              Выключить камеру
            </Button>
          )}

          {isStreaming && (
            <Button onClick={captureFrame} variant="outline" disabled={!isModelLoaded}>
              Сделать снимок
            </Button>
          )}
        </div>

        {/* Предупреждения */}
        {!isModelLoaded && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <p className="text-yellow-300 text-sm">
                Сначала обучите модель на вкладке "Обучение" для распознавания объектов
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-red-300 text-sm font-medium">Проблема с доступом к камере</p>
                <p className="text-red-400 text-xs mt-1">
                  Убедитесь, что вы разрешили доступ к камере в настройках браузера
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
