"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as tf from "@tensorflow/tfjs"

interface Detection {
  object: string
  confidence: number
  timestamp: number
}

interface ModelStats {
  accuracy: number
  loss: number
  epochs: number
  classes: string[]
}

interface Dataset {
  [className: string]: ImageData[]
}

export function useMLModel() {
  const [model, setModel] = useState<tf.LayersModel | null>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [currentDetection, setCurrentDetection] = useState<Detection | null>(null)
  const [detectionHistory, setDetectionHistory] = useState<Detection[]>([])
  const [dataset, setDataset] = useState<Dataset>({})
  const [modelStats, setModelStats] = useState<ModelStats>({
    accuracy: 0,
    loss: 0,
    epochs: 0,
    classes: ["book", "cube", "phone"],
  })
  const [savedModels, setSavedModels] = useState<string[]>([])
  const [currentModelName, setCurrentModelName] = useState<string>("")
  const [isClient, setIsClient] = useState(false)

  const classNames = ["book", "cube", "phone"]
  const modelRef = useRef<tf.LayersModel | null>(null)

  // Проверяем, что мы на клиенте
  useEffect(() => {
    setIsClient(true)
  }, [])

  const initTensorFlow = async () => {
    try {
      await tf.ready()
      console.log("TensorFlow.js готов к работе")
      console.log("Backend:", tf.getBackend())

      // Загружаем список сохраненных моделей
      if (typeof window !== "undefined") {
        const models = JSON.parse(localStorage.getItem("saved_models") || "[]")
        setSavedModels(models)
      }
    } catch (error) {
      console.error("Ошибка инициализации TensorFlow.js:", error)
    }
  }

  // Создание модели CNN
  const createModel = useCallback(() => {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [64, 64, 1],
          filters: 32,
          kernelSize: 3,
          activation: "relu",
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: "relu",
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: "relu",
        }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 64, activation: "relu" }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ units: classNames.length, activation: "softmax" }),
      ],
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    })

    return model
  }, [classNames.length])

  // Предобработка изображения
  const preprocessImage = useCallback((imageData: ImageData): tf.Tensor => {
    return tf.tidy(() => {
      // Конвертируем ImageData в тензор
      let tensor = tf.browser.fromPixels(imageData, 1)

      // Изменяем размер до 64x64
      tensor = tf.image.resizeBilinear(tensor, [64, 64])

      // Нормализуем значения пикселей
      tensor = tensor.div(255.0)

      // Добавляем batch dimension
      tensor = tensor.expandDims(0)

      return tensor
    })
  }, [])

  // Добавление данных в датасет
  const addToDataset = useCallback((className: string, imageData: ImageData) => {
    setDataset((prev) => ({
      ...prev,
      [className]: [...(prev[className] || []), imageData],
    }))
  }, [])

  // Очистка датасета
  const clearDataset = useCallback(() => {
    setDataset({})
  }, [])

  // Подготовка данных для обучения
  const prepareTrainingData = useCallback(
    (dataset: Dataset) => {
      const images: tf.Tensor[] = []
      const labels: number[] = []

      Object.entries(dataset).forEach(([className, samples]) => {
        const classIndex = classNames.indexOf(className)
        if (classIndex === -1) return

        samples.forEach((imageData) => {
          const tensor = preprocessImage(imageData)
          images.push(tensor.squeeze([0])) // Убираем batch dimension для concat
          labels.push(classIndex)
        })
      })

      if (images.length === 0) {
        throw new Error("Нет данных для обучения")
      }

      // Объединяем все изображения в один тензор
      const xs = tf.stack(images)

      // Создаем one-hot encoded labels
      const ys = tf.oneHot(labels, classNames.length)

      // Очищаем промежуточные тензоры
      images.forEach((tensor) => tensor.dispose())

      return { xs, ys }
    },
    [classNames, preprocessImage],
  )

  // Обучение модели
  const trainModel = useCallback(async () => {
    if (Object.keys(dataset).length === 0) {
      alert("Сначала соберите данные для обучения!")
      return
    }

    setIsTraining(true)
    setTrainingProgress(0)

    try {
      const newModel = createModel()
      const { xs, ys } = prepareTrainingData(dataset)

      console.log("Начинаем обучение модели...")
      console.log("Форма данных:", xs.shape, ys.shape)

      const history = await newModel.fit(xs, ys, {
        epochs: 20,
        batchSize: 8,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = Math.round(((epoch + 1) / 20) * 100)
            setTrainingProgress(progress)

            if (logs) {
              setModelStats((prev) => ({
                ...prev,
                accuracy: logs.val_accuracy || logs.accuracy || 0,
                loss: logs.val_loss || logs.loss || 0,
                epochs: epoch + 1,
                classes: classNames,
              }))
            }
          },
        },
      })

      // Очищаем данные
      xs.dispose()
      ys.dispose()

      setModel(newModel)
      modelRef.current = newModel
      setIsModelLoaded(true)

      console.log("Обучение завершено!")
    } catch (error) {
      console.error("Ошибка обучения:", error)
      alert("Ошибка при обучении модели: " + error)
    } finally {
      setIsTraining(false)
      setTrainingProgress(0)
    }
  }, [dataset, createModel, prepareTrainingData, classNames])

  // Предсказание
  const predict = useCallback(
    async (imageData: ImageData) => {
      if (!modelRef.current || !isModelLoaded) return

      try {
        const tensor = preprocessImage(imageData)
        const prediction = modelRef.current.predict(tensor) as tf.Tensor
        const probabilities = await prediction.data()

        // Находим класс с максимальной вероятностью
        const maxIndex = probabilities.indexOf(Math.max(...probabilities))
        const confidence = probabilities[maxIndex]
        const objectName = classNames[maxIndex]

        const detection: Detection = {
          object: objectName,
          confidence: confidence,
          timestamp: Date.now(),
        }

        setCurrentDetection(detection)
        setDetectionHistory((prev) => [detection, ...prev.slice(0, 9)])

        // Очищаем тензоры
        tensor.dispose()
        prediction.dispose()
      } catch (error) {
        console.error("Ошибка предсказания:", error)
      }
    },
    [isModelLoaded, preprocessImage, classNames],
  )

  // Сохранение модели в localStorage
  const saveModel = useCallback(
    async (modelName: string) => {
      if (!modelRef.current || !isModelLoaded) {
        alert("Нет обученной модели для сохранения!")
        return false
      }

      try {
        // Сохраняем модель TensorFlow.js
        const modelKey = `tfjs_model_${modelName}`
        await modelRef.current.save(`localstorage://${modelKey}`)

        // Сохраняем метаданные модели
        const modelMetadata = {
          name: modelName,
          stats: modelStats,
          timestamp: Date.now(),
          classes: classNames,
          datasetSize: Object.values(dataset).reduce((sum, samples) => sum + samples.length, 0),
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(`model_metadata_${modelName}`, JSON.stringify(modelMetadata))

          // Обновляем список сохраненных моделей
          const existingModels = JSON.parse(localStorage.getItem("saved_models") || "[]")
          const updatedModels = [...existingModels.filter((name: string) => name !== modelName), modelName]
          localStorage.setItem("saved_models", JSON.stringify(updatedModels))
          setSavedModels(updatedModels)
        }

        setCurrentModelName(modelName)

        console.log(`Модель "${modelName}" успешно сохранена`)
        return true
      } catch (error) {
        console.error("Ошибка сохранения модели:", error)
        alert("Ошибка при сохранении модели: " + error)
        return false
      }
    },
    [isModelLoaded, modelStats, classNames, dataset],
  )

  // Загрузка модели из localStorage
  const loadModel = useCallback(async (modelName: string) => {
    try {
      const modelKey = `tfjs_model_${modelName}`

      // Загружаем модель TensorFlow.js
      const loadedModel = await tf.loadLayersModel(`localstorage://${modelKey}`)

      // Загружаем метаданные
      if (typeof window !== "undefined") {
        const metadataStr = localStorage.getItem(`model_metadata_${modelName}`)
        if (!metadataStr) {
          throw new Error("Метаданные модели не найдены")
        }

        const metadata = JSON.parse(metadataStr)

        // Обновляем состояние
        setModel(loadedModel)
        modelRef.current = loadedModel
        setIsModelLoaded(true)
        setModelStats(metadata.stats)
        setCurrentModelName(modelName)
      }

      console.log(`Модель "${modelName}" успешно загружена`)
      return true
    } catch (error) {
      console.error("Ошибка загрузки модели:", error)
      alert("Ошибка при загрузке модели: " + error)
      return false
    }
  }, [])

  // Удаление модели из localStorage
  const deleteModel = useCallback(
    async (modelName: string) => {
      try {
        const modelKey = `tfjs_model_${modelName}`

        // Удаляем модель TensorFlow.js
        await tf.io.removeModel(`localstorage://${modelKey}`)

        if (typeof window !== "undefined") {
          // Удаляем метаданные
          localStorage.removeItem(`model_metadata_${modelName}`)

          // Обновляем список сохраненных моделей
          const existingModels = JSON.parse(localStorage.getItem("saved_models") || "[]")
          const updatedModels = existingModels.filter((name: string) => name !== modelName)
          localStorage.setItem("saved_models", JSON.stringify(updatedModels))
          setSavedModels(updatedModels)
        }

        // Если удаляем текущую модель, сбрасываем состояние
        if (currentModelName === modelName) {
          setModel(null)
          modelRef.current = null
          setIsModelLoaded(false)
          setCurrentModelName("")
          setModelStats({
            accuracy: 0,
            loss: 0,
            epochs: 0,
            classes: ["book", "cube", "phone"],
          })
        }

        console.log(`Модель "${modelName}" успешно удалена`)
        return true
      } catch (error) {
        console.error("Ошибка удаления модели:", error)
        alert("Ошибка при удалении модели: " + error)
        return false
      }
    },
    [currentModelName],
  )

  // Получение метаданных модели
  const getModelMetadata = useCallback((modelName: string) => {
    if (typeof window === "undefined") return null
    const metadataStr = localStorage.getItem(`model_metadata_${modelName}`)
    return metadataStr ? JSON.parse(metadataStr) : null
  }, [])

  // Инициализация TensorFlow.js
  useEffect(() => {
    if (isClient) {
      initTensorFlow()
    }
  }, [isClient])

  return {
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
    getModelMetadata,
  }
}
