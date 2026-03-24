#!/usr/bin/env python3
"""
XTTS v2 Voice Clone Server
  POST /clone   — Upload audio → clone voice (store reference)
  POST /preview — Generate speech with cloned voice
  GET  /voices  — List available cloned voices
  GET  /health  — Health check
"""
import json, uuid, time, io, base64, struct, wave
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from email.parser import BytesParser

PORT = 8321

# ---------- model ----------
print("Loading XTTS v2 model (this may take a moment)...")
from TTS.api import TTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
print("Model loaded.")

CLONES_DIR = Path.home() / "voice-cloning" / "cloned-voices"
CLONES_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_REF = Path.home() / "voice-cloning" / "david-refs" / "ref1-thoughts-on-ai-22k.wav"

_voices: dict = {}

def parse_multipart(headers, body: bytes):
    """Parse multipart/form-data without cgi module."""
    content_type = headers.get("Content-Type", "")
    if "boundary=" not in content_type:
        return {}, {}
    boundary = content_type.split("boundary=")[1].strip()
    if boundary.startswith('"') and boundary.endswith('"'):
        boundary = boundary[1:-1]
    
    parts_data = body.split(f"--{boundary}".encode())
    fields = {}
    files = {}
    
    for part in parts_data:
        if not part or part.strip() == b"--" or part.strip() == b"":
            continue
        
        # Split headers from body
        if b"\r\n\r\n" in part:
            header_section, part_body = part.split(b"\r\n\r\n", 1)
        elif b"\n\n" in part:
            header_section, part_body = part.split(b"\n\n", 1)
        else:
            continue
        
        # Remove trailing \r\n
        if part_body.endswith(b"\r\n"):
            part_body = part_body[:-2]
        
        header_str = header_section.decode("utf-8", errors="replace")
        
        name = None
        filename = None
        for line in header_str.split("\n"):
            line = line.strip()
            if "Content-Disposition:" in line:
                for item in line.split(";"):
                    item = item.strip()
                    if item.startswith("name="):
                        name = item.split("=", 1)[1].strip('"')
                    elif item.startswith("filename="):
                        filename = item.split("=", 1)[1].strip('"')
        
        if name:
            if filename:
                files[name] = {"filename": filename, "data": part_body}
            else:
                fields[name] = part_body.decode("utf-8", errors="replace")
    
    return fields, files


class XTTSHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # quiet

    def _json_response(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._json_response(200, {"status": "ok", "model": "xtts_v2"})
        elif self.path == "/voices":
            vlist = [{"voice_id": k, "name": v["name"]} for k, v in _voices.items()]
            self._json_response(200, {"voices": vlist})
        else:
            self._json_response(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/clone":
            self._handle_clone()
        elif self.path == "/preview":
            self._handle_preview()
        else:
            self._json_response(404, {"error": "Not found"})

    def _handle_clone(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self._json_response(400, {"error": "Expected multipart/form-data"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            fields, files = parse_multipart(self.headers, body)
            
            file_info = files.get("file")
            if not file_info:
                self._json_response(400, {"error": "No audio file provided"})
                return

            voice_name = fields.get("name", f"clone_{int(time.time())}")
            voice_id = str(uuid.uuid4())[:8]

            ext = Path(file_info["filename"]).suffix or ".wav"
            save_path = CLONES_DIR / f"{voice_id}{ext}"
            with open(save_path, "wb") as f:
                f.write(file_info["data"])

            _voices[voice_id] = {"name": voice_name, "ref_path": str(save_path)}
            print(f"Cloned voice registered: {voice_id} ({voice_name}) from {save_path}")

            self._json_response(200, {
                "voiceId": voice_id,
                "name": voice_name,
                "status": "done",
            })
        except Exception as e:
            print(f"Clone error: {e}")
            self._json_response(500, {"error": str(e)})

    def _handle_preview(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length else {}

            voice_id = body.get("voiceId", "david-default")
            text = body.get("text", "")
            speed = float(body.get("speed", 1.0))
            lang = body.get("language", "zh-cn")

            if not text:
                self._json_response(400, {"error": "text is required"})
                return

            # Pick reference audio
            if voice_id in _voices:
                ref = _voices[voice_id]["ref_path"]
            elif DEFAULT_REF.exists():
                ref = str(DEFAULT_REF)
            else:
                self._json_response(400, {"error": "No reference audio. Clone a voice first."})
                return

            buf = io.BytesIO()
            tts.tts_to_file(
                text=text,
                speaker_wav=ref,
                language=lang,
                speed=speed,
                file_path=buf,
            )
            wav_bytes = buf.getvalue()
            b64 = base64.b64encode(wav_bytes).decode()

            self._json_response(200, {
                "audioUrl": f"data:audio/wav;base64,{b64}",
            })
        except Exception as e:
            print(f"Preview error: {e}")
            self._json_response(500, {"error": str(e)})


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), XTTSHandler)
    print(f"XTTS v2 server running on :{PORT}")
    server.serve_forever()
