"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileImage, Folder, Trash2, CheckCircle, AlertCircle, X } from "lucide-react"

interface DatasetUploaderProps {
  dataset: { [className: string]: ImageData[] }
  onAddToDataset: (className: string, imageData: ImageData) => void
  onClearDataset: () => void
}

export function DatasetUploader({ dataset, onAddToDataset, onClearDataset }: DatasetUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStats, setUploadStats] = useState<{
    total: number
    processed: number
    errors: number
  }>({ total: 0, processed: 0, errors: 0 })
  const [selectedClass, setSelectedClass] = useState("book")
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const classNames = [
    { id: "book", name: "Книга", color: "bg-blue-500" },
    { id: "cube", name: "Кубик", color: "bg-green-500" },
    { id: "phone", name: "Телефон", color: "bg-purple-500" },
  ]

  // Обработка изображения и добавление в датасет
  const processImage = useCallback(
    (file: File, className: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image()
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          resolve(false)
          return
        }

        img.onload = () => {
          // Устанавливаем размер canvas
          canvas.width = 64
          canvas.height = 64

          // Рисуем изображение с масштабированием
          ctx.drawImage(img, 0, 0, 64, 64)

          // Получаем ImageData
          const imageData = ctx.getImageData(0, 0, 64, 64)

          // Добавляем в датасет
          onAddToDataset(className, imageData)
          resolve(true)
        }

        img.onerror = () => resolve(false)

        // Создаем URL для изображения
        img.src = URL.createObjectURL(file)
      })
    },
    [onAddToDataset],
  )

  // Обработка файлов
  const processFiles = useCallback(
    async (files: FileList, className: string) => {
      setIsProcessing(true)
      setUploadProgress(0)

      const imageFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("image/") &&
          (file.type.includes("jpeg") ||
            file.type.includes("jpg") ||
            file.type.includes("png") ||
            file.type.includes("webp")),
      )

      if (imageFiles.length === 0) {
        alert("Не найдено подходящих изображений! Поддерживаются форматы: JPG, PNG, WebP")
        setIsProcessing(false)
        return
      }

      const stats = { total: imageFiles.length, processed: 0, errors: 0 }
      setUploadStats(stats)

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const success = await processImage(file, className)

        if (success) {
          stats.processed++
        } else {
          stats.errors++
        }

        setUploadStats({ ...stats })
        setUploadProgress(((i + 1) / imageFiles.length) * 100)

        // Небольшая задержка для плавности UI
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      setIsProcessing(false)
      setUploadProgress(0)
    },
    [processImage],
  )

  // Обработка загрузки отдельных файлов
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length > 0) {
        processFiles(files, selectedClass)
      }
      // Сбрасываем input для возможности повторной загрузки тех же файлов
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [processFiles, selectedClass],
  )

  // Обработка загрузки папки
  const handleFolderUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length > 0) {
        // Группируем файлы по папкам
        const filesByFolder: { [folderName: string]: File[] } = {}

        Array.from(files).forEach((file) => {
          const pathParts = file.webkitRelativePath.split("/")
          if (pathParts.length > 1) {
            const folderName = pathParts[1] // Берем первую подпапку
            if (!filesByFolder[folderName]) {
              filesByFolder[folderName] = []
            }
            filesByFolder[folderName].push(file)
          }
        })

        // Обрабатываем каждую папку как отдельный класс
        Object.entries(filesByFolder).forEach(([folderName, folderFiles]) => {
          // Пытаемся сопоставить название папки с классами
          let targetClass = selectedClass
          const lowerFolderName = folderName.toLowerCase()

          if (lowerFolderName.includes("book") || lowerFolderName.includes("книг")) {
            targetClass = "book"
          } else if (lowerFolderName.includes("cube") || lowerFolderName.includes("куб")) {
            targetClass = "cube"
          } else if (lowerFolderName.includes("phone") || lowerFolderName.includes("телефон")) {
            targetClass = "phone"
          }

          const fileList = new DataTransfer()
          folderFiles.forEach((file) => fileList.items.add(file))
          processFiles(fileList.files, targetClass)
        })
      }

      // Сбрасываем input
      if (folderInputRef.current) {
        folderInputRef.current.value = ""
      }
    },
    [processFiles, selectedClass],
  )

  // Drag & Drop обработчики
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files, selectedClass)
      }
    },
    [processFiles, selectedClass],
  )

  const getTotalSamples = () => {
    return Object.values(dataset).reduce((sum, samples) => sum + samples.length, 0)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Область загрузки */}
      <div className="lg:col-span-2">
        <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Загрузка датасета
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Выбор класса */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Класс для загружаемых изображений:</label>
              <div className="flex gap-2 flex-wrap">
                {classNames.map((cls) => (
                  <Button
                    key={cls.id}
                    variant={selectedClass === cls.id ? "default" : "outline"}
                    onClick={() => setSelectedClass(cls.id)}
                    disabled={isProcessing}
                    className={selectedClass === cls.id ? `${cls.color} hover:opacity-80` : ""}
                  >
                    {cls.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Drag & Drop область */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">Перетащите изображения сюда</p>
              <p className="text-sm text-gray-500 mb-4">или выберите файлы</p>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  variant="outline"
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Выбрать файлы
                </Button>

                <Button
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isProcessing}
                  variant="outline"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Выбрать папку
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4">Поддерживаемые форматы: JPG, PNG, WebP</p>
            </div>

            {/* Прогресс загрузки */}
            {isProcessing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white">Обработка изображений...</span>
                  <span className="text-gray-400">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-blue-400 font-semibold">{uploadStats.total}</p>
                    <p className="text-gray-500">Всего</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 font-semibold">{uploadStats.processed}</p>
                    <p className="text-gray-500">Обработано</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400 font-semibold">{uploadStats.errors}</p>
                    <p className="text-gray-500">Ошибок</p>
                  </div>
                </div>
              </div>
            )}

            {/* Инструкции */}
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <div className="space-y-2">
                  <p>
                    <strong>Советы по загрузке:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Для лучшего качества используйте изображения размером от 64x64 пикселей</li>
                    <li>При загрузке папки файлы автоматически сортируются по подпапкам</li>
                    <li>Названия подпапок: "book", "cube", "phone" определят класс автоматически</li>
                    <li>Рекомендуется 30+ изображений на класс для качественного обучения</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Скрытые input элементы */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              webkitdirectory=""
              onChange={handleFolderUpload}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>

      {/* Статистика датасета */}
      <div className="space-y-6">
        <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Статистика датасета
              </CardTitle>
              <Button
                onClick={onClearDataset}
                variant="destructive"
                size="sm"
                disabled={getTotalSamples() === 0 || isProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{getTotalSamples()}</p>
              <p className="text-sm text-gray-400">Всего изображений</p>
            </div>

            <div className="space-y-3">
              {classNames.map((cls) => {
                const count = dataset[cls.id]?.length || 0
                const isGood = count >= 30
                const isOk = count >= 10

                return (
                  <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${cls.color}`} />
                      <span className="text-gray-300 font-medium">{cls.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        {count}
                      </Badge>
                      {isGood ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : isOk ? (
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {getTotalSamples() > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <span>30+ изображений - отлично</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-400" />
                    <span>10-29 изображений - хорошо</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="h-3 w-3 text-red-400" />
                    <span>Менее 10 - недостаточно</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Быстрые действия */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-sm">Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
              className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Добавить изображения
            </Button>

            <Button
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
              className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <Folder className="h-4 w-4 mr-2" />
              Загрузить папку с классами
            </Button>

            {getTotalSamples() >= 20 && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300 text-sm">
                  Датасет готов для обучения! Перейдите на вкладку "Обучение".
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
