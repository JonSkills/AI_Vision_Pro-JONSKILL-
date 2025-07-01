"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, FileArchive, Database, CheckCircle } from "lucide-react"

interface DatasetExportProps {
  dataset: { [className: string]: ImageData[] }
  onImportDataset: (importedDataset: { [className: string]: ImageData[] }) => void
}

export function DatasetExport({ dataset, onImportDataset }: DatasetExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Экспорт датасета в JSON
  const exportDataset = async () => {
    if (Object.keys(dataset).length === 0) {
      alert("Датасет пуст!")
      return
    }

    setIsExporting(true)

    try {
      // Конвертируем ImageData в base64
      const exportData: { [className: string]: string[] } = {}

      for (const [className, images] of Object.entries(dataset)) {
        exportData[className] = []

        for (const imageData of images) {
          // Создаем canvas для конвертации ImageData в base64
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) continue

          canvas.width = imageData.width
          canvas.height = imageData.height
          ctx.putImageData(imageData, 0, 0)

          // Конвертируем в base64
          const base64 = canvas.toDataURL("image/png")
          exportData[className].push(base64)
        }
      }

      // Создаем файл для скачивания
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `dataset_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Ошибка экспорта:", error)
      alert("Ошибка при экспорте датасета")
    } finally {
      setIsExporting(false)
    }
  }

  // Импорт датасета из JSON
  const importDataset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string)
        const importedDataset: { [className: string]: ImageData[] } = {}

        for (const [className, base64Images] of Object.entries(jsonData)) {
          if (!Array.isArray(base64Images)) continue

          importedDataset[className] = []

          for (const base64 of base64Images as string[]) {
            // Конвертируем base64 обратно в ImageData
            const img = new Image()
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = base64
            })

            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            if (!ctx) continue

            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            importedDataset[className].push(imageData)
          }
        }

        onImportDataset(importedDataset)
        alert("Датасет успешно импортирован!")
      } catch (error) {
        console.error("Ошибка импорта:", error)
        alert("Ошибка при импорте датасета. Проверьте формат файла.")
      } finally {
        setIsImporting(false)
      }
    }

    reader.readAsText(file)
    event.target.value = "" // Сброс input
  }

  const getTotalSamples = () => {
    return Object.values(dataset).reduce((sum, samples) => sum + samples.length, 0)
  }

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileArchive className="h-5 w-5" />
          Экспорт/Импорт датасета
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Статистика */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">Текущий датасет:</span>
            </div>
            <span className="text-white font-semibold">{getTotalSamples()} образцов</span>
          </div>
        </div>

        {/* Кнопки экспорта/импорта */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={exportDataset}
            disabled={getTotalSamples() === 0 || isExporting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Экспорт..." : "Экспортировать датасет"}
          </Button>

          <div className="relative">
            <Button
              onClick={() => document.getElementById("dataset-import")?.click()}
              disabled={isImporting}
              variant="outline"
              className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Импорт..." : "Импортировать датасет"}
            </Button>
            <input id="dataset-import" type="file" accept=".json" onChange={importDataset} className="hidden" />
          </div>
        </div>

        {/* Информация */}
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <CheckCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300 text-sm">
            <div className="space-y-1">
              <p>
                <strong>Экспорт:</strong> Сохраняет весь датасет в JSON файл
              </p>
              <p>
                <strong>Импорт:</strong> Загружает датасет из JSON файла
              </p>
              <p>Используйте для резервного копирования или обмена датасетами</p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
