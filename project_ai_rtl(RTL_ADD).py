import os
import cv2
import numpy as np
import joblib
import json
import time
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# ======== [1] Настройки ========
DATA_DIR = "data"
# CLASSES теперь будет определяться пользователем
IMG_SIZE = (128, 128)  # Размер для модели
DISPLAY_SIZE = (400, 400)  # Размер для отображения
FPS = 5
RECORD_TIME = 5

# ======== [2] Функция записи датасета ========
def record_dataset(class_name):
    print(f"\n📹 Начинаем запись датасета для класса: {class_name}")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("   ❌ Ошибка: камера не доступна")
        return

    # Папка для класса уже должна быть создана в main_menu, но на всякий случай
    os.makedirs(f"{DATA_DIR}/{class_name}", exist_ok=True)
    # print(f"   ✅ Папка '{DATA_DIR}/{class_name}' готова") # Это сообщение уже будет выведено в main_menu

    start_time = time.time()
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Обработка кадра для модели
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, IMG_SIZE)
        
        # Визуализация обработки
        model_view = cv2.cvtColor(resized, cv2.COLOR_GRAY2BGR)
        edges = cv2.Canny(resized, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(model_view, contours, -1, (0,255,0), 1)

        # Отображение
        cv2.putText(frame, f"Recording: {class_name}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)
        
        combined = np.hstack([
            cv2.resize(frame, DISPLAY_SIZE),
            cv2.resize(model_view, DISPLAY_SIZE)
        ])
        cv2.imshow("Dataset Recording (Left: Original | Right: Model View)", combined)

        # Сохранение кадров
        if time.time() - start_time > 1/FPS:
            timestamp = int(time.time() * 1000)
            cv2.imwrite(f"{DATA_DIR}/{class_name}/{timestamp}.jpg", resized)
            frame_count += 1
            start_time = time.time()

        if cv2.waitKey(1) & 0xFF == ord('q') or time.time() - start_time > RECORD_TIME:
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"✅ Сохранено {frame_count} кадров в {DATA_DIR}/{class_name}")

# ======== [3] Функция обучения ========
def train_model(classes_to_train): # Принимаем список классов для обучения
    print("\n🧠 Начинаем обучение модели...")
    
    X, y = [], []
    label_map = {class_name: idx for idx, class_name in enumerate(classes_to_train)}
    
    for class_name in classes_to_train:
        class_dir = f"{DATA_DIR}/{class_name}"
        if not os.path.exists(class_dir):
            print(f"   ⚠️ Папка '{class_dir}' не найдена. Пропускаем.")
            continue
        for filename in os.listdir(class_dir):
            img = cv2.imread(os.path.join(class_dir, filename), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                X.append(img.flatten())
                y.append(label_map[class_name])

    if len(X) == 0:
        print("❌ Нет данных для обучения! Запишите датасеты для выбранных классов.")
        return None
    
    X, y = np.array(X), np.array(y)
    
    # Проверяем, достаточно ли классов для train_test_split
    if len(np.unique(y)) < 2:
        print("❌ Недостаточно классов или данных для обучения (нужно минимум 2 класса с данными).")
        return None
    
    # Проверяем, достаточно ли образцов для train_test_split
    if len(X) < 2:
        print("❌ Недостаточно образцов для обучения (нужно минимум 2 образца).")
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = DecisionTreeClassifier()
    model.fit(X_train, y_train)
    
    accuracy = accuracy_score(y_test, model.predict(X_test))
    print(f"🎯 Точность модели: {accuracy:.2f}")

    # Сохраняем отдельно label_map как JSON (если нужно)
    with open('labels.json', 'w') as f:
        json.dump(label_map, f)
    print("📄 Словарь меток сохранён как 'labels.json'")

    
    # Сохраняем модель и точность вместе
    model_data = {
        'model': model,
        'accuracy': accuracy,
        'label_map': label_map,
        'classes': classes_to_train # Сохраняем список классов, на которых обучалась модель
    }
    model_filename = f"model_{int(time.time())}.pkl"
    joblib.dump(model_data, model_filename)
    print(f"✅ Модель, метки и точность сохранены как '{model_filename}'")
    
    return model

# ======== [4] Функция распознавания ========
def recognize_objects():
    print("\n👀 Запуск распознавания...")
    
    # Загрузка модели, меток и точности
    try:
        latest_model_file = max(
            [f for f in os.listdir() if f.startswith('model_') and f.endswith('.pkl')],
            key=os.path.getctime
        )
        model_data = joblib.load(latest_model_file)
        model = model_data['model']
        label_map = model_data['label_map']
        trained_accuracy = model_data['accuracy'] * 100 # Переводим в проценты
        # classes_used_for_training = model_data.get('classes', []) # Получаем классы, на которых обучалась модель
        print(f"   ✅ Загружена модель '{latest_model_file}' с точностью обучения: {trained_accuracy:.2f}%")
    except Exception as e:
        print(f"❌ Ошибка загрузки модели: {e}")
        print("   Сначала обучите модель.")
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Камера не доступна!")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Обработка кадра для модели
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, IMG_SIZE)
        
        # Распознавание
        pred = model.predict([resized.flatten()])[0]
        current_label = [k for k, v in label_map.items() if v == pred][0]
        
        # Выделение ВСЕХ объектов (но без подписей)
        contours = cv2.findContours(
            cv2.Canny(gray, 50, 150), 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )[0]
        
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w*h > 500:  # Фильтр по размеру
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

        # Одно централизованное отображение результата
        display_text = f"Объект: {current_label}"
        accuracy_text = f"Точность модели: {trained_accuracy:.2f}%"

        # Отображение объекта
        (text_w, text_h), _ = cv2.getTextSize(
            display_text, 
            cv2.FONT_HERSHEY_SIMPLEX, 
            1.5, 3
        )
        cv2.putText(
            frame, 
            display_text,
            (frame.shape[1]//2 - text_w//2, 50),  # Центр экрана сверху
            cv2.FONT_HERSHEY_SIMPLEX, 
            1.5, 
            (0, 255, 0), 
            3, 
            cv2.LINE_AA
        )

        # Отображение точности
        (acc_w, acc_h), _ = cv2.getTextSize(
            accuracy_text, 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.8, 2
        )
        cv2.putText(
            frame, 
            accuracy_text,
            (frame.shape[1] - acc_w - 20, frame.shape[0] - 20), # В правом нижнем углу
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.8, 
            (255, 255, 0), # Желтый цвет
            2, 
            cv2.LINE_AA
        )

        # Отображение
        cv2.imshow("Object Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n🛑 Распознавание остановлено")
            break

    cap.release()
    cv2.destroyAllWindows()

# ======== Вспомогательная функция для получения существующих классов ========
def get_existing_classes():
    existing_classes = []
    if os.path.exists(DATA_DIR):
        for item in os.listdir(DATA_DIR):
            item_path = os.path.join(DATA_DIR, item)
            if os.path.isdir(item_path) and not item.startswith('.'): # Игнорируем скрытые папки
                existing_classes.append(item)
    return sorted(list(set(existing_classes))) # Возвращаем уникальные и отсортированные

# ======== [5] Главное меню ========
def main_menu():
    global CLASSES 
    
    print("\n" + "="*40)
    print(" НАСТРОЙКА КЛАССОВ ОБЪЕКТОВ ".center(40))
    print("="*40)

    # Получаем список уже существующих классов из папок
    existing_classes = get_existing_classes()
    
    if existing_classes:
        print(f"Обнаружены существующие классы: {', '.join(existing_classes)}")
        print("1. Использовать только обнаруженные классы.")
        print("2. Использовать обнаруженные классы И добавить новые.")
        print("3. Ввести полностью новый список классов (игнорировать обнаруженные).")
        
        choice_class_setup = input("Ваш выбор (1/2/3): ").strip()
        
        if choice_class_setup == '1':
            CLASSES = existing_classes
        elif choice_class_setup == '2':
            new_classes_input = input("Введите новые классы (через запятую): ").strip()
            new_classes = [c.strip() for c in new_classes_input.split(',') if c.strip()]
            CLASSES = sorted(list(set(existing_classes + new_classes))) # Объединяем и убираем дубликаты
        elif choice_class_setup == '3':
            user_input_classes = input("Введите полностью новый список классов (через запятую): ").strip()
            CLASSES = [c.strip() for c in user_input_classes.split(',') if c.strip()]
        else:
            print("Неверный выбор. Используем обнаруженные классы по умолчанию.")
            CLASSES = existing_classes
    else:
        print("Существующие классы не обнаружены.")
        print("Введите названия классов объектов, которые вы хотите распознавать,")
        print("разделяя их запятыми (например: книга,кубик,телефон).")
        print("Оставьте пустым, чтобы использовать 'book,cube' по умолчанию.")
        
        user_input_classes = input("Ваши классы: ").strip()
        if user_input_classes:
            CLASSES = [c.strip() for c in user_input_classes.split(',') if c.strip()]
        else:
            CLASSES = ["book", "cube"] # Классы по умолчанию
    
    if not CLASSES:
        print("❌ Не задано ни одного класса. Выход.")
        return

    print(f"\n✅ Будут использоваться классы: {', '.join(CLASSES)}")

    # Создаем папки для классов здесь, в начале main_menu
    print("\n🔍 Проверяем структуру папок...")
    for class_name in CLASSES:
        os.makedirs(f"{DATA_DIR}/{class_name}", exist_ok=True)
        print(f"   ✅ Папка '{DATA_DIR}/{class_name}' готова")

    while True:
        print("\n" + "="*40)
        print(" МЕНЮ РАСПОЗНАВАНИЯ ОБЪЕКТОВ ".center(40))
        print("="*40)
        
        menu_options = {}
        current_option_num = 1

        # Динамически добавляем опции для записи датасета
        for class_name in CLASSES:
            menu_options[str(current_option_num)] = {"action": "record", "class_name": class_name}
            print(f"{current_option_num}. 📹 Записать датасет для '{class_name}'")
            current_option_num += 1
        
        menu_options[str(current_option_num)] = {"action": "train"}
        print(f"{current_option_num}. 🧠 Обучить модель")
        train_option_num = current_option_num
        current_option_num += 1

        menu_options[str(current_option_num)] = {"action": "recognize"}
        print(f"{current_option_num}. 👁 Тестировать распознавание")
        current_option_num += 1

        menu_options[str(current_option_num)] = {"action": "exit"}
        print(f"{current_option_num}. 🚪 Выход")
        
        print("="*40)
        
        choice = input("Выберите действие: ")
        
        if choice in menu_options:
            selected_action = menu_options[choice]
            if selected_action["action"] == "record":
                record_dataset(selected_action["class_name"])
            elif selected_action["action"] == "train":
                train_model(CLASSES) # Передаем текущие классы для обучения
            elif selected_action["action"] == "recognize":
                recognize_objects()
            elif selected_action["action"] == "exit":
                print("\n👋 До свидания!")
                break
        else:
            print("\n❌ Неверный ввод!")

if __name__ == "__main__":
    print("\n🌟 СИСТЕМА РАСПОЗНАВАНИЯ ОБЪЕКТОВ v2.0")
    main_menu()
