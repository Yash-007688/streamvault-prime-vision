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
            format_type = body.get('format', 'mp4') # mp4, mp3, mkv
            
            if not url:
                return send_error(self, 400, "Invalid YouTube URL", "INVALID_URL")

            target_height = get_quality_height(quality)
            download_url = None
            title = "Untitled"
            thumbnail = None
            author = "Unknown"
            
            errors = []

            # 1. Try Cobalt (First priority for MP3 conversion support)
            # We prioritize Cobalt for MP3 because it handles server-side conversion which we can't do easily in serverless
            if format_type == 'mp3' and requests:
                try:
                    cobalt_endpoints = [
                        "https://api.cobalt.tools/api/json",
                        "https://cobalt.kanzen.me/api/json",
                        "https://cobalt.gutenberg.rocks/api/json",
                        "https://hyperspace.onrender.com/api/json",
                        "https://api.server.social/api/json",
                        "https://cobalt.154.53.56.156.sslip.io/api/json",
                    ]
                    
                    for endpoint in cobalt_endpoints:
                        try:
                            payload = {
                                "url": url,
                                "isAudioOnly": True,
                                "aFormat": "mp3",
                                "filenameStyle": "pretty"
                            }
                            headers = {
                                "Accept": "application/json",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            }
                            resp = requests.post(endpoint, json=payload, headers=headers, timeout=15)
                            
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
                            else:
                                errors.append(f"Cobalt {endpoint} status {resp.status_code}")
                        except Exception as e:
                            errors.append(f"Cobalt {endpoint} error: {str(e)}")
                            continue
                except Exception as e:
                    errors.append(f"Cobalt MP3 error: {str(e)}")

            # 2. Try yt-dlp (Python Library)
            if not download_url and yt_dlp:
                try:
                    # Generic options to maximize success
                    ydl_opts = {
                        'quiet': True,
                        'no_warnings': True,
                        'skip_download': True,
                        'nocheckcertificate': True,
                        'source_address': '0.0.0.0', # Force IPv4
                        'http_headers': {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        }
                    }

                    if format_type == 'mp3':
                        ydl_opts['format'] = 'bestaudio/best'
                    elif format_type == 'mkv':
                         ydl_opts['format'] = f'bestvideo[ext=mkv]+bestaudio/best[ext=mkv]/best'
                    else:
                         ydl_opts['format'] = f'best[ext=mp4][height<={target_height}][vcodec!=none][acodec!=none]/best[height<={target_height}]/best'
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        if 'url' in info:
                            download_url = info['url']
                            title = info.get('title', title)
                            thumbnail = info.get('thumbnail', thumbnail)
                            author = info.get('uploader', author)
                        elif 'formats' in info:
                            formats = info.get('formats', [])
                            candidates = []
                            
                            if format_type == 'mp3':
                                # Look for audio only
                                candidates = [f for f in formats if f.get('vcodec') == 'none' and f.get('acodec') != 'none']
                            else:
                                # Video + Audio
                                ext = 'mp4' if format_type == 'mp4' else 'webm' # mkv often is webm on YT
                                candidates = [f for f in formats if f.get('ext') == ext and f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('height', 0) <= target_height]
                            
                            if not candidates and format_type != 'mp3':
                                # Fallback: any video+audio
                                candidates = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
                            
                            if candidates:
                                # Sort by height descending (or bitrate for audio)
                                if format_type == 'mp3':
                                    candidates.sort(key=lambda x: x.get('abr', 0) or 0, reverse=True)
                                else:
                                    candidates.sort(key=lambda x: x.get('height', 0), reverse=True)
                                    
                                download_url = candidates[0].get('url')
                                title = info.get('title', title)
                                thumbnail = info.get('thumbnail', thumbnail)
                                author = info.get('uploader', author)
                except Exception as e:
                    errors.append(f"yt-dlp error: {str(e)}")

            # 3. Try Cobalt (Fallback for Video or if MP3 failed in step 1)
            if not download_url and requests and format_type != 'mp3': # If mp3 failed in step 1, we might retry or just skip to pytube
                try:
                    cobalt_endpoints = [
                        "https://api.cobalt.tools/api/json",
                        "https://cobalt.kanzen.me/api/json",
                        "https://cobalt.gutenberg.rocks/api/json",
                        "https://hyperspace.onrender.com/api/json",
                        "https://api.server.social/api/json",
                        "https://cobalt.154.53.56.156.sslip.io/api/json",
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
                            # Cobalt doesn't strictly support 'mkv' output via simple json, so we stick to mp4/h264
                            
                            headers = {
                                "Accept": "application/json",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            }
                            resp = requests.post(endpoint, json=payload, headers=headers, timeout=10)
                            
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
                            else:
                                errors.append(f"Cobalt {endpoint} status {resp.status_code}")
                        except Exception as e:
                            errors.append(f"Cobalt {endpoint} error: {str(e)}")
                            continue
                except Exception as e:
                    errors.append(f"Cobalt error: {str(e)}")

            # 4. Try Pytube (Fallback)
            if not download_url and YouTube:
                try:
                    # Try with different clients if default fails
                    clients_to_try = ['ANDROID', 'WEB', 'ANDROID_CREATOR']
                    
                    for client in clients_to_try:
                        try:
                            yt = YouTube(url, use_oauth=False, allow_oauth_cache=False, client=client)
                            
                            if format_type == 'mp3':
                                streams = yt.streams.filter(only_audio=True)
                                stream = streams.order_by('abr').desc().first()
                            else:
                                streams = yt.streams.filter(progressive=True, file_extension='mp4')
                                stream = streams.order_by('resolution').desc().first()
                            
                            if stream:
                                download_url = stream.url
                                title = yt.title or title
                                thumbnail = yt.thumbnail_url or thumbnail
                                author = yt.author or author
                                break # Success
                        except:
                            continue


                    if not download_url:
                         # Last ditch: try standard init with no client override
                         yt = YouTube(url, use_oauth=False, allow_oauth_cache=False)
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
                "expiresNote": "Download URL may expire quickly."
            }
            
            send_success(self, response_data)

        except Exception as e:
            send_error(self, 500, f"Internal Server Error: {str(e)}", "INTERNAL_ERROR")
