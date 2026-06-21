from cloudinary_storage.storage import MediaCloudinaryStorage
import cloudinary.uploader

class AutoCloudinaryStorage(MediaCloudinaryStorage):
    """Cloudinary storage that auto-detects file type (image or video)"""
    
    def _upload(self, name, content):
        options = {'resource_type': 'auto', 'folder': 'posts/'}
        return cloudinary.uploader.upload(content, **options)
