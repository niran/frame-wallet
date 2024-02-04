import zlib
import sys
import base64

text = sys.stdin.read()
if text[:2] == '0x':
    text = text[2:]

data = bytes.fromhex(text)
compressed_data = zlib.compress(data)
encoded_text = base64.b64encode(compressed_data)

print(encoded_text)
