"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, Zap, Target, Clock, AlertCircle, CheckCircle } from "lucide-react"
import { Save, Upload, Trash2, Database } from "lucide-react"
import { useState } from "react"

interface ModelTrainerProps {
  dataset: { [className: string]: ImageData[] }
  isTraining: boolean
  trainingProgress: number
  onTrainModel: () => void
  modelStats: {
    accuracy: number
    loss: number
    epochs: number
    classes: string[]
  }
  savedModels: string[]
  currentModelName: string
  onSaveModel: (modelName: string) => Promise<boolean>
  onLoadModel: (modelName: string) => Promise<boolean>
  onDeleteModel: (modelName: string) => Promise<boolean>
  getModelMetadata: (modelName: string) => any
}

export function ModelTrainer({
  dataset,
  isTraining,
  trainingProgress,
  onTrainModel,
  modelStats,
  savedModels,
  currentModelName,
  onSaveModel,
  onLoadModel,
  onDeleteModel,
  getModelMetadata,
}: ModelTrainerProps) {
  const getTotalSamples = () => {
    return Object.values(dataset).reduce((sum, samples) => sum + samples.length, 0)
  }

  const getMinSamples = () => {
    const counts = Object.values(dataset).map((samples) => samples.length)
    return counts.length > 0 ? Math.min(...counts) : 0
  }

  const canTrain = () => {
    const totalSamples = getTotalSamples()
    const minSamples = getMinSamples()
    const hasAllClasses = Object.keys(dataset).length >= 2

    return totalSamples >= 20 && minSamples >= 5 && hasAllClasses
  }

  const getTrainingRecommendations = () => {
    const recommendations = []
    const totalSamples = getTotalSamples()
    const minSamples = getMinSamples()
    const classCount = Object.keys(dataset).length

    if (totalSamples < 20) {
      recommendations.push("Соберите минимум 20 образцов для обучения")
    }

    if (minSamples < 5) {
      recommendations.push("Каждый класс должен содержать минимум 5 образцов")
    }

    if (classCount < 2) {
      recommendations.push("Необходимо минимум 2 класса для обучения")
    }

    if (minSamples < 30 && totalSamples >= 20) {
      recommendations.push("Рекомендуется 30+ образцов на класс для лучшего качества")
    }

    return recommendations
  }

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [newModelName, setNewModelName] = useState("")
  const [selectedModelToLoad, setSelectedModelToLoad] = useState("")

  const handleSaveModel = async () => {
    if (!newModelName.trim()) {
      alert("Введите название модели!")
      return
    }

    const success = await onSaveModel(newModelName.trim())
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

    const success = await onLoadModel(selectedModelToLoad)
    if (success) {
      setShowLoadDialog(false)
      setSelectedModelToLoad("")
    }
  }

  const handleDeleteModel = async (modelName: string) => {
    if (confirm(`Вы уверены, что хотите удалить модель "${modelName}"?`)) {
      await onDeleteModel(modelName)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Панель обучения */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Обучение модели
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Статус датасета */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{getTotalSamples()}</p>
                <p className="text-xs text-gray-400">Всего образцов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{Object.keys(dataset).length}</p>
                <p className="text-xs text-gray-400">Классов</p>
              </div>
            </div>

            {/* Детализация по классам */}
            <div className="space-y-2">
              {["book", "cube", "phone"].map((className) => {
                const count = dataset[className]?.length || 0
                const name = className === "book" ? "Книга" : className === "cube" ? "Кубик" : "Телефон"
                const isGood = count >= 30
                const isOk = count >= 10

                return (
                  <div key={className} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-300">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{count}</span>
                      {isGood ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : isOk ? (
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Рекомендации */}
          {!canTrain() && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <div className="space-y-1">
                  {getTrainingRecommendations().map((rec, index) => (
                    <div key={index}>• {rec}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Кнопка обучения */}
          <div className="space-y-4">
            {isTraining ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white">Обучение модели...</span>
                  <span className="text-gray-400">{trainingProgress}%</span>
                </div>
                <Progress value={trainingProgress} className="h-3" />
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Brain className="h-4 w-4 animate-spin" />
                  Эпоха {Math.ceil((trainingProgress / 100) * 20)} из 20
                </div>
              </div>
            ) : (
              <Button
                onClick={onTrainModel}
                disabled={!canTrain()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
              >
                <Zap className="h-4 w-4 mr-2" />
                {canTrain() ? "Начать обучение" : "Недостаточно данных"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Управление сохраненными моделями */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5" />
            Управление моделями
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Текущая модель */}
          {currentModelName && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-semibold">Активная модель</p>
                  <p className="text-sm text-gray-300">{currentModelName}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
          )}

          {/* Кнопки управления */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setShowSaveDialog(true)}
              disabled={!modelStats.epochs || isTraining}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>

            <Button
              onClick={() => setShowLoadDialog(true)}
              disabled={isTraining || savedModels.length === 0}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Загрузить
            </Button>
          </div>

          {/* Список сохраненных моделей */}
          {savedModels.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Сохраненные модели ({savedModels.length}):</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {savedModels.map((modelName) => {
                  const metadata = getModelMetadata(modelName)
                  const isActive = currentModelName === modelName

                  return (
                    <div
                      key={modelName}
                      className={`p-2 rounded border ${
                        isActive ? "bg-green-500/10 border-green-500/30" : "bg-gray-800/50 border-gray-600/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${isActive ? "text-green-400" : "text-gray-300"}`}
                          >
                            {modelName}
                          </p>
                          {metadata && (
                            <p className="text-xs text-gray-500">
                              {(metadata.stats.accuracy * 100).toFixed(1)}% • {metadata.datasetSize} образцов
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {!isActive && (
                            <Button
                              onClick={() => onLoadModel(modelName)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteModel(modelName)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Диалог сохранения */}
          {showSaveDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold text-white mb-4">Сохранить модель</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Название модели:</label>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="Например: model_books_v1"
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      onKeyPress={(e) => e.key === "Enter" && handleSaveModel()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveModel} className="flex-1">
                      Сохранить
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSaveDialog(false)
                        setNewModelName("")
                      }}
                      variant="outline"
                      className="flex-1"
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
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold text-white mb-4">Загрузить модель</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Выберите модель:</label>
                    <select
                      value={selectedModelToLoad}
                      onChange={(e) => setSelectedModelToLoad(e.target.value)}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    >
                      <option value="">-- Выберите модель --</option>
                      {savedModels.map((modelName) => {
                        const metadata = getModelMetadata(modelName)
                        return (
                          <option key={modelName} value={modelName}>
                            {modelName} {metadata && `(${(metadata.stats.accuracy * 100).toFixed(1)}%)`}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleLoadModel} className="flex-1">
                      Загрузить
                    </Button>
                    <Button
                      onClick={() => {
                        setShowLoadDialog(false)
                        setSelectedModelToLoad("")
                      }}
                      variant="outline"
                      className="flex-1"
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

      {/* Статистика модели */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Статистика модели
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {modelStats.epochs > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">{(modelStats.accuracy * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">Точность</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{modelStats.loss.toFixed(3)}</p>
                  <p className="text-xs text-gray-400">Потери</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Эпох обучения:</span>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                    {modelStats.epochs}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Архитектура:</span>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                    CNN
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Классы:</span>
                  <span className="text-sm text-gray-400">{modelStats.classes.length}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Статус:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm text-green-400">Готова</span>
                  </div>
                </div>
              </div>

              {/* Оценка качества */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-center">
                  {modelStats.accuracy > 0.9 ? (
                    <div className="text-green-400">
                      <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-sm">Отличное качество модели!</p>
                    </div>
                  ) : modelStats.accuracy > 0.7 ? (
                    <div className="text-yellow-400">
                      <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-sm">Хорошее качество модели</p>
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-sm">Требуется больше данных</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Модель не обучена</p>
              <p className="text-sm text-gray-500 mt-2">Соберите данные и запустите обучение</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
