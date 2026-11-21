<?php
class CacheFile
{
    public $path;

    public function __destruct()
    {
        if ($this->path) {
            echo @file_get_contents($this->path);
        }
    }
}

header("Content-Type: text/plain; charset=utf-8");

$prefs = null;
if (isset($_COOKIE["prefs"])) {
    $prefs = unserialize($_COOKIE["prefs"]);
}

if (is_array($prefs)) {
    echo "theme=" . ($prefs["theme"] ?? "dark") . "\n";
} else {
    echo "settings loaded\n";
}
