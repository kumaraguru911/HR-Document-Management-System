from minio import Minio

from app.core.config import settings

from io import BytesIO

from datetime import timedelta

minio_client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure
)

def ensure_bucket_exists():
    if not minio_client.bucket_exists(settings.minio_bucket):
        minio_client.make_bucket(settings.minio_bucket)

def upload_file(
    object_key: str,
    data: bytes,
    content_type: str
):
    minio_client.put_object(
        bucket_name=settings.minio_bucket,
        object_name=object_key,
        data=BytesIO(data),
        length=len(data),
        content_type=content_type
    )

def get_presigned_download_url(
    object_key: str,
    expires_minutes: int = 5
) -> str:

    return minio_client.presigned_get_object(
        bucket_name=settings.minio_bucket,
        object_name=object_key,
        expires=timedelta(minutes=expires_minutes)
    )


def stream_object(object_key: str):
    return minio_client.get_object(
        bucket_name=settings.minio_bucket,
        object_name=object_key
    )