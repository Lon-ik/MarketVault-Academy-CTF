# Источники изображений товаров

Фотографии лежат в `services/frontend/public/products/` и отдаются локально, поэтому
витрина работает без доступа в интернет. Если картинка не загрузилась, интерфейс
подставляет встроенную SVG-заглушку.

## Фото из Unsplash (лицензия Unsplash)

| Файл | Товар | Автор | Фото | Что на снимке |
|------|-------|-------|------|----------------|
| u1-aurora-x.jpg | Смартфон Aurora X | Masakaze Kawakami | [aD6mY43V_QQ](https://unsplash.com/photos/aD6mY43V_QQ) | смартфон |
| u2-pulse-pro.jpg | Наушники Pulse Pro | Frank Septillion | [Qrspubmx6kE](https://unsplash.com/photos/Qrspubmx6kE) | Beats Solo2 Wireless |
| u7-case.jpg | Чехол для смартфона | I M Zion | [2JCKX6Jmfko](https://unsplash.com/photos/2JCKX6Jmfko) | чехол |
| u8-viewmax.jpg | Монитор ViewMax 27 4K | Josh Sorenson | [K6SYIJ1DPHE](https://unsplash.com/photos/K6SYIJ1DPHE) | монитор |
| u9-x200-pro.jpg | Смартфон X-200 Pro | The Average Tech Guy | [DsmDqiYduaU](https://unsplash.com/photos/DsmDqiYduaU) | «black android smartphone displaying home screen» |
| u10-aurora-lite.jpg | Смартфон Aurora Lite | Xiong Yan | [RbAfTwB4PRA](https://unsplash.com/photos/RbAfTwB4PRA) | смартфон |
| u11-nimbus-14.jpg | Ноутбук Nimbus 14 | Andrey Matveev | [8xQZ3ptI-2I](https://unsplash.com/photos/8xQZ3ptI-2I) | ноутбук |
| u12-vector-16.jpg | Ноутбук Vector Gaming 16 | Eddie Sennov | [Tiy7aJwWPvc](https://unsplash.com/photos/Tiy7aJwWPvc) | ноутбук |
| u13-pulse-air.jpg | Наушники Pulse Air | Simon Hrozian | [uNC9-RgzjTA](https://unsplash.com/photos/uNC9-RgzjTA) | «black headphones on white table» |
| u14-studio-one.jpg | Наушники Studio One | Igor Omilaev | [DDTOKmL1ykA](https://unsplash.com/photos/DDTOKmL1ykA) | наушники |
| u15-chrono-s2.jpg | Умные часы Chrono S2 | Infino Photography | [KjsRBYfj9hA](https://unsplash.com/photos/KjsRBYfj9hA) | умные часы |
| u17-netcore.jpg | Роутер NetCore AX3000 | Misha Feshchak | [syCXK9WndqQ](https://unsplash.com/photos/syCXK9WndqQ) | «white and black modem router with four lights» |
| u18-meshlink.jpg | Роутер MeshLink 3-pack | Techietech Tech | [6ZXP-5-jJts](https://unsplash.com/photos/6ZXP-5-jJts) | роутер |
| u19-slate-11.jpg | Планшет Slate 11 | Georgiy Lyamin | [_Oiu_ZQCBdg](https://unsplash.com/photos/_Oiu_ZQCBdg) | планшет |

Описания в кавычках — точные alt-тексты Unsplash, найденные через веб-архив;
по ним проверялось соответствие снимка товару.

## Фото с Wikimedia Commons

| Файл | Товар | Источник |
|------|-------|----------|
| p3-keyforge.jpg | Клавиатура KeyForge | [Beautiful Mechanical Keyboard](https://commons.wikimedia.org/wiki/File:Beautiful_Mechanical_Keyboard.jpg) |
| p16-fitband.jpg | Умные часы FitBand Active | [Huawei Smartwatch Band 4](https://commons.wikimedia.org/wiki/File:Huawei_Smartwatch_(Band_4).jpg) |
| p20-volt.jpg | Повербанк Volt 20000 | [Power bank](https://commons.wikimedia.org/wiki/File:Power_bank.JPG) |

Резервные снимки `p*.jpg` остались в папке и не используются — вернуть любой из них
можно одним `UPDATE inventory.products SET image_url = ...`.

Бренды и модели на фотографиях не связаны с вымышленными названиями товаров
в каталоге и используются только как заглушки.
