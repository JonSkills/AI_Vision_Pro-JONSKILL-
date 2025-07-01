import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Target, Clock, Database } from "lucide-react"

interface ModelStatsProps {
  modelStats: {
    accuracy: number
    loss: number
    epochs: number
    classes: string[]
  }
  isModelLoaded: boolean
  datasetSize: number
}

export function ModelStats({ modelStats, isModelLoaded, datasetSize }: ModelStatsProps) {
  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Статистика модели
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isModelLoaded ? (
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Архитектура:</span>
                <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                  CNN
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Эпох:</span>
                <span className="text-sm text-gray-400">{modelStats.epochs}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Классы:</span>
                <span className="text-sm text-gray-400">{modelStats.classes.length}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Статус:</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400">Активна</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Brain className="h-12 w-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Модель не обучена</p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Датасет:</span>
            </div>
            <span className="text-sm text-gray-300">{datasetSize} образцов</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
