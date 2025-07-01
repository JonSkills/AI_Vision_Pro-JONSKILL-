"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Square, Trash2, Database, AlertCircle, Upload } from "lucide-react"
import { DatasetUploader } from "@/components/dataset-uploader"

interface DatasetRecorderProps {
  dataset: { [className: string]: ImageData[] }
  onAddToDataset: (className: string, imageData: ImageData) => void
  onClearDataset: () => void
}

export function DatasetRecorder({ dataset, onAddToDataset, onClearDataset }: DatasetRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [selectedClass, setSelectedClass] = useState("book")
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const classNames = [
    { id: "book", name: "Книга", color: "bg-blue-500" },
    { id: "cube", name: "Кубик", color: "bg-green-500" },
    { id: "phone", name: "Телефон", color: "bg-purple-500" },
  ]

  useEffect(() => {
    return () => {
      stopRecording()
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setHasPermission(true)
        setError(null)
      }
    } catch (err) {
      console.error("Ошибка доступа к камере:", err)
      setHasPermission(false)
      setError("Не удалось получить доступ к камере.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const captureImage = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 64
    canvas.height = 64

    // Рисуем текущий кадр видео
    ctx.drawImage(videoRef.current, 0, 0, 64, 64)

    // Получаем ImageData
    const imageData = ctx.getImageData(0, 0, 64, 64)

    // Добавляем в датасет
    onAddToDataset(selectedClass, imageData)
  }

  const startRecording = async () => {
    await startCamera()
    setIsRecording(true)
    setRecordingProgress(0)

    let captureCount = 0
    const totalCaptures = 50 // Захватываем 50 изображений за 10 секунд

    recordingIntervalRef.current = setInterval(() => {
      captureImage()
      captureCount++
      setRecordingProgress((captureCount / totalCaptures) * 100)

      if (captureCount >= totalCaptures) {
        stopRecording()
      }
    }, 200) // Каждые 200мс

    // Автоматическая остановка через 10 секунд
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording()
    }, 10000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    setRecordingProgress(0)

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }

    stopCamera()
  }

  const getTotalSamples = () => {
    return Object.values(dataset).reduce((sum, samples) => sum + samples.length, 0)
  }

  if (hasPermission === false || error) {
    return (
      <Alert className="bg-red-500/10 border-red-500/20">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">{error || "Доступ к камере запрещен."}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Tabs defaultValue="upload" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 bg-black/40 border-white/10">
        <TabsTrigger value="upload" className="data-[state=active]:bg-purple-600">
          <Upload className="h-4 w-4 mr-2" />
          Загрузка файлов
        </TabsTrigger>
        <TabsTrigger value="camera" className="data-[state=active]:bg-purple-600">
          <Camera className="h-4 w-4 mr-2" />
          Запись с камеры
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <DatasetUploader dataset={dataset} onAddToDataset={onAddToDataset} onClearDataset={onClearDataset} />
      </TabsContent>

      <TabsContent value="camera">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Камера для записи */}
          <div className="lg:col-span-2">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Запись с камеры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Выбор класса */}
                <div className="flex gap-2 flex-wrap">
                  {classNames.map((cls) => (
                    <Button
                      key={cls.id}
                      variant={selectedClass === cls.id ? "default" : "outline"}
                      onClick={() => setSelectedClass(cls.id)}
                      disabled={isRecording}
                      className={selectedClass === cls.id ? `${cls.color} hover:opacity-80` : ""}
                    >
                      {cls.name}
                    </Button>
                  ))}
                </div>

                {/* Видео */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  {!isRecording ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">Выберите класс и нажмите "Начать запись"</p>
                        <Button
                          onClick={startRecording}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Начать запись ({classNames.find((c) => c.id === selectedClass)?.name})
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                      {/* Индикатор записи */}
                      <div className="absolute top-4 left-4 right-4">
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-white font-semibold">
                                Запись: {classNames.find((c) => c.id === selectedClass)?.name}
                              </span>
                            </div>
                            <Button onClick={stopRecording} variant="destructive" size="sm">
                              <Square className="h-4 w-4 mr-1" />
                              Стоп
                            </Button>
                          </div>
                          <Progress value={recordingProgress} className="h-2" />
                          <p className="text-xs text-gray-300 mt-1">Прогресс: {Math.round(recordingProgress)}%</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Статистика датасета */}
          <div className="space-y-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Датасет
                  </CardTitle>
                  <Button onClick={onClearDataset} variant="destructive" size="sm" disabled={getTotalSamples() === 0}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{getTotalSamples()}</p>
                  <p className="text-sm text-gray-400">Всего образцов</p>
                </div>

                <div className="space-y-3">
                  {classNames.map((cls) => {
                    const count = dataset[cls.id]?.length || 0
                    return (
                      <div key={cls.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${cls.color}`} />
                          <span className="text-gray-300">{cls.name}</span>
                        </div>
                        <Badge variant="outline" className="border-gray-600 text-gray-400">
                          {count}
                        </Badge>
                      </div>
                    )
                  })}
                </div>

                {getTotalSamples() > 0 && (
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 text-center">
                      Рекомендуется минимум 30 образцов на класс для качественного обучения
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
