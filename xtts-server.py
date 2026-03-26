#!/usr/bin/env python3
"""
XTTS v2 Voice Clone Server (optimized)
Quality params: temperature, gpt_cond_len, repetition_penalty
"""
import json, uuid, time, io, base64
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import torchaudio
import torch
import numpy as np

PORT = 8321

# ---------- model ----------
_orig_load = torch.load
def _patched_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _orig_load(*args, **kwargs)
torch.load = _patched_load

print("Loading XTTS v2 model...")
from TTS.api import TTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
# Get direct model reference for quality params
xtts_model = tts.synthesizer.tts_model
print("Model loaded.")

CLONES_DIR = Path.home() / "voice-cloning" / "cloned-voices"
CLONES_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_REF = Path.home() / "voice-cloning" / "david-refs" / "ref1-thoughts-on-ai-22k.wav"
_voices: dict = {}
_conditioning_cache: dict = {}  # cache speaker embeddings

def get_conditioning(ref_path: str, gpt_cond_len: int = 12):
    """Get speaker conditioning with configurable length."""
    cache_key = f"{ref_path}:{gpt_cond_len}"
    if cache_key in _conditioning_cache:
        return _conditioning_cache[cache_key]
    gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
        audio_path=[ref_path],
        gpt_cond_len=gpt_cond_len,
        gpt_cond_chunk_len=4,
        max_ref_length=60,
        sound_norm_refs=True,
    )
    _conditioning_cache[cache_key] = (gpt_cond_latent, speaker_embedding)
    return gpt_cond_latent, speaker_embedding

def preprocess_audio(file_path: str) -> str:
    """Resample to 22050Hz mono + normalize."""
    wav, sr = torchaudio.load(file_path)
    # To mono
    if wav.shape[0] > 1:
        wav = wav.mean(dim=0, keepdim=True)
    # Resample to 22050
    if sr != 22050:
        wav = torchaudio.functional.resample(wav, sr, 22050)
    # Normalize
    wav = wav / (wav.abs().max() + 1e-7) * 0.95
    # Save back
    processed = file_path.rsplit(".", 1)[0] + "_processed.wav"
    torchaudio.save(processed, wav, 22050)
    return processed


def parse_multipart(headers, body: bytes):
    content_type = headers.get("Content-Type", "")
    if "boundary=" not in content_type:
        return {}, {}
    boundary = content_type.split("boundary=")[1].strip()
    if boundary.startswith('"') and boundary.endswith('"'):
        boundary = boundary[1:-1]
    parts_data = body.split(f"--{boundary}".encode())
    fields, files = {}, {}
    for part in parts_data:
        if not part or part.strip() == b"--" or part.strip() == b"":
            continue
        if b"\r\n\r\n" in part:
            header_section, part_body = part.split(b"\r\n\r\n", 1)
        elif b"\n\n" in part:
            header_section, part_body = part.split(b"\n\n", 1)
        else:
            continue
        if part_body.endswith(b"\r\n"):
            part_body = part_body[:-2]
        header_str = header_section.decode("utf-8", errors="replace")
        name, filename = None, None
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
        pass

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
            self._json_response(200, {"status": "ok", "model": "xtts_v2", "mode": "optimized"})
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
            
            # Preprocess: resample + normalize
            try:
                processed = preprocess_audio(str(save_path))
                _voices[voice_id] = {"name": voice_name, "ref_path": processed}
                print(f"Cloned + preprocessed: {voice_id} ({voice_name})")
            except Exception as e:
                print(f"Preprocess failed, using raw: {e}")
                _voices[voice_id] = {"name": voice_name, "ref_path": str(save_path)}
            
            # Pre-compute conditioning
            try:
                get_conditioning(_voices[voice_id]["ref_path"], gpt_cond_len=24)
            except Exception as e:
                print(f"Pre-conditioning failed: {e}")

            self._json_response(200, {"voiceId": voice_id, "name": voice_name, "status": "done"})
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
            temperature = float(body.get("temperature", 0.75))
            top_p = float(body.get("top_p", 0.85))
            top_k = int(body.get("top_k", 50))
            repetition_penalty = float(body.get("repetition_penalty", 5.0))

            if not text:
                self._json_response(400, {"error": "text is required"})
                return

            if voice_id in _voices:
                ref = _voices[voice_id]["ref_path"]
            elif DEFAULT_REF.exists():
                ref = str(DEFAULT_REF)
            else:
                self._json_response(400, {"error": "No reference audio. Clone a voice first."})
                return

            # Use direct model API with quality params
            gpt_cond_latent, speaker_embedding = get_conditioning(ref, gpt_cond_len=24)
            
            out = xtts_model.inference(
                text=text,
                language=lang,
                gpt_cond_latent=gpt_cond_latent,
                speaker_embedding=speaker_embedding,
                temperature=temperature,
                repetition_penalty=repetition_penalty,
                top_k=top_k,
                top_p=top_p,
                speed=speed,
                enable_text_splitting=True,
            )
            
            wav = torch.tensor(out["wav"]).unsqueeze(0)
            # Normalize output
            wav = wav / (wav.abs().max() + 1e-7) * 0.95
            
            import tempfile, os
            tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            tmp.close()
            torchaudio.save(tmp.name, wav, 24000)
            with open(tmp.name, "rb") as f:
                wav_bytes = f.read()
            os.unlink(tmp.name)
            b64 = base64.b64encode(wav_bytes).decode()
            
            self._json_response(200, {"audioUrl": f"data:audio/wav;base64,{b64}"})
        except Exception as e:
            print(f"Preview error: {e}")
            self._json_response(500, {"error": str(e)})


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), XTTSHandler)
    print(f"XTTS v2 server (optimized) running on :{PORT}")
    server.serve_forever()
