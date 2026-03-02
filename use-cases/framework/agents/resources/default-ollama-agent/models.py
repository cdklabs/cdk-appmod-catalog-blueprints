from pydantic import BaseModel

class ToolLocationDefinition(BaseModel):
    bucketName: str
    key: str
    isFile: bool
    isZipArchive: bool