<?php
$xml = file_get_contents("php://input");
libxml_set_external_entity_loader(function ($public, $system, $context) {
    if ($system) {
        return fopen($system, "r");
    }
    return null;
});
$doc = new DOMDocument();
$loaded = $doc->loadXML($xml, LIBXML_NOENT | LIBXML_DTDLOAD);
header("Content-Type: text/plain; charset=utf-8");
if (!$loaded) {
    http_response_code(400);
    echo "invalid xml";
    exit;
}
$note = $doc->getElementsByTagName("note")->item(0);
echo $note ? $note->textContent : "note not found";
