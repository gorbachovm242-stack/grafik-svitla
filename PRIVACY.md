# Політика конфіденційності «Маяка» і «Графіка світла»

Діє з 19 листопада 2026 року. Стосується застосунку «Маяк» для Android (раніше «Графік світла») і скрипта «Графік світла» для iPhone (застосунок Scripting).

## Коротко

Застосунок не збирає даних про вас, не зберігає їх на серверах і нікому не передає. Немає реєстрації, реклами й аналітики.

## Що зберігається на телефоні

Ваші налаштування: область, черга, вибрані сповіщення, вигляд віджета, місце для тривог і, якщо ви їх обрали, канал датчика СвітлоБота й канал моніторингу тривог. Ще там лежить останній завантажений графік, щоб віджет працював без інтернету. Усе це лишається тільки на вашому телефоні й зникає, коли ви видаляєте застосунок.

## Куди застосунок звертається в мережі

Щоб показати графік і стан світла, застосунок завантажує публічні дані:

- сайт Запоріжжяобленерго (www.zoe.com.ua) і сторінку обленерго для пошуку черги за адресою;
- спільні відкриті дані про відключення для інших областей (dtek-api.svitlo-proxy.workers.dev, svitlo-proxy.svitlo-proxy.workers.dev, raw.githubusercontent.com);
- СвітлоБот (api.svitlobot.in.ua) і публічні сторінки його каналів у Telegram (t.me);
- для повітряної тривоги сервер-посередник «Маяка» на Cloudflare Workers (адреса *.workers.dev), див. нижче.

Ці запити не містять даних про вас, лише адресу сторінки, яку треба завантажити. Як і будь-який сайт, сервери цих джерел бачать IP-адресу телефона. Що вони з нею роблять, визначають їхні власні правила.

## Повітряна тривога

Тривоги показують віджет «Маяк» на Android і віджет «Графіка світла» на iPhone, якщо в ньому ввімкнено тривогу. Дані про тривоги надає alerts.in.ua, і брати їх застосунку дозволено лише через власний сервер. Тому віджет звертається до сервера-посередника «Маяка» на Cloudflare Workers, а той до alerts.in.ua. Телефон отримує всі активні тривоги в Україні й сам обирає ваші, тож обране місце (область, район, громада) нікуди не надсилається. Посередник не веде журналів і нічого не зберігає про запити. Як і будь-який сервер, Cloudflare бачить IP-адресу телефона.

Якщо ви підключили публічний Telegram-канал моніторингу, застосунок регулярно завантажує його публічну сторінку t.me/s/назва_каналу (на Android поки екран увімкнено, раз на кілька хвилин; на iPhone щоразу, коли iOS оновлює віджет) і показує останні дописи. Запит містить лише назву каналу; Telegram, як і будь-який сайт, бачить IP-адресу телефона.

## Сповіщення

Попередження за 10 хвилин і повідомлення про зміну графіка створює сам телефон. Від розробника нічого не надходить: застосунок не отримує push-повідомлень.

## Діти

Застосунок не призначений спеціально для дітей і не збирає даних ні про кого, зокрема про дітей.

## Зміни

Якщо політика зміниться, нова версія зʼявиться за цим самим посиланням із новою датою.

## Контакт

Питання й побажання: https://github.com/gorbachovm242-stack/grafik-svitla/issues

---

## English summary

Maiak (Android) and Grafik Svitla (iPhone), power outage schedule widgets, do not collect personal data, store it on servers or share it. There are no accounts, ads or analytics. Settings and the last downloaded schedule stay on the device only. The app downloads public outage schedules from the Zaporizhzhiaoblenergo website and open community data, and public sensor data from SvitloBot and its Telegram channels; these requests contain no personal data. The air raid alert widgets (Android, and iPhone when alerts are turned on) get alerts.in.ua data through the developer's proxy on Cloudflare Workers: the phone downloads all active alerts and picks yours locally, so your chosen location is never sent; the proxy keeps no logs. If you connect a public Telegram monitoring channel, the app regularly loads its public page (t.me/s/…): on Android while the screen is on, on iPhone whenever iOS refreshes the widget; the request contains only the channel name. Contact: https://github.com/gorbachovm242-stack/grafik-svitla/issues
