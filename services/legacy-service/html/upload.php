<?php
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_FILES["file"])) {
    $name = basename($_FILES["file"]["name"]);
    $target = __DIR__ . "/uploads/" . $name;
    if (move_uploaded_file($_FILES["file"]["tmp_name"], $target)) {
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode([
            "uploaded" => true,
            "name" => $name,
            "path" => "/uploads/" . $name,
            "gateway" => "/legacy/uploads/" . $name,
        ]);
        exit;
    }
    http_response_code(500);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["error" => "upload failed"]);
    exit;
}
?>
<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Upload</title></head>
<body>
  <h1>Загрузка файла</h1>
  <form method="post" enctype="multipart/form-data">
    <input type="file" name="file">
    <button type="submit">Загрузить</button>
  </form>
</body>
</html>
