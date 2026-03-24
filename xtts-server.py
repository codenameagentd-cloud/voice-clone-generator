#!/usr/bin/env python3
"""
XTTS v2 Local API Server
========================
Endpoints:
  POST /clone   — Upload audio → clone voice (store reference)
  POST /preview — Generate speech with cloned voice
  GET  /voices  — List available cloned voices
  GET  /health  — Health check
"""

import os, sys, uuid, tempfile, io, json, time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import cgi

os.environ["COQUI_TOS_AGREED"] = "1"

REFS_DIR = Path.home() / "voice-cloning" / "david-refs"
CLONES_DIR = Path.home() / "voice-cloning" / "cloned-voices"
CLONES_DIR.mkdir(exist_ok=True)

PORT = int(os.environ.get("XTTS_PORT", "8321"))

# Lazy load model
_tts = None
def get_tts():
    global _tts
    if _tts is None:
        print("Loading XTTS v2 model (this may take a moment)...")
        from TTS.api import TTS
        _tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
        print("Model loaded.")
    return _tts

# Voice registry: voice_id -> { name, ref_path }
_voices = {}

def register_david_voices():
    """Register David's pre-existing reference voices."""
    ref2 = REFS_DIR / "ref2-design-changes-22k.wav"
    if ref2.exists():
        vid = "david-default"
        _voices[vid] = {"name": "David (Default)", "ref_path": str(ref2)}

register_david_voices()


class XTTSHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _json_response(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json_response(200, {"status": "ok", "model": "xtts_v2"})
        elif self.path == "/voices":
            voices = [{"voice_id": k, "name": v["name"]} for k, v in _voices.items()]
            self._json_response(200, {"voices": voices})
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

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": content_type},
        )

        file_field = form["file"] if "file" in form else None
        if not file_field or not file_field.file:
            self._json_response(400, {"error": "No audio file provided"})
            return

        voice_name = form.getvalue("name", f"clone_{int(time.time())}")
        voice_id = str(uuid.uuid4())[:8]

        # Save uploaded file
        ext = Path(file_field.filename or "audio.wav").suffix or ".wav"
        save_path = CLONES_DIR / f"{voice_id}{ext}"
        with open(save_path, "wb") as f:
            f.write(file_field.file.read())

        _voices[voice_id] = {"name": voice_name, "ref_path": str(save_path)}
        print(f"Cloned voice registered: {voice_id} ({voice_name}) from {save_path}")

        self._json_response(200, {
            "voiceId": voice_id,
            "name": voice_name,
            "status": "done",
        })

    def _handle_preview(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_length)) if content_length else {}

        voice_id = body.get("voiceId", "david-default")
        text = body.get("text", "")
        speed = float(body.get("speed", 1.0))
        lang = body.get("language", "zh-cn")

        if not text:
            self._json_response(400, {"error": "text is required"})
            return

        if voice_id not in _voices:
            self._json_response(404, {"error": f"Voice '{voice_id}' not found"})
            return

        voice = _voices[voice_id]
        tts = get_tts()

        # Generate to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            tts.tts_to_file(
                text=text,
                speaker_wav=voice["ref_path"],
                language=lang,
                file_path=tmp_path,
            )

            with open(tmp_path, "rb") as f:
                audio_bytes = f.read()

            import base64
            audio_b64 = base64.b64encode(audio_bytes).decode()
            audio_url = f"data:audio/wav;base64,{audio_b64}"

            self._json_response(200, {
                "audioUrl": audio_url,
                "format": "wav",
                "status": "done",
            })
        except Exception as e:
            self._json_response(500, {"error": str(e)})
        finally:
            os.unlink(tmp_path)

    def log_message(self, format, *args):
        print(f"[XTTS] {args[0]}")


if __name__ == "__main__":
    # Pre-load model
    get_tts()
    server = HTTPServer(("0.0.0.0", PORT), XTTSHandler)
    print(f"XTTS v2 server running on http://localhost:{PORT}")
    server.serve_forever()
