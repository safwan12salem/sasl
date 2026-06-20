import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

YOUTUBE_CLIENT_ID = os.environ.get('YOUTUBE_CLIENT_ID', '')
YOUTUBE_CLIENT_SECRET = os.environ.get('YOUTUBE_CLIENT_SECRET', '')

def upload_to_youtube(video_path: str, title: str, description: str = '', access_token: str = None, refresh_token: str = None) -> str:
    if not access_token:
        raise ValueError("YouTube access token required")
    
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=YOUTUBE_CLIENT_ID,
        client_secret=YOUTUBE_CLIENT_SECRET,
    )
    
    youtube = build('youtube', 'v3', credentials=credentials)
    
    body = {
        'snippet': {'title': title[:100], 'description': description[:5000]},
        'status': {'privacyStatus': 'unlisted', 'selfDeclaredMadeForKids': False}
    }
    
    media = MediaFileUpload(video_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part='snippet,status', body=body, media_body=media)
    response = request.execute()
    return f'https://www.youtube.com/watch?v={response["id"]}'
