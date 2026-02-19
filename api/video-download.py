from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Try to import requests
try:
    import requests
except ImportError:
    requests = None

# Try to import yt_dlp
try:
    import yt_dlp
except ImportError:
    yt_dlp = None

# Try to import pytubefix
try:
    from pytubefix import YouTube
except ImportError:
    YouTube = None

def send_error(handler, status, message, code):
    handler.send_response(status)
    handler.send_header('Content-type', 'application/json')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.end_headers()
    response = {"error": message, "code": code}
    handler.wfile.write(json.dumps(response).encode())

def send_success(handler, data):
    handler.send_response(200)
    handler.send_header('Content-type', 'application/json')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.end_headers()
    handler.wfile.write(json.dumps(data).encode())

def get_quality_height(quality):
    if quality == '4k' or quality == '2160p':
        return 2160
    try:
        return int(quality.replace('p', ''))
    except:
        return 720

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body_str = self.rfile.read(content_length).decode('utf-8')
            try:
                body = json.loads(body_str)
            except:
                return send_error(self, 400, "Invalid JSON body", "INVALID_JSON")
            
            url = body.get('url')
            quality = body.get('quality', '720p')
            
            if not url:
                return send_error(self, 400, "Invalid YouTube URL", "INVALID_URL")

            target_height = get_quality_height(quality)
            download_url = None
            title = "Untitled"
            thumbnail = None
            author = "Unknown"
            
            errors = []

            # 1. Try yt-dlp (Python Library)
            if yt_dlp:
                try:
                    # Generic options to maximize success
                    ydl_opts = {
                        'format': f'best[ext=mp4][height<={target_height}][vcodec!=none][acodec!=none]/best[height<={target_height}]/best',
                        'quiet': True,
                        'no_warnings': True,
                        'skip_download': True,
                        'nocheckcertificate': True,
                        'source_address': '0.0.0.0', # Force IPv4
                    }
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        if 'url' in info:
                            download_url = info['url']
                            title = info.get('title', title)
                            thumbnail = info.get('thumbnail', thumbnail)
                            author = info.get('uploader', author)
                        elif 'formats' in info:
                            # Manually pick best progressive if automatic selection failed to give a direct url
                            formats = info.get('formats', [])
                            # Filter for mp4, with video and audio, and height <= target
                            candidates = [f for f in formats if f.get('ext') == 'mp4' and f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('height', 0) <= target_height]
                            
                            if not candidates:
                                # Fallback: any video+audio
                                candidates = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
                            
                            if candidates:
                                # Sort by height descending
                                candidates.sort(key=lambda x: x.get('height', 0), reverse=True)
                                download_url = candidates[0].get('url')
                                title = info.get('title', title)
                                thumbnail = info.get('thumbnail', thumbnail)
                                author = info.get('uploader', author)
                except Exception as e:
                    errors.append(f"yt-dlp error: {str(e)}")

            # 2. Try Cobalt (Fallback)
            if not download_url and requests:
                try:
                    cobalt_endpoints = [
                        "https://api.cobalt.tools/api/json",
                        "https://co.wuk.sh/api/json",
                        "https://cobalt.api.red/",
                        "https://api.wuk.sh/",
                        "https://cobalt.tools/api/json",
                        "https://api.douyin.wtf/api/json"
                    ]
                    
                    quality_map = {
                        "360p": "360",
                        "720p": "720",
                        "1080p": "1080",
                        "2160p": "2160",
                        "4k": "2160"
                    }
                    cobalt_quality = quality_map.get(quality, "720")

                    for endpoint in cobalt_endpoints:
                        try:
                            payload = {
                                "url": url,
                                "videoQuality": cobalt_quality,
                                "filenameStyle": "pretty",
                                "vCodec": "h264"
                            }
                            headers = {
                                "Accept": "application/json",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            }
                            resp = requests.post(endpoint, json=payload, headers=headers, timeout=6)
                            if resp.status_code == 200:
                                data = resp.json()
                                if data.get('url'):
                                    download_url = data.get('url')
                                    break
                                if data.get('picker'):
                                    for item in data['picker']:
                                        if item.get('url'):
                                            download_url = item.get('url')
                                            break
                                    if download_url: break
                        except Exception as e:
                            errors.append(f"Cobalt {endpoint} error: {str(e)}")
                            continue
                except Exception as e:
                    errors.append(f"Cobalt error: {str(e)}")

            # 3. Try Pytube (Fallback)
            if not download_url and YouTube:
                try:
                    yt = YouTube(url, use_oauth=False, allow_oauth_cache=False)
                    # Try getting streams
                    streams = yt.streams.filter(progressive=True, file_extension='mp4')
                    stream = streams.order_by('resolution').desc().first()
                    
                    if stream:
                        download_url = stream.url
                        title = yt.title or title
                        thumbnail = yt.thumbnail_url or thumbnail
                        author = yt.author or author
                    else:
                         # Fallback to any mp4 stream even if not progressive (might lack audio)
                         # but better than nothing for some users
                         stream = yt.streams.filter(file_extension='mp4').order_by('resolution').desc().first()
                         if stream:
                             download_url = stream.url
                except Exception as e:
                    errors.append(f"Pytube error: {str(e)}")

            if not download_url:
                error_msg = "Could not process video. Errors: " + "; ".join(errors)
                return send_error(self, 422, error_msg, "DOWNLOAD_PROCESSING_FAILED")

            response_data = {
                "title": title,
                "thumbnail": thumbnail,
                "author": author,
                "qualityRequested": quality,
                "qualityResolved": f"{target_height}p", 
                "formatId": "python-processed",
                "downloadUrl": download_url,
                "expiresNote": "Download URL may expire quickly.",
                "tokenCost": 0,
                "tokensRemaining": 9999
            }
            
            send_success(self, response_data)

        except Exception as e:
            send_error(self, 500, f"Internal Server Error: {str(e)}", "INTERNAL_ERROR")
