"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Brain, Eye, Database, Play, Square, Save } from "lucide-react"
import { CameraView } from "@/components/camera-view"
import { ModelStats } from "@/components/model-stats"
import { DetectionResults } from "@/components/detection-results"
import { DatasetRecorder } from "@/components/dataset-recorder"
import { ModelTrainer } from "@/components/model-trainer"
import { useMLModel } from "@/hooks/use-ml-model"
import { ModelManager } from "@/components/model-manager"
import { DatasetExport } from "@/components/dataset-export"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("recognition")
  const [isRecognitionActive, setIsRecognitionActive] = useState(false)

  const {
    model,
    isModelLoaded,
    isTraining,
    trainingProgress,
    currentDetection,
    detectionHistory,
    dataset,
    modelStats,
    savedModels,
    currentModelName,
    addToDataset,
    trainModel,
    predict,
    clearDataset,
    saveModel,
    loadModel,
    deleteModel,
    getSavedModels,
    getModelMetadata,
  } = useMLModel()

  const toggleRecognition = () => {
    setIsRecognitionActive(!isRecognitionActive)
  }

  // Функция для импорта датасета
  const handleImportDataset = (importedDataset: { [className: string]: ImageData[] }) => {
    // Объединяем импортированный датасет с существующим
    Object.entries(importedDataset).forEach(([className, images]) => {
      images.forEach((imageData) => {
        addToDataset(className, imageData)
      })
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Vision Pro</h1>
                <p className="text-sm text-gray-300">Система обучения и распознавания объектов</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="secondary"
                className={`${isModelLoaded ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}
              >
                <div
                  className={`w-2 h-2 ${isModelLoaded ? "bg-green-400" : "bg-yellow-400"} rounded-full mr-2 ${isModelLoaded ? "animate-pulse" : ""}`}
                />
                {isModelLoaded ? `Модель: ${currentModelName || "Без имени"}` : "Модель не обучена"}
              </Badge>
              {isTraining && (
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Brain className="h-3 w-3 mr-1 animate-spin" />
                  Обучение {trainingProgress}%
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-black/40 border-white/10">
            <TabsTrigger value="recognition" className="data-[state=active]:bg-purple-600">
              <Eye className="h-4 w-4 mr-2" />
              Распознавание
            </TabsTrigger>
            <TabsTrigger value="dataset" className="data-[state=active]:bg-purple-600">
              <Database className="h-4 w-4 mr-2" />
              Датасет
            </TabsTrigger>
            <TabsTrigger value="training" className="data-[state=active]:bg-purple-600">
              <Brain className="h-4 w-4 mr-2" />
              Обучение
            </TabsTrigger>
            <TabsTrigger value="models" className="data-[state=active]:bg-purple-600">
              <Save className="h-4 w-4 mr-2" />
              Модели
            </TabsTrigger>
          </TabsList>

          {/* Вкладка распознавания */}
          <TabsContent value="recognition" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Camera className="h-5 w-5" />
                          Распознавание в реальном времени
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                          {isModelLoaded
                            ? "Модель готова к распознаванию"
                            : 'Сначала обучите модель на вкладке "Обучение"'}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={toggleRecognition}
                        disabled={!isModelLoaded}
                        variant={isRecognitionActive ? "destructive" : "default"}
                        className={
                          isRecognitionActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        }
                      >
                        {isRecognitionActive ? (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Остановить
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Запустить
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CameraView
                      isActive={isRecognitionActive}
                      currentDetection={currentDetection}
                      onPredict={predict}
                      isModelLoaded={isModelLoaded}
                    />
                  </CardContent>
                </Card>

                <DetectionResults currentDetection={currentDetection} detectionHistory={detectionHistory} />
              </div>

              <div className="space-y-6">
                <ModelStats
                  modelStats={modelStats}
                  isModelLoaded={isModelLoaded}
                  datasetSize={Object.values(dataset).reduce((sum, samples) => sum + samples.length, 0)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Вкладка датасета */}
          <TabsContent value="dataset" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-3">
                <DatasetRecorder dataset={dataset} onAddToDataset={addToDataset} onClearDataset={clearDataset} />
              </div>
              <div>
                <DatasetExport dataset={dataset} onImportDataset={handleImportDataset} />
              </div>
            </div>
          </TabsContent>

          {/* Вкладка обучения */}
          <TabsContent value="training" className="space-y-6">
            <ModelTrainer
              dataset={dataset}
              isTraining={isTraining}
              trainingProgress={trainingProgress}
              onTrainModel={trainModel}
              modelStats={modelStats}
              savedModels={savedModels}
              currentModelName={currentModelName}
              onSaveModel={saveModel}
              onLoadModel={loadModel}
              onDeleteModel={deleteModel}
              getModelMetadata={getModelMetadata}
            />
          </TabsContent>

          {/* Вкладка управления моделями */}
          <TabsContent value="models" className="space-y-6">
            <ModelManager
              savedModels={savedModels}
              currentModelName={currentModelName}
              isModelLoaded={isModelLoaded}
              onSaveModel={saveModel}
              onLoadModel={loadModel}
              onDeleteModel={deleteModel}
              getModelMetadata={getModelMetadata}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
