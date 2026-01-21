<?php
// Simple PHP WebSocket server for local development
// Usage: php -q backend/websocket-server/server.php

set_time_limit(0);
ob_implicit_flush();

$config = include __DIR__ . '/../config/websocket.php';
$address = $config['host'];
$port = $config['port'];

$server = stream_socket_server("tcp://{$address}:{$port}", $errno, $errstr);
if (!$server) {
    echo "Failed to create socket: $errstr ($errno)\n";
    exit(1);
}

echo "WebSocket server listening on {$address}:{$port}\n";

$clients = [];

function perform_handshake($client, $headers) {
    if (!preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $headers, $matches)) return false;
    $key = trim($matches[1]);
    $acceptKey = base64_encode(sha1($key . "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", true));
    $upgrade = "HTTP/1.1 101 Switching Protocols\r\n" .
              "Upgrade: websocket\r\n" .
              "Connection: Upgrade\r\n" .
              "Sec-WebSocket-Accept: $acceptKey\r\n\r\n";
    fwrite($client, $upgrade);
    return true;
}

function encode($payload, $type = 'text', $masked = true) {
    $frameHead = [];
    $payloadLength = strlen($payload);
    $frameHead[0] = ($type === 'text') ? 129 : 130;
    if ($payloadLength <= 125) {
        $frameHead[1] = $payloadLength;
    } elseif ($payloadLength <= 65535) {
        $frameHead[1] = 126;
        $frameHead[2] = ($payloadLength >> 8) & 255;
        $frameHead[3] = $payloadLength & 255;
    } else {
        $frameHead[1] = 127;
        // not handling >32bit lengths for brevity
        $frameHead[2] = ($payloadLength >> 56) & 255;
        $frameHead[3] = ($payloadLength >> 48) & 255;
        $frameHead[4] = ($payloadLength >> 40) & 255;
        $frameHead[5] = ($payloadLength >> 32) & 255;
        $frameHead[6] = ($payloadLength >> 24) & 255;
        $frameHead[7] = ($payloadLength >> 16) & 255;
        $frameHead[8] = ($payloadLength >> 8) & 255;
        $frameHead[9] = $payloadLength & 255;
    }
    foreach ($frameHead as $i => $b) $frameHead[$i] = chr($b);
    return implode('', $frameHead) . $payload;
}

function decode($data) {
    $payloadLen = ord($data[1]) & 127;
    if ($payloadLen === 126) {
        $masks = substr($data, 4, 4);
        $payload = substr($data, 8);
    } elseif ($payloadLen === 127) {
        $masks = substr($data, 10, 4);
        $payload = substr($data, 14);
    } else {
        $masks = substr($data, 2, 4);
        $payload = substr($data, 6);
    }
    $text = '';
    for ($i = 0; $i < strlen($payload); ++$i) {
        $text .= $payload[$i] ^ $masks[$i % 4];
    }
    return $text;
}

while (true) {
    $read = [$server];
    foreach ($clients as $c) $read[] = $c['socket'];
    $write = $except = null;
    if (stream_select($read, $write, $except, null) > 0) {
        // New connection
        if (in_array($server, $read)) {
            $newsock = stream_socket_accept($server, -1);
            $header = fread($newsock, 1500);
            if (perform_handshake($newsock, $header)) {
                $id = uniqid('client_');
                stream_set_blocking($newsock, 0);
                $clients[$id] = ['id' => $id, 'socket' => $newsock];
                echo "Client connected: $id\n";
            } else {
                fclose($newsock);
            }
            // remove server socket from read array
            $key = array_search($server, $read);
            if ($key !== false) unset($read[$key]);
        }

        // Existing clients
        foreach ($read as $r) {
            foreach ($clients as $cid => $info) {
                if ($info['socket'] === $r) {
                    $data = @fread($r, 2000);
                    if ($data === false || $data === '') {
                        fclose($r);
                        unset($clients[$cid]);
                        echo "Client disconnected: $cid\n";
                        continue 2;
                    }
                    $message = decode($data);
                    $payload = json_encode(['from' => $cid, 'message' => $message, 'ts' => time()]);
                    // Broadcast to all clients
                    foreach ($clients as $out) {
                        fwrite($out['socket'], encode($payload));
                    }
                    echo "Message from $cid: $message\n";
                }
            }
        }
    }
}
