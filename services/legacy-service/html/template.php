<?php
$page = $_GET["page"] ?? "templates/default.php";
header("Content-Type: text/plain; charset=utf-8");
include $page;
