from huggingface_hub import snapshot_download
from generar_gpu import MODEL,REVISION

if __name__=='__main__':
    print(snapshot_download(MODEL,revision=REVISION,allow_patterns=['*.json','*.safetensors','*.model','*.txt'],max_workers=4),flush=True)
