# Halifax 311 — датасет для распознавания форм по голосу/тексту

Данные для backend-слоя: пользователь описывает проблему голосом или текстом →
модель определяет, **какую из форм Halifax 311 заполнять**, и **какие поля** в неё положить.

Источник: `https://www.halifax.ca/home/online-services` + все 92 страницы сервисов.
Собрано 2026-09-12. Всё вытащено со страниц, ничего не выдумано —
кроме слоя интентов (`keywords` / `example_utterances` / `disambiguation`), он авторский.

---

## Файлы

| Файл | Что внутри |
|---|---|
| `data/services_catalog.json` | Все **92** сервиса Halifax: имя, URL, тип, категории, описание |
| `data/forms.json` | **55** форм с полным описанием полей (имя, тип, required, options, maxlength) |
| `data/field_templates.json` | Общий шаблон, на котором построена **41 из 55** форм |
| `data/intents.json` | **Слой маршрутизации**: ключевые слова, примеры фраз, правила разрешения неоднозначностей |
| `data/eval_utterances.jsonl` | 164 фразы — те же, что в `intents.example_utterances` (few-shot материал) |
| `data/eval_holdout.jsonl` | 68 фраз **другими словами** — честная метрика |
| `data/category_map.json` | 55 интентов → 6 категорий OpenHFX (для `ReportSuggestion.category`) |
| `data/eval_adversarial.jsonl` | 28 намеренно неоднозначных фраз |
| `baseline_match.py` | Keyword-бейзлайн (пол, который должен побить роутер) |
| `eval_router.py` | Замер живого LLM-роутера + стоимость |
| `router.py` | Референс-роутер: транскрипт → форма + заполненные поля |
| `INTEGRATION.md` | **Как подключить это к интерфейсу** (на английском) |

---

## Главное открытие: 41 из 55 форм — это одна и та же форма

`field_templates.json` → `standard_311_request`:

```
first_name, last_name, email, phone          ← из профиля пользователя, заполняется один раз
civic_address[address_line1], unit_apartment ← адрес (есть autocomplete на стороне Halifax)
approximate_location                          ← «на углу North и Robie»
details_of_request                            ← сюда кладём расшифровку голоса как есть
files[attachments]                            ← фото с телефона
```

**Что это значит для приложения.** В 75% случаев модели не нужно извлекать слоты.
Нужно только: (1) выбрать правильный `form_slug`, (2) отделить адрес от описания проблемы.
Всё остальное — контакты — берётся из профиля. Голосовой ввод целиком уходит в
`details_of_request`, и форма уже валидна.

Оставшиеся 14 форм — кастомные, с обязательными специфичными полями. Они перечислены
в `forms.json` → `specific_fields`. Именно там нужна реальная работа по извлечению слотов:

- `illegally-parked-vehicle` — марка, модель, цвет, номер, **`alleged_violation` (32 варианта)**
- `deceased-animals` — `animal_type` (10 вариантов)
- `problem-plants-insects-invasive-species` — `species` (24 варианта)
- `alarm-registration`, `address-change-form`, формы мэра — много обязательных полей,
  голосом за один заход не собрать, нужен диалог-доуточнение.

---

## Слой интентов — самая сложная часть

Каждый интент в `intents.json`:

```json
{
  "intent_id": "flooding-requests",
  "keywords": ["flooding", "water in the street", "blocked catch basin", ...],
  "example_utterances": ["The street is flooding, water is up to the curb", ...],
  "disambiguation": {
    "drainage-infrastructure-maintenance-or-repair":
      "ACTIVE flooding happening now. If water is not currently flooding and it's an asset repair, use ..."
  },
  "urgency": "Active flooding is time-sensitive; flag as high priority."
}
```

### `disambiguation` — не пропустить

В каталоге есть пары форм, которые почти неразличимы по словам, но уходят в разные отделы:

| A | B | Что различает |
|---|---|---|
| `flooding-requests` | `drainage-infrastructure-maintenance-or-repair` | вода льётся **сейчас** vs. ремонт актива |
| `drainage-infrastructure-request` | `...-maintenance-or-repair` | **новая** инфраструктура vs. ремонт |
| `report-park-litter` | `report-street-litter` | парк vs. улица |
| `new-litter-bin-park-request` | `new-litter-bin-row-request` | парк vs. ROW (улица) |
| `traffic-signals` | `new-traffic-signal-request` | сломан vs. нужен новый |
| `walking-surface-maintenance` | `new-sidewalk-request` | ремонт vs. новый тротуар |
| `street-lighting-concerns` | `lights-parks-playground-fields` | улица vs. парк |
| `row-signage` | `non-row-signage` / `street-sign-missing-or-damaged` | новый знак ROW / парк / сломан |
| `parks-infrastructure-requests` | `request-repairs` | новое оборудование vs. ремонт |

Ось «парк vs. улица» и ось «новое vs. ремонт» — два измерения, на которых чаще всего
ошибается классификатор. Их стоит вынести в промпт отдельно.

### Срочность

`illegally-parked-vehicle` → `alleged_violation`: варианты с пометкой **(DISPATCH)**
(перекрыт выезд, пожарный проезд, на тротуаре, у гидранта, у перехода) означают
немедленную отправку наряда. `flooding-requests` помечен `urgency`.
Эти случаи нельзя ставить в общую очередь.

---

## Метрика распознавания

```bash
python3 baseline_match.py --all          # обе выборки
python3 baseline_match.py --holdout      # честная
python3 baseline_match.py "my street is flooded"   # разбор одной фразы
```

Текущий keyword-бейзлайн:

| Выборка | keyword-бейзлайн | LLM-роутер (`claude-opus-5`) |
|---|---|---|
| `eval_utterances.jsonl` (те же фразы, что в keywords) | 87.2% top-1 | — |
| `eval_holdout.jsonl` (другие формулировки, 68 шт.) | **42.6%** top-1 | **100%** (68/68) |
| `eval_adversarial.jsonl` (неоднозначные пары, 28 шт.) | — | **96.4%** (27/28) |

Замерено 2026-09-12, `python3 eval_router.py`. Стоимость $0.010 за запрос,
кеш каталога отдаёт 100% входных токенов.

Калибровка важнее самой точности: средняя уверенность **0.80** при верном ответе
и **0.45** при неверном. Единственный промах на adversarial — «there's a broken
bench» (скамейка в парке или на улице — неразрешимо без уточнения), и модель
сама поставила 0.45, то есть интерфейс переспросил бы, а не угадал.

**Разрыв 87 → 43 — это и есть ответ на вопрос «хватит ли ключевых слов».**
Не хватит. 87% — переобучение на собственный словарь; как только человек говорит
«dip in the road» вместо «pothole» или «gully is choked» вместо «catch basin»,
keyword-матчинг разваливается. `baseline_match.py` — это **пол**, который должен
побить нормальный роутер, а не кандидат в продакшн.

Что брать в продакшн:
1. **LLM-классификация** — весь `intents.json` влезает в промпт (~65 KB). Дать модели
   список интентов с `disambiguation` и попросить вернуть `intent_id` + извлечённые поля.
   Это же покрывает и заполнение слотов за один вызов.
2. **Embeddings + top-k → LLM** — векторизовать `keywords` + `example_utterances` +
   `official_summary`, достать top-5, дальше LLM выбирает из пяти. Дешевле и быстрее
   на устройстве; `top-3 = 52.9%` у keyword-бейзлайна показывает, что даже слабый
   retrieval сильно сужает выбор.
3. В обоих случаях — **порог уверенности**, ниже которого показываем пользователю
   2-3 варианта на выбор вместо угадывания. Цена ошибки — заявка ушла не в тот отдел.

`eval_holdout.jsonl` специально содержит британские/разговорные синонимы и
voice-style фразы с «um», «like», «yeah hi so» — так выглядит реальная расшифровка речи.

---

## Чего в датасете нет

- **Схема отправки.** Формы — Drupal webform, рендерятся сервером, с CSRF-токеном
  (`form_build_id` / `form_token`) и без публичного API. `submit_action` в `forms.json` —
  это URL страницы, но реальный POST потребует либо получения токена со страницы,
  либо официальной договорённости с Halifax. Для хакатона отправку стоит мокать.
- **37 сервисов без формы** (в `services_catalog.json` → `submittable_form: false`) —
  это внешние системы (оплата, карты, пермиты, вакансии). Для них правильный ответ
  модели — «вот ссылка», а не «заполняю форму». Их тоже нужно уметь распознавать,
  иначе модель будет натягивать их на ближайшую форму.
- **Валидация полей** взята из HTML-атрибутов (`required`, `maxlength`). Серверных
  правил Halifax мы не видим.
- `ask-a-question-to-311` — общий fallback: если уверенность низкая и ничего не подошло,
  лучше отправить свободным текстом в 311, чем угадать форму.

---

## Пересборка

```bash
cd scraper
python3 fetch.py     # качает каталог + 92 страницы в _cache/, парсит поля форм
python3 build.py     # собирает ../data/*.json
```

`fetch.py` кэширует страницы — повторный запуск не бьёт по сайту.
`eval_holdout.jsonl` пишется руками и `build.py` его не трогает.

Словарь интентов живёт в `scraper/kb.py` — новые ключевые слова и примеры фраз
добавлять туда, затем `python3 build.py`.

Добавили слова → **обязательно** прогоните `--holdout`, а не только основную выборку:
подгонка keywords под `eval_utterances` поднимает первую метрику и не двигает вторую.
