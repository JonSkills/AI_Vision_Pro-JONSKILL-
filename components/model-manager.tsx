"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Upload, Trash2, Database, CheckCircle, Clock, Target, HardDrive, AlertCircle } from "lucide-react"

interface ModelManagerProps {
  savedModels: string[]
  currentModelName: string
  isModelLoaded: boolean
  onSaveModel: (modelName: string) => Promise<boolean>
  onLoadModel: (modelName: string) => Promise<boolean>
  onDeleteModel: (modelName: string) => Promise<boolean>
  getModelMetadata: (modelName: string) => any
}

export function ModelManager({
  savedModels,
  currentModelName,
  isModelLoaded,
  onSaveModel,
  onLoadModel,
  onDeleteModel,
  getModelMetadata,
}: ModelManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [newModelName, setNewModelName] = useState("")
  const [selectedModelToLoad, setSelectedModelToLoad] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveModel = async () => {
    if (!newModelName.trim()) {
      alert("Введите название модели!")
      return
    }

    setIsLoading(true)
    const success = await onSaveModel(newModelName.trim())
    setIsLoading(false)

    if (success) {
      setShowSaveDialog(false)
      setNewModelName("")
    }
  }

  const handleLoadModel = async () => {
    if (!selectedModelToLoad) {
      alert("Выберите модель для загрузки!")
      return
    }

    setIsLoading(true)
    const success = await onLoadModel(selectedModelToLoad)
    setIsLoading(false)

    if (success) {
      setShowLoadDialog(false)
      setSelectedModelToLoad("")
    }
  }

  const handleDeleteModel = async (modelName: string) => {
    if (confirm(`Вы уверены, что хотите удалить модель "${modelName}"?`)) {
      setIsLoading(true)
      await onDeleteModel(modelName)
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ru-RU")
  }

  const getStorageUsage = () => {
    let totalSize = 0
    for (const key in localStorage) {
      if (key.startsWith("tensorflowjs_") || key.startsWith("model_metadata_")) {
        totalSize += localStorage[key].length
      }
    }
    return (totalSize / 1024 / 1024).toFixed(2) // MB
  }

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5" />
            Менеджер моделей
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <HardDrive className="h-3 w-3" />
            {getStorageUsage()} MB
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Текущая активная модель */}
        {isModelLoaded && currentModelName && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Активная модель
                </p>
                <p className="text-sm text-gray-300">{currentModelName}</p>
              </div>
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                Загружена
              </Badge>
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowSaveDialog(true)}
            disabled={!isModelLoaded || isLoading}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Save className="h-4 w-4 mr-2" />
            Сохранить
          </Button>

          <Button
            onClick={() => setShowLoadDialog(true)}
            disabled={savedModels.length === 0 || isLoading}
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Upload className="h-4 w-4 mr-2" />
            Загрузить
          </Button>
        </div>

        {/* Список сохраненных моделей */}
        {savedModels.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Сохраненные модели</p>
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                {savedModels.length}
              </Badge>
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {savedModels.map((modelName) => {
                  const metadata = getModelMetadata(modelName)
                  const isActive = currentModelName === modelName

                  return (
                    <div
                      key={modelName}
                      className={`p-3 rounded-lg border transition-colors ${
                        isActive
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-gray-800/50 border-gray-600/30 hover:bg-gray-800/70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isActive ? "text-green-400" : "text-gray-300"}`}>
                            {modelName}
                          </p>

                          {metadata && (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {(metadata.stats.accuracy * 100).toFixed(1)}%
                                </div>
                                <div className="flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  {metadata.datasetSize} образцов
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDate(metadata.timestamp)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-3">
                          {!isActive && (
                            <Button
                              onClick={() => onLoadModel(modelName)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              disabled={isLoading}
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteModel(modelName)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <Alert className="bg-gray-500/10 border-gray-500/20">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <AlertDescription className="text-gray-400">
              Нет сохраненных моделей. Обучите и сохраните модель для дальнейшего использования.
            </AlertDescription>
          </Alert>
        )}

        {/* Диалог сохранения */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96 max-w-[90vw]">
              <h3 className="text-lg font-semibold text-white mb-4">Сохранить модель</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Название модели:</label>
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Например: books_detector_v1"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSaveModel()}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Используйте понятные названия для легкого поиска</p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveModel} className="flex-1" disabled={isLoading || !newModelName.trim()}>
                    {isLoading ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSaveDialog(false)
                      setNewModelName("")
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Диалог загрузки */}
        {showLoadDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96 max-w-[90vw]">
              <h3 className="text-lg font-semibold text-white mb-4">Загрузить модель</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Выберите модель:</label>
                  <select
                    value={selectedModelToLoad}
                    onChange={(e) => setSelectedModelToLoad(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    disabled={isLoading}
                  >
                    <option value="">-- Выберите модель --</option>
                    {savedModels.map((modelName) => {
                      const metadata = getModelMetadata(modelName)
                      return (
                        <option key={modelName} value={modelName}>
                          {modelName}
                          {metadata && ` (${(metadata.stats.accuracy * 100).toFixed(1)}%)`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {selectedModelToLoad && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-400 text-sm font-medium">Информация о модели:</p>
                    {(() => {
                      const metadata = getModelMetadata(selectedModelToLoad)
                      return metadata ? (
                        <div className="mt-1 text-xs text-gray-400 space-y-1">
                          <div>Точность: {(metadata.stats.accuracy * 100).toFixed(1)}%</div>
                          <div>Образцов: {metadata.datasetSize}</div>
                          <div>Создана: {formatDate(metadata.timestamp)}</div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Метаданные недоступны</p>
                      )
                    })()}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleLoadModel} className="flex-1" disabled={isLoading || !selectedModelToLoad}>
                    {isLoading ? "Загрузка..." : "Загрузить"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowLoadDialog(false)
                      setSelectedModelToLoad("")
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
