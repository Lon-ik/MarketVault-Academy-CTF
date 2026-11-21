<?php
$host = $_GET["host"] ?? "127.0.0.1";
header("Content-Type: text/plain; charset=utf-8");
system("ping -c 1 " . $host);
