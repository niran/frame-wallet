import zlib
import sys
import base64

text = sys.stdin.read()
data = base64.b64decode(text)
decompressed_data = zlib.decompress(data)
encoded_text = decompressed_data.hex()

print(encoded_text)
