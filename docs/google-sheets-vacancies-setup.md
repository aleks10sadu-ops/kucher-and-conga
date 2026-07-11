# Настройка Google Таблицы для откликов на вакансии

Отклики с сайта попадают в вашу Google Таблицу. Лист на каждый год («2026», «2027»…) создаётся автоматически при первом отклике в этом году.

## Шаги (один раз, ~5 минут)

1. Создайте таблицу на Google Диске (например «Отклики на вакансии Kucher&Conga»).
2. В таблице: **Расширения → Apps Script**. Удалите содержимое редактора и вставьте:

```js
var HEADERS = ['Дата отклика', 'Вакансия', 'ФИО', 'Телефон', 'Возраст', 'Гражданство', 'Опыт работы', 'Медкнижка', 'Когда готов выйти', 'Ожидания по ЗП', 'Резюме/Telegram', 'Комментарий'];

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var year = String(new Date().getFullYear());
  var sheet = ss.getSheetByName(year);
  if (!sheet) {
    sheet = ss.insertSheet(year, 0);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e8d2');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 160);
  }
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm'),
    d.vacancy || '', d.fio || '', "'" + (d.phone || ''), d.age || '', d.citizenship || '',
    d.experience || '', d.medbook || '', d.startDate || '', d.salary || '', d.resume || '', d.comment || ''
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Сохраните (Ctrl+S), затем **Развернуть → Новое развертывание**:
   - Тип: **Веб-приложение**
   - Выполнять от имени: **Я**
   - У кого есть доступ: **Все**
4. Нажмите «Развернуть», разрешите доступ своему аккаунту, скопируйте **URL веб-приложения** (`https://script.google.com/macros/s/…/exec`).
5. Добавьте URL в переменные окружения:
   - локально — строка в `.env.local`: `VACANCY_SHEETS_WEBHOOK_URL=<URL>`
   - на Vercel — Settings → Environment Variables → `VACANCY_SHEETS_WEBHOOK_URL` (Production + Preview), затем redeploy.
6. Проверка: отправьте анкету со страницы любой вакансии на сайте — в таблице на листе текущего года появится строка.

## Telegram-уведомления об откликах (необязательно, но рекомендуется)

Кроме записи в таблицу, сайт шлёт **короткий пинг в Telegram-группу** о каждом новом
отклике (вакансия, имя, телефон, ссылка) — чтобы сразу знать, что пора заглянуть в таблицу.
Отклик считается принятым, если сработал **хотя бы один** канал: даже при недоступной
Google-таблице анкета не теряется, а форма работает в любое время.

Настройка новой группы:
1. Создайте в Telegram новую группу и добавьте в неё того же бота, что и для броней
   (токен уже в env `TELEGRAM_BOT_TOKEN`).
2. Узнайте `chat_id` группы: напишите в группе любое сообщение, затем откройте
   `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите `"chat":{"id":-100…}` —
   это и есть id (отрицательное число).
3. Добавьте переменную окружения `TELEGRAM_VACANCY_CHAT_ID=<этот id>`:
   - локально — в `.env.local`;
   - на Vercel — Settings → Environment Variables (Production + Preview), затем redeploy.
   - Если не задать, пинг уйдёт в общую группу `TELEGRAM_CHAT_ID` (если она настроена).

## Если меняли код скрипта

После правок в Apps Script нужно **Развернуть → Управление развертываниями → карандаш → Новая версия**, иначе по старому URL работает старая версия.
