import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, TrendingUp } from "lucide-react"

interface DetectionResultsProps {
  currentDetection: {
    object: string
    confidence: number
    timestamp: number
  } | null
  detectionHistory: Array<{
    object: string
    confidence: number
    timestamp: number
  }>
}

export function DetectionResults({ currentDetection, detectionHistory }: DetectionResultsProps) {
  const getObjectColor = (object: string) => {
    switch (object) {
      case "book":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "cube":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "phone":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

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

  // Статистика по объектам
  const objectStats = detectionHistory.reduce(
    (acc, detection) => {
      acc[detection.object] = (acc[detection.object] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Текущий результат */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Текущий результат
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentDetection ? (
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant="outline" className={`text-lg px-4 py-2 ${getObjectColor(currentDetection.object)}`}>
                  {getObjectName(currentDetection.object)}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Уверенность:</span>
                  <span className="text-white font-semibold">{(currentDetection.confidence * 100).toFixed(1)}%</span>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentDetection.confidence * 100}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Время:</span>
                  <span className="text-gray-300">{new Date(currentDetection.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Ожидание распознавания...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* История распознавания */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="h-5 w-5" />
            История ({detectionHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detectionHistory.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {detectionHistory.map((detection, index) => (
                  <div
                    key={`${detection.timestamp}-${index}`}
                    className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${getObjectColor(detection.object)}`}>
                        {getObjectName(detection.object)}
                      </Badge>
                      <span className="text-sm text-gray-300">{(detection.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(detection.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">История пуста</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
