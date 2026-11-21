<?php
$page = $_GET["page"] ?? "summary.php";
header("Content-Type: text/plain; charset=utf-8");
include __DIR__ . "/pages/" . $page;
